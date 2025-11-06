const db = require('../config/database');
const axios = require('axios');

// Get all parking slots
exports.getAllSlots = async (req, res) => {
  try {
    const { area, status } = req.query;

    let query = db('parking_slots').select('*');

    if (area) {
      query = query.where('area', area);
    }

    if (status) {
      query = query.where('status', status);
    }

    const slots = await query.orderBy('name');

    // Calculate availability percentage
    const slotsWithAvailability = slots.map(slot => ({
      ...slot,
      available_slots: slot.total_capacity - slot.occupied_slots,
      occupancy_percentage: ((slot.occupied_slots / slot.total_capacity) * 100).toFixed(2)
    }));

    res.json({
      success: true,
      count: slotsWithAvailability.length,
      data: slotsWithAvailability
    });

  } catch (error) {
    console.error('Get all slots error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching parking slots',
      error: error.message
    });
  }
};

// Get nearby parking slots
exports.getNearbySlots = async (req, res) => {
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

    // Haversine formula to calculate distance
    const slots = await db.raw(`
      SELECT *,
        (6371 * acos(cos(radians(?)) * cos(radians(latitude)) * cos(radians(longitude) - radians(?)) + sin(radians(?)) * sin(radians(latitude)))) AS distance
      FROM parking_slots
      HAVING distance < ?
      ORDER BY distance
      LIMIT 20
    `, [latitude, longitude, latitude, radiusKm]);

    const nearbySlots = slots[0].map(slot => ({
      ...slot,
      available_slots: slot.total_capacity - slot.occupied_slots,
      occupancy_percentage: ((slot.occupied_slots / slot.total_capacity) * 100).toFixed(2),
      distance: parseFloat(slot.distance).toFixed(2)
    }));

    res.json({
      success: true,
      count: nearbySlots.length,
      data: nearbySlots
    });

  } catch (error) {
    console.error('Get nearby slots error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching nearby parking slots',
      error: error.message
    });
  }
};

// Get single parking slot details
exports.getSlotById = async (req, res) => {
  try {
    const { id } = req.params;

    const slot = await db('parking_slots').where({ id }).first();

    if (!slot) {
      return res.status(404).json({
        success: false,
        message: 'Parking slot not found'
      });
    }

    // Get recent reports for this slot
    const recentReports = await db('reports')
      .join('users', 'reports.user_id', 'users.id')
      .where('reports.slot_id', id)
      .select(
        'reports.*',
        'users.name as reporter_name'
      )
      .orderBy('reports.timestamp', 'desc')
      .limit(5);

    const slotWithDetails = {
      ...slot,
      available_slots: slot.total_capacity - slot.occupied_slots,
      occupancy_percentage: ((slot.occupied_slots / slot.total_capacity) * 100).toFixed(2),
      recent_reports: recentReports
    };

    res.json({
      success: true,
      data: slotWithDetails
    });

  } catch (error) {
    console.error('Get slot by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching parking slot details',
      error: error.message
    });
  }
};

// Update parking slot status (user reports)
exports.updateSlotStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { occupied_slots } = req.body;
    const userId = req.user.id;

    const slot = await db('parking_slots').where({ id }).first();

    if (!slot) {
      return res.status(404).json({
        success: false,
        message: 'Parking slot not found'
      });
    }

    // Update occupied slots
    await db('parking_slots')
      .where({ id })
      .update({
        occupied_slots: occupied_slots,
        status: occupied_slots >= slot.total_capacity ? 'full' : 'available',
        last_updated: db.fn.now()
      });

    // Log activity
    await db('activity_log').insert({
      user_id: userId,
      action_type: 'update_parking_status',
      description: `Updated parking slot ${slot.name}`,
      ip_address: req.ip
    });

    res.json({
      success: true,
      message: 'Parking slot status updated successfully'
    });

  } catch (error) {
    console.error('Update slot status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating parking slot status',
      error: error.message
    });
  }
};

// Get parking predictions from ML service
exports.getParkingPredictions = async (req, res) => {
  try {
    const { slot_id, hour, day } = req.query;

    // Try to fetch from ML service
    try {
      const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:5000';
      const mlResponse = await axios.get(`${mlServiceUrl}/predict`, {
        params: { hour: hour || new Date().getHours(), day: day || new Date().getDay() }
      });

      res.json({
        success: true,
        data: mlResponse.data,
        source: 'ml_service'
      });

    } catch (mlError) {
      console.log('ML service unavailable, using database predictions');

      // Fallback to database predictions
      let query = db('predictions')
        .join('parking_slots', 'predictions.slot_id', 'parking_slots.id')
        .select(
          'predictions.*',
          'parking_slots.name as slot_name',
          'parking_slots.location'
        );

      if (slot_id) {
        query = query.where('predictions.slot_id', slot_id);
      }

      const predictions = await query
        .orderBy('predictions.created_at', 'desc')
        .limit(10);

      res.json({
        success: true,
        data: predictions,
        source: 'database'
      });
    }

  } catch (error) {
    console.error('Get predictions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching parking predictions',
      error: error.message
    });
  }
};

// Get parking statistics
exports.getParkingStats = async (req, res) => {
  try {
    const totalSlots = await db('parking_slots').count('* as count').first();
    
    const totalCapacity = await db('parking_slots')
      .sum('total_capacity as sum')
      .first();
    
    const totalOccupied = await db('parking_slots')
      .sum('occupied_slots as sum')
      .first();

    const statusBreakdown = await db('parking_slots')
      .select('status')
      .count('* as count')
      .groupBy('status');

    const areaBreakdown = await db('parking_slots')
      .select('area')
      .count('* as count')
      .sum('occupied_slots as occupied')
      .sum('total_capacity as capacity')
      .groupBy('area');

    res.json({
      success: true,
      data: {
        total_parking_lots: totalSlots.count,
        total_capacity: totalCapacity.sum || 0,
        total_occupied: totalOccupied.sum || 0,
        total_available: (totalCapacity.sum || 0) - (totalOccupied.sum || 0),
        occupancy_rate: totalCapacity.sum 
          ? (((totalOccupied.sum || 0) / totalCapacity.sum) * 100).toFixed(2) 
          : 0,
        status_breakdown: statusBreakdown,
        area_breakdown: areaBreakdown
      }
    });

  } catch (error) {
    console.error('Get parking stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching parking statistics',
      error: error.message
    });
  }
};
