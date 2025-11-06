const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reportsController');
const { verifyToken, isAdmin } = require('../middleware/auth');

// Protected user routes
router.post('/', verifyToken, reportsController.submitReport);
router.get('/user', verifyToken, reportsController.getUserReports);
router.get('/leaderboard', reportsController.getLeaderboard);

// Admin routes
router.get('/', verifyToken, isAdmin, reportsController.getAllReports);
router.put('/:id/verify', verifyToken, isAdmin, reportsController.verifyReport);
router.get('/stats', verifyToken, isAdmin, reportsController.getReportStats);

module.exports = router;
