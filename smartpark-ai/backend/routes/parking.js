const express = require('express');
const router = express.Router();
const parkingController = require('../controllers/parkingController');
const { verifyToken, optionalAuth } = require('../middleware/auth');

// Public routes (with optional auth)
router.get('/slots', optionalAuth, parkingController.getAllSlots);
router.get('/slots/nearby', optionalAuth, parkingController.getNearbySlots);
router.get('/slots/:id', optionalAuth, parkingController.getSlotById);
router.get('/stats', optionalAuth, parkingController.getParkingStats);
router.get('/predict', optionalAuth, parkingController.getParkingPredictions);

// Protected routes
router.post('/slots/:id/update', verifyToken, parkingController.updateSlotStatus);

module.exports = router;
