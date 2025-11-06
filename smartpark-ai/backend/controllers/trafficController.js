const db = require('../config/database');

// Get all traffic data
exports.getAllTrafficData = async (req, res) => {
  try {
    const { congestion_level, area_name, limit = 50 } = req.query;

    let query = db('traffic_data').select('*');

    if (congestion_level) {
      query = query.where('congestion_level', congestion_level);
    }

    if (area_name) {
      query = query.where('area_name', 'like', `%${area_name}%`);
    }

    const trafficData = await query
      .orderBy('timestamp', 'desc')
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: trafficData.length,
      data: trafficData
    });

  } catch (error) {
    console.error('Get traffic data error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching traffic data',
      error: error.message
    });
  }
};

// Get traffic heatmap data
exports.getTrafficHeatmap = async (req, res) => {
  try {
    // Get latest traffic data for each area
    const heatmapData = await db('traffic_data')
      .select(
        'id',
        'area_name',
        'latitude',
        'longitude',
        'congestion_level',
        'avg_speed',
        'vehicle_count',
        'timestamp'
      )
      .orderBy('timestamp', 'desc');

    // Group by area and get the most recent entry
    const latestByArea = {};
    heatmapData.forEach(item => {
      if (!latestByArea[item.area_name]) {
        latestByArea[item.area_name] = item;
      }
    });

    const heatmapArray = Object.values(latestByArea).map(item => ({
      ...item,
      intensity: getIntensityValue(item.congestion_level),
      color: getCongestionColor(item.congestion_level)
    }));

    res.json({
      success: true,
      count: heatmapArray.length,
      data: heatmapArray
    });

  } catch (error) {
    console.error('Get traffic heatmap error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching traffic heatmap data',
      error: error.message
    });
  }
};

// Get traffic by location
exports.getTrafficByLocation = async (req, res) => {
  try {
    const { lat, lng, radius = 5 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const radiusKm = parseFloat(radius);

    // Get traffic data within radius
    const trafficData = await db.raw(`
      SELECT *,
        (6371 * acos(cos(radians(?)) * cos(radians(latitude)) * cos(radians(longitude) - radians(?)) + sin(radians(?)) * sin(radians(latitude)))) AS distance
      FROM traffic_data
      HAVING distance < ?
      ORDER BY timestamp DESC, distance
      LIMIT 20
    `, [latitude, longitude, latitude, radiusKm]);

    const nearbyTraffic = trafficData[0].map(item => ({
      ...item,
      distance: parseFloat(item.distance).toFixed(2),
      intensity: getIntensityValue(item.congestion_level),
      color: getCongestionColor(item.congestion_level)
    }));

    res.json({
      success: true,
      count: nearbyTraffic.length,
      data: nearbyTraffic
    });

  } catch (error) {
    console.error('Get traffic by location error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching nearby traffic data',
      error: error.message
    });
  }
};

// Get traffic statistics
exports.getTrafficStats = async (req, res) => {
  try {
    const totalRecords = await db('traffic_data').count('* as count').first();

    const congestionBreakdown = await db('traffic_data')
      .select('congestion_level')
      .count('* as count')
      .groupBy('congestion_level');

    const avgSpeedByArea = await db('traffic_data')
      .select('area_name')
      .avg('avg_speed as avg_speed')
      .count('* as count')
      .groupBy('area_name')
      .orderBy('avg_speed', 'asc');

    const criticalAreas = await db('traffic_data')
      .where('congestion_level', 'critical')
      .orWhere('congestion_level', 'high')
      .select('area_name', 'congestion_level', 'avg_speed', 'vehicle_count', 'timestamp')
      .orderBy('timestamp', 'desc')
      .limit(10);

    const avgSpeed = await db('traffic_data')
      .avg('avg_speed as avg')
      .first();

    const totalVehicles = await db('traffic_data')
      .sum('vehicle_count as sum')
      .first();

    res.json({
      success: true,
      data: {
        total_records: totalRecords.count,
        overall_avg_speed: avgSpeed.avg ? parseFloat(avgSpeed.avg).toFixed(2) : 0,
        total_vehicles_tracked: totalVehicles.sum || 0,
        congestion_breakdown: congestionBreakdown,
        avg_speed_by_area: avgSpeedByArea,
        critical_areas: criticalAreas
      }
    });

  } catch (error) {
    console.error('Get traffic stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching traffic statistics',
      error: error.message
    });
  }
};

// Get real-time traffic updates (simulated)
exports.getRealTimeTraffic = async (req, res) => {
  try {
    // Get latest traffic data from last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const realtimeData = await db('traffic_data')
      .where('timestamp', '>=', fiveMinutesAgo)
      .select('*')
      .orderBy('timestamp', 'desc');

    // If no recent data, get latest for each area
    let finalData = realtimeData;
    if (realtimeData.length === 0) {
      finalData = await db('traffic_data')
        .select('*')
        .orderBy('timestamp', 'desc')
        .limit(20);
    }

    const enrichedData = finalData.map(item => ({
      ...item,
      intensity: getIntensityValue(item.congestion_level),
      color: getCongestionColor(item.congestion_level),
      is_realtime: realtimeData.length > 0
    }));

    res.json({
      success: true,
      count: enrichedData.length,
      timestamp: new Date(),
      data: enrichedData
    });

  } catch (error) {
    console.error('Get realtime traffic error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching real-time traffic data',
      error: error.message
    });
  }
};

// Helper functions
function getIntensityValue(congestionLevel) {
  const intensityMap = {
    'low': 0.2,
    'medium': 0.5,
    'high': 0.8,
    'critical': 1.0
  };
  return intensityMap[congestionLevel] || 0.5;
}

function getCongestionColor(congestionLevel) {
  const colorMap = {
    'low': '#00ff00',      // Green
    'medium': '#ffff00',   // Yellow
    'high': '#ff8800',     // Orange
    'critical': '#ff0000'  // Red
  };
  return colorMap[congestionLevel] || '#888888';
}

module.exports = exports;
