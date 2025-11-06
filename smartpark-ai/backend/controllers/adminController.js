const db = require('../config/database');

// Get comprehensive admin dashboard analytics
exports.getDashboardAnalytics = async (req, res) => {
  try {
    // User statistics
    const totalUsers = await db('users').count('* as count').first();
    const usersByRole = await db('users')
      .select('role')
      .count('* as count')
      .groupBy('role');

    // Parking statistics
    const totalSlots = await db('parking_slots').count('* as count').first();
    const totalCapacity = await db('parking_slots').sum('total_capacity as sum').first();
    const totalOccupied = await db('parking_slots').sum('occupied_slots as sum').first();
    const slotsByStatus = await db('parking_slots')
      .select('status')
      .count('* as count')
      .groupBy('status');

    // Report statistics
    const totalReports = await db('reports').count('* as count').first();
    const reportsByStatus = await db('reports')
      .select('status')
      .count('* as count')
      .groupBy('status');
    const reportsByType = await db('reports')
      .select('report_type')
      .count('* as count')
      .groupBy('report_type');

    // Traffic statistics
    const trafficByLevel = await db('traffic_data')
      .select('congestion_level')
      .count('* as count')
      .groupBy('congestion_level');

    // Recent activity
    const recentReports = await db('reports')
      .join('users', 'reports.user_id', 'users.id')
      .join('parking_slots', 'reports.slot_id', 'parking_slots.id')
      .select(
        'reports.id',
        'reports.report_type',
        'reports.status',
        'reports.timestamp',
        'users.name as user_name',
        'parking_slots.name as slot_name'
      )
      .orderBy('reports.timestamp', 'desc')
      .limit(5);

    const recentUsers = await db('users')
      .select('id', 'name', 'email', 'role', 'created_at')
      .orderBy('created_at', 'desc')
      .limit(5);

    // Top contributors
    const topContributors = await db('user_rewards')
      .join('users', 'user_rewards.user_id', 'users.id')
      .select(
        'users.name',
        'user_rewards.total_reports',
        'user_rewards.verified_reports',
        'user_rewards.points',
        'user_rewards.level'
      )
      .orderBy('user_rewards.points', 'desc')
      .limit(5);

    // Parking occupancy by area
    const occupancyByArea = await db('parking_slots')
      .select('area')
      .count('* as total_lots')
      .sum('total_capacity as total_capacity')
      .sum('occupied_slots as total_occupied')
      .groupBy('area');

    const occupancyData = occupancyByArea.map(area => ({
      ...area,
      total_available: area.total_capacity - area.total_occupied,
      occupancy_rate: ((area.total_occupied / area.total_capacity) * 100).toFixed(2)
    }));

    // Traffic hotspots
    const trafficHotspots = await db('traffic_data')
      .where('congestion_level', 'critical')
      .orWhere('congestion_level', 'high')
      .select('area_name', 'congestion_level', 'avg_speed', 'vehicle_count')
      .orderBy('timestamp', 'desc')
      .limit(10);

    // Time-based statistics (reports per hour)
    const reportsToday = await db('reports')
      .whereRaw('DATE(timestamp) = CURDATE()')
      .count('* as count')
      .first();

    const reportsThisWeek = await db('reports')
      .whereRaw('YEARWEEK(timestamp) = YEARWEEK(NOW())')
      .count('* as count')
      .first();

    res.json({
      success: true,
      data: {
        overview: {
          total_users: totalUsers.count,
          total_parking_lots: totalSlots.count,
          total_capacity: totalCapacity.sum || 0,
          total_occupied: totalOccupied.sum || 0,
          total_available: (totalCapacity.sum || 0) - (totalOccupied.sum || 0),
          occupancy_rate: totalCapacity.sum 
            ? (((totalOccupied.sum || 0) / totalCapacity.sum) * 100).toFixed(2)
            : 0,
          total_reports: totalReports.count,
          reports_today: reportsToday.count,
          reports_this_week: reportsThisWeek.count
        },
        users: {
          total: totalUsers.count,
          by_role: usersByRole,
          recent: recentUsers
        },
        parking: {
          total_slots: totalSlots.count,
          by_status: slotsByStatus,
          by_area: occupancyData
        },
        reports: {
          total: totalReports.count,
          by_status: reportsByStatus,
          by_type: reportsByType,
          recent: recentReports
        },
        traffic: {
          by_congestion_level: trafficByLevel,
          hotspots: trafficHotspots
        },
        leaderboard: topContributors
      }
    });

  } catch (error) {
    console.error('Get dashboard analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard analytics',
      error: error.message
    });
  }
};

