const Notification = require('../models/notification');
const notificationService = require('../services/notificationService'); // Import the service

// Helper function to emit notification via WebSocket
const emitNotification = async (notification) => {
  try {
    const io = global.app && global.app.get ? global.app.get('io') : null;
    if (io) {
      const ns = io.of('/notifications');
      // Emit only once to avoid duplicate notifications
      ns.to(`user_${notification.userId}`).emit('new_notification', notification);
    }
  } catch (error) {
    console.error('Error emitting notification:', error);
  }
};

// Create a notification
exports.createNotification = async (userId, type, message, actionUrl = null) => {
  try {
    const notification = await Notification.create({
      userId,
      type,
      message,
      time: new Date(),
      read: false,
      actionUrl
    });

    // Emit the notification via WebSocket
    await emitNotification(notification);
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// Fetch notifications for the authenticated user
exports.getNotifications = async (req, res) => {
  try {
    const { page, limit, sort, unreadOnly } = req.query;
    const result = await notificationService.getNotificationsByUserId(req.user._id, { page, limit, sort, unreadOnly });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Fetch notifications for a specific user ID via API endpoint
exports.getNotificationsForUser = async (req, res) => {
  try {
    const userId = req.params.userId;
    const isSelf = userId === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isSelf && !isAdmin) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const { page, limit, sort, unreadOnly } = req.query;
    const result = await notificationService.getNotificationsByUserId(userId, { page, limit, sort, unreadOnly });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Mark a specific notification as read
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    // Ensure the notification belongs to the authenticated user
    if (notification.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to access this notification' });
    }
    notification.read = true;
    await notification.save();
    res.json(notification);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Mark all notifications for the user as read
exports.markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user._id, read: false }, { read: true });
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Fetch a specific notification by ID for the authenticated user
exports.getNotificationById = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    // Ensure the notification belongs to the authenticated user
    if (notification.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to access this notification' });
    }
    res.json(notification);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete a specific notification
exports.deleteNotification = async (req, res) => {
  try {
    console.log('[NOTIFICATION-DELETE] Attempting to delete notification:', req.params.id, 'for user:', req.user?._id);
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      console.warn('[NOTIFICATION-DELETE] Notification not found:', req.params.id);
      return res.status(404).json({ message: 'Notification not found' });
    }

    // Ensure the notification belongs to the authenticated user
    if (notification.userId.toString() !== req.user._id.toString()) {
      console.error('[NOTIFICATION-DELETE] Unauthorized deletion attempt. Owner:', notification.userId, 'Requester:', req.user._id);
      return res.status(403).json({ message: 'Not authorized to delete this notification' });
    }

    await notification.deleteOne();
    console.log('[NOTIFICATION-DELETE] Successfully deleted notification:', req.params.id);
    res.json({ message: 'Notification deleted successfully' });
  } catch (err) {
    console.error('[NOTIFICATION-DELETE] Error deleting notification:', err);
    res.status(500).json({ message: err.message });
  }
};

// Delete all notifications for the authenticated user
exports.deleteAll = async (req, res) => {
  try {
    console.log('[NOTIFICATION-CLEAR] Attempting to clear all notifications for user:', req.user?._id);
    if (!req.user || !req.user._id) {
      console.error('[NOTIFICATION-CLEAR] No user ID found in request');
      return res.status(401).json({ message: 'Unauthorized: No user session found' });
    }
    const result = await Notification.deleteMany({ userId: req.user._id });
    console.log('[NOTIFICATION-CLEAR] Successfully deleted notifications. Count:', result.deletedCount);
    res.json({ message: 'All notifications cleared successfully', deletedCount: result.deletedCount });
  } catch (err) {
    console.error('[NOTIFICATION-CLEAR] Error clearing notifications:', err);
    res.status(500).json({ message: 'Error clearing notifications', error: err.message });
  }
};
