const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, isAdmin } = require('../middleware/auth');

// All admin routes require authentication and admin role
router.use(verifyToken);
router.use(isAdmin);

router.get('/analytics', adminController.getDashboardAnalytics);
router.get('/stats', adminController.getSystemStats);
router.get('/timeseries', adminController.getTimeSeriesData);
router.get('/export', adminController.exportData);

module.exports = router;
