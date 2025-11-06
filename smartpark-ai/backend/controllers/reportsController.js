const db = require('../config/database');

// Submit a new parking report
exports.submitReport = async (req, res) => {
  try {
    const { slot_id, report_type, description } = req.body;
    const userId = req.user.id;

    // Validation
    if (!slot_id || !report_type) {
      return res.status(400).json({
        success: false,
        message: 'Slot ID and report type are required'
      });
    }

    // Check if slot exists
    const slot = await db('parking_slots').where({ id: slot_id }).first();
    if (!slot) {
      return res.status(404).json({
        success: false,
        message: 'Parking slot not found'
      });
    }

    // Insert report
    const [reportId] = await db('reports').insert({
      user_id: userId,
      slot_id,
      report_type,
      description: description || null,
      status: 'pending',
      timestamp: db.fn.now()
    });

    // Update user rewards
    await db('user_rewards')
      .where({ user_id: userId })
      .increment('total_reports', 1)
      .increment('points', 10)
      .update({ last_report_at: db.fn.now() });

    // Update parking slot based on report
    if (report_type === 'full') {
      await db('parking_slots')
        .where({ id: slot_id })
        .update({
          status: 'full',
          last_updated: db.fn.now()
        });
    } else if (report_type === 'available') {
      await db('parking_slots')
        .where({ id: slot_id })
        .update({
          status: 'available',
          last_updated: db.fn.now()
        });
    }

    // Log activity
    await db('activity_log').insert({
      user_id: userId,
      action_type: 'submit_report',
      description: `Submitted ${report_type} report for ${slot.name}`,
      ip_address: req.ip
    });

    res.status(201).json({
      success: true,
      message: 'Report submitted successfully. You earned 10 points!',
      data: {
        report_id: reportId,
        points_earned: 10
      }
    });

  } catch (error) {
    console.error('Submit report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting report',
      error: error.message
    });
  }
};

// Get all reports (admin)
exports.getAllReports = async (req, res) => {
  try {
    const { status, slot_id, limit = 50 } = req.query;

    let query = db('reports')
      .join('users', 'reports.user_id', 'users.id')
      .join('parking_slots', 'reports.slot_id', 'parking_slots.id')
      .select(
        'reports.*',
        'users.name as reporter_name',
        'users.email as reporter_email',
        'parking_slots.name as slot_name',
        'parking_slots.location as slot_location'
      );

    if (status) {
      query = query.where('reports.status', status);
    }

    if (slot_id) {
      query = query.where('reports.slot_id', slot_id);
    }

    const reports = await query
      .orderBy('reports.timestamp', 'desc')
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: reports.length,
      data: reports
    });

  } catch (error) {
    console.error('Get all reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching reports',
      error: error.message
    });
  }
};

// Get user's own reports
exports.getUserReports = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20 } = req.query;

    const reports = await db('reports')
      .join('parking_slots', 'reports.slot_id', 'parking_slots.id')
      .where('reports.user_id', userId)
      .select(
        'reports.*',
        'parking_slots.name as slot_name',
        'parking_slots.location as slot_location'
      )
      .orderBy('reports.timestamp', 'desc')
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: reports.length,
      data: reports
    });

  } catch (error) {
    console.error('Get user reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user reports',
      error: error.message
    });
  }
};

// Verify report (admin only)
exports.verifyReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const adminId = req.user.id;

    // Validation
    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be "verified" or "rejected"'
      });
    }

    const report = await db('reports').where({ id }).first();
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    // Update report status
    await db('reports')
      .where({ id })
      .update({
        status,
        verified_by: adminId,
        verified_at: db.fn.now()
      });

    // If verified, update user rewards
    if (status === 'verified') {
      await db('user_rewards')
        .where({ user_id: report.user_id })
        .increment('verified_reports', 1)
        .increment('points', 10);

      // Update level based on points
      const userReward = await db('user_rewards')
        .where({ user_id: report.user_id })
        .first();

      let newLevel = 'Bronze';
      if (userReward.points >= 500) newLevel = 'Platinum';
      else if (userReward.points >= 300) newLevel = 'Gold';
      else if (userReward.points >= 100) newLevel = 'Silver';

      await db('user_rewards')
        .where({ user_id: report.user_id })
        .update({ level: newLevel });
    }

    res.json({
      success: true,
      message: `Report ${status} successfully`
    });

  } catch (error) {
    console.error('Verify report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying report',
      error: error.message
    });
  }
};

// Get report statistics
exports.getReportStats = async (req, res) => {
  try {
    const totalReports = await db('reports').count('* as count').first();

    const statusBreakdown = await db('reports')
      .select('status')
      .count('* as count')
      .groupBy('status');

    const typeBreakdown = await db('reports')
      .select('report_type')
      .count('* as count')
      .groupBy('report_type');

    const topReporters = await db('user_rewards')
      .join('users', 'user_rewards.user_id', 'users.id')
      .select(
        'users.name',
        'user_rewards.total_reports',
        'user_rewards.verified_reports',
        'user_rewards.points',
        'user_rewards.level'
      )
      .orderBy('user_rewards.points', 'desc')
      .limit(10);

    const recentReports = await db('reports')
      .join('users', 'reports.user_id', 'users.id')
      .join('parking_slots', 'reports.slot_id', 'parking_slots.id')
      .select(
        'reports.id',
        'reports.report_type',
        'reports.status',
        'reports.timestamp',
        'users.name as reporter',
        'parking_slots.name as location'
      )
      .orderBy('reports.timestamp', 'desc')
      .limit(10);

    res.json({
      success: true,
      data: {
        total_reports: totalReports.count,
        status_breakdown: statusBreakdown,
        type_breakdown: typeBreakdown,
        top_reporters: topReporters,
        recent_reports: recentReports
      }
    });

  } catch (error) {
    console.error('Get report stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching report statistics',
      error: error.message
    });
  }
};

// Get leaderboard
exports.getLeaderboard = async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const leaderboard = await db('user_rewards')
      .join('users', 'user_rewards.user_id', 'users.id')
      .select(
        'users.id',
        'users.name',
        'users.email',
        'user_rewards.total_reports',
        'user_rewards.verified_reports',
        'user_rewards.points',
        'user_rewards.level',
        'user_rewards.last_report_at'
      )
      .orderBy('user_rewards.points', 'desc')
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: leaderboard.length,
      data: leaderboard
    });

  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching leaderboard',
      error: error.message
    });
  }
};
