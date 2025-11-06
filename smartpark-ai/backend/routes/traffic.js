const express = require('express');
const router = express.Router();
const trafficController = require('../controllers/trafficController');
const { optionalAuth } = require('../middleware/auth');

// Public routes (with optional auth for tracking)
router.get('/', optionalAuth, trafficController.getAllTrafficData);
router.get('/heatmap', optionalAuth, trafficController.getTrafficHeatmap);
router.get('/nearby', optionalAuth, trafficController.getTrafficByLocation);
router.get('/stats', optionalAuth, trafficController.getTrafficStats);
router.get('/realtime', optionalAuth, trafficController.getRealTimeTraffic);

module.exports = router;