// Get system statistics
exports.getSystemStats = async (req, res) => {
  try {
    const stats = {
      database: {},
      tables: {}
    };

    // Get table row counts
    const tables = ['users', 'parking_slots', 'reports', 'traffic_data', 'predictions', 'activity_log'];
    
    for (const table of tables) {
      const count = await db(table).count('* as count').first();
      stats.tables[table] = count.count;
    }

    // Database size (MySQL specific)
    try {
      const dbSize = await db.raw(`
        SELECT 
          table_schema AS 'database',
          ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'size_mb'
        FROM information_schema.tables
        WHERE table_schema = ?
        GROUP BY table_schema
      `, [process.env.DB_NAME]);

      if (dbSize[0] && dbSize[0].length > 0) {
        stats.database.size_mb = dbSize[0][0].size_mb;
      }
    } catch (err) {
      console.log('Could not fetch database size:', err.message);
    }

    // Activity summary
    const recentActivity = await db('activity_log')
      .select('action_type')
      .count('* as count')
      .whereRaw('DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 7 DAYS)')
      .groupBy('action_type')
      .orderBy('count', 'desc');

    stats.recent_activity = recentActivity;

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Get system stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching system statistics',
      error: error.message
    });
  }
};

// Get time-series data for charts
exports.getTimeSeriesData = async (req, res) => {
  try {
    const { type, days = 7 } = req.query;

    let data = {};

    if (!type || type === 'reports') {
      // Reports over time
      const reportsTimeSeries = await db.raw(`
        SELECT DATE(timestamp) as date, COUNT(*) as count
        FROM reports
        WHERE timestamp >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        GROUP BY DATE(timestamp)
        ORDER BY date
      `, [parseInt(days)]);

      data.reports = reportsTimeSeries[0];
    }

    if (!type || type === 'parking') {
      // Parking occupancy over time (using last_updated)
      const parkingTimeSeries = await db.raw(`
        SELECT 
          DATE(last_updated) as date,
          AVG(occupied_slots / total_capacity * 100) as avg_occupancy
        FROM parking_slots
        WHERE last_updated >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        GROUP BY DATE(last_updated)
        ORDER BY date
      `, [parseInt(days)]);

      data.parking_occupancy = parkingTimeSeries[0];
    }

    if (!type || type === 'traffic') {
      // Traffic congestion over time
      const trafficTimeSeries = await db.raw(`
        SELECT 
          DATE(timestamp) as date,
          congestion_level,
          COUNT(*) as count
        FROM traffic_data
        WHERE timestamp >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        GROUP BY DATE(timestamp), congestion_level
        ORDER BY date, congestion_level
      `, [parseInt(days)]);

      data.traffic = trafficTimeSeries[0];
    }

    if (!type || type === 'users') {
      // New users over time
      const usersTimeSeries = await db.raw(`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM users
        WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
        GROUP BY DATE(created_at)
        ORDER BY date
      `, [parseInt(days)]);

      data.new_users = usersTimeSeries[0];
    }

    res.json({
      success: true,
      period_days: parseInt(days),
      data
    });

  } catch (error) {
    console.error('Get time series data error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching time series data',
      error: error.message
    });
  }
};

// Export data (CSV format)
exports.exportData = async (req, res) => {
  try {
    const { type } = req.query;

    let data;
    let filename;

    switch (type) {
      case 'parking':
        data = await db('parking_slots').select('*');
        filename = 'parking_slots.json';
        break;
      case 'reports':
        data = await db('reports')
          .join('users', 'reports.user_id', 'users.id')
          .join('parking_slots', 'reports.slot_id', 'parking_slots.id')
          .select('reports.*', 'users.name as user_name', 'parking_slots.name as slot_name');
        filename = 'reports.json';
        break;
      case 'traffic':
        data = await db('traffic_data').select('*');
        filename = 'traffic_data.json';
        break;
      case 'users':
        data = await db('users')
          .select('id', 'name', 'email', 'role', 'created_at');
        filename = 'users.json';
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid export type'
        });
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.json(data);

  } catch (error) {
    console.error('Export data error:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting data',
      error: error.message
    });
  }
};

module.exports = exports;
