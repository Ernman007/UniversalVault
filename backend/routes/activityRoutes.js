const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const {
  logActivity,
  getUserActivities,
  getActivityById,
  getAllActivities,
  getRecentActivities,
  getActivityStats,
  getActivitiesByDateRange
} = require('../controllers/activityController');

// Apply authentication middleware to all routes
router.use(protect);

// User activity endpoints (specific routes first)
router.get('/user', (req, res) => {
  getUserActivities(req, res);
});
router.get('/recent', admin, (req, res) => {
  getRecentActivities(req, res);
});
router.get('/stats', admin, (req, res) => {
  getActivityStats(req, res);
});
router.get('/date-range', admin, (req, res) => {
  getActivitiesByDateRange(req, res);
});

// POST route for logging activity
router.post('/', logActivity);

// Admin-only endpoints
router.get('/', admin, getAllActivities);
router.get('/:id', admin, getActivityById);

module.exports = router;
