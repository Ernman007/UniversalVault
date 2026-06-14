const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const {
  getUserSettings,
  updateUserSettings,
  getSystemSettings,
  updateSystemSettings,
  getSettingsById
} = require('../controllers/settingsController');

// Apply authentication middleware to all routes
router.use(protect);

// User settings endpoints
router.get('/user', getUserSettings);
router.put('/user', updateUserSettings);

// Admin-only endpoints - apply admin middleware to specific routes
router.get('/system', admin, getSystemSettings);
router.put('/system', admin, updateSystemSettings);
router.get('/:id', admin, getSettingsById);

module.exports = router;
