const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

// Protect these routes with authentication middleware
router.use(protect);

// GET /api/notifications - Fetch notifications for the authenticated user
router.get('/', notificationController.getNotifications);

// PUT /api/notifications/mark-all-read - Mark all notifications for the user as read
router.put('/mark-all-read', notificationController.markAllRead);

// PUT /api/notifications/:id/read - Mark a specific notification as read
router.put('/:id/read', notificationController.markAsRead);

// GET /api/notifications/user/:userId - Fetch notifications for a specific user ID
router.get('/user/:userId', notificationController.getNotificationsForUser);

// GET /api/notifications/:id - Fetch a specific notification by ID for the authenticated user
router.get('/:id', notificationController.getNotificationById);

// DELETE /api/notifications/clear-all - Clear all notifications
router.delete('/clear-all', notificationController.deleteAll);

// DELETE /api/notifications/:id - Delete a specific notification
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;