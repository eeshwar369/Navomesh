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

// Get all traffic zones
exports.getTrafficZones = async (req, res) => {
  try {
    const { area } = req.query;

    let query = db('traffic_zones').select('*');

    if (area) {
      query = query.where('area', area);
    }

    const zones = await query.orderBy('zone_name');

    res.json({
      success: true,
      count: zones.length,
      data: zones
    });

  } catch (error) {
    console.error('Get traffic zones error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching traffic zones',
      error: error.message
    });
  }
};

// Get geo-tagged traffic predictions
exports.getGeoTaggedPredictions = async (req, res) => {
  try {
    const { lat, lng, radius = 5, hour, day } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const radiusKm = parseFloat(radius);
    const currentHour = hour ? parseInt(hour) : new Date().getHours();
    const currentDay = day ? parseInt(day) : new Date().getDay();

    // Get nearby traffic zones
    const nearbyZones = await db.raw(`
      SELECT tz.*,
        (6371 * acos(cos(radians(?)) * cos(radians(center_latitude)) * cos(radians(center_longitude) - radians(?)) + sin(radians(?)) * sin(radians(center_latitude)))) AS distance
      FROM traffic_zones tz
      HAVING distance < ?
      ORDER BY distance
      LIMIT 20
    `, [latitude, longitude, latitude, radiusKm]);

    const zones = nearbyZones[0];

    // Get predictions for these zones
    const predictions = await Promise.all(zones.map(async (zone) => {
      // Get latest prediction for this zone
      const prediction = await db('traffic_predictions')
        .where({
          zone_id: zone.id,
          prediction_hour: currentHour,
          day_of_week: currentDay
        })
        .orderBy('prediction_timestamp', 'desc')
        .first();

      // If no prediction exists, estimate based on historical data
      let predictedData;
      if (prediction) {
        predictedData = prediction;
      } else {
        const historical = await db('traffic_history')
          .where({
            zone_id: zone.id,
            hour_of_day: currentHour,
            day_of_week: currentDay
          })
          .avg('avg_speed as avg_speed')
          .select('congestion_level')
          .first();

        predictedData = {
          zone_id: zone.id,
          latitude: zone.center_latitude,
          longitude: zone.center_longitude,
          predicted_congestion: historical?.congestion_level || 'medium',
          predicted_speed: historical?.avg_speed || 30,
          predicted_vehicle_count: null,
          prediction_hour: currentHour,
          day_of_week: currentDay,
          confidence_score: 0.75
        };
      }

      return {
        zone: {
          id: zone.id,
          name: zone.zone_name,
          code: zone.zone_code,
          latitude: zone.center_latitude,
          longitude: zone.center_longitude,
          radius: zone.radius_meters,
          area: zone.area,
          distance: parseFloat(zone.distance).toFixed(2)
        },
        prediction: {
          ...predictedData,
          intensity: getIntensityValue(predictedData.predicted_congestion),
          color: getCongestionColor(predictedData.predicted_congestion)
        }
      };
    }));

    res.json({
      success: true,
      count: predictions.length,
      data: predictions,
      query: { latitude, longitude, radius: radiusKm, hour: currentHour, day: currentDay }
    });

  } catch (error) {
    console.error('Get geo-tagged predictions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching geo-tagged predictions',
      error: error.message
    });
  }
};

// Get traffic prediction by zone
exports.getZonePrediction = async (req, res) => {
  try {
    const { zoneId } = req.params;
    const { hours = 6 } = req.query;

    const zone = await db('traffic_zones').where({ id: zoneId }).first();

    if (!zone) {
      return res.status(404).json({
        success: false,
        message: 'Traffic zone not found'
      });
    }

    const currentHour = new Date().getHours();
    const currentDay = new Date().getDay();
    const predictions = [];

    // Get predictions for next N hours
    for (let i = 0; i < parseInt(hours); i++) {
      const hour = (currentHour + i) % 24;
      const day = currentDay + Math.floor((currentHour + i) / 24);

      const prediction = await db('traffic_predictions')
        .where({
          zone_id: zoneId,
          prediction_hour: hour,
          day_of_week: day % 7
        })
        .orderBy('prediction_timestamp', 'desc')
        .first();

      if (prediction) {
        predictions.push({
          ...prediction,
          hours_from_now: i,
          intensity: getIntensityValue(prediction.predicted_congestion),
          color: getCongestionColor(prediction.predicted_congestion)
        });
      }
    }

    res.json({
      success: true,
      zone: zone,
      predictions: predictions
    });

  } catch (error) {
    console.error('Get zone prediction error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching zone predictions',
      error: error.message
    });
  }
};

// Get traffic routes
exports.getTrafficRoutes = async (req, res) => {
  try {
    const routes = await db('traffic_routes')
      .select('*')
      .orderBy('route_name');

    const enrichedRoutes = routes.map(route => ({
      ...route,
      intensity: getIntensityValue(route.avg_congestion_level),
      color: getCongestionColor(route.avg_congestion_level),
      route_points: route.route_points ? JSON.parse(route.route_points) : []
    }));

    res.json({
      success: true,
      count: enrichedRoutes.length,
      data: enrichedRoutes
    });

  } catch (error) {
    console.error('Get traffic routes error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching traffic routes',
      error: error.message
    });
  }
};

// Create traffic prediction (called by ML service)
exports.createTrafficPrediction = async (req, res) => {
  try {
    const {
      zone_id,
      latitude,
      longitude,
      predicted_congestion,
      predicted_speed,
      predicted_vehicle_count,
      prediction_hour,
      day_of_week,
      confidence_score
    } = req.body;

    // Validate required fields
    if (!zone_id || !latitude || !longitude || !predicted_congestion || prediction_hour === undefined || day_of_week === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Calculate validity (predictions valid for 1 hour)
    const validUntil = new Date(Date.now() + 60 * 60 * 1000);

    const predictionId = await db('traffic_predictions').insert({
      zone_id,
      latitude,
      longitude,
      predicted_congestion,
      predicted_speed,
      predicted_vehicle_count,
      prediction_hour,
      day_of_week,
      confidence_score: confidence_score || 0.85,
      valid_until: validUntil
    });

    res.json({
      success: true,
      message: 'Traffic prediction created successfully',
      prediction_id: predictionId[0]
    });

  } catch (error) {
    console.error('Create traffic prediction error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating traffic prediction',
      error: error.message
    });
  }
};

module.exports = exports;
