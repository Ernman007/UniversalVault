const Notification = require('../models/notification');

// Fetch notifications for a specific user ID with pagination support
exports.getNotificationsByUserId = async (userId, options = {}) => {
  try {
    const { page, limit, sort, unreadOnly } = options;
    
    // Build filter
    const filter = { userId };
    if (unreadOnly === 'true' || unreadOnly === true) {
      filter.read = false;
    }
    
    // Check if pagination is requested
    if (page || limit) {
      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 20;
      const sortField = sort || '-time';
      const skip = (pageNum - 1) * limitNum;
      
      const [data, total] = await Promise.all([
        Notification.find(filter)
          .sort(sortField)
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Notification.countDocuments(filter)
      ]);
      
      return {
        data,
        meta: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum)
        }
      };
    }
    
    // Legacy non-paginated query
    const notifications = await Notification.find(filter).sort({ time: -1 });
    return notifications;
  } catch (error) {
    console.error('Error fetching notifications by user ID from service:', error);
    throw error;
  }
};