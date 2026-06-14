const ActivityLog = require('../models/activityLog');
const { getUserActivityLogsPage } = require('../services/activityLogService');

// Log activity
const logActivity = async (req, res) => {
  try {
    const { action, details } = req.body;
    const activity = new ActivityLog({
      user: req.user._id,
      action,
      metadata: details || {},
      date: new Date()
    });
    await activity.save();
    res.status(201).json(activity);
  } catch (error) {
    res.status(500).json({ message: 'Error logging activity', error: error.message });
  }
};

// Get user activities
const getUserActivities = async (req, res) => {
  try {
    const result = await getUserActivityLogsPage(req.user._id, {
      page: req.query.page,
      limit: req.query.limit
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user activities', error: error.message });
  }
};

// Get activity by ID
const getActivityById = async (req, res) => {
  try {
    const activity = await ActivityLog.findById(req.params.id);
    if (!activity) {
      return res.status(404).json({ message: 'Activity not found' });
    }
    res.json(activity);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching activity', error: error.message });
  }
};

// Get all activities (admin only)
const getAllActivities = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      action,
      userId
    } = req.query;
    const filter = {};
    if (action) filter.action = action;
    if (userId) filter.user = userId;
    
    const activities = await ActivityLog.find(filter)
      .sort({ date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await ActivityLog.countDocuments(filter);
    res.json({
      activities,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching activities', error: error.message });
  }
};

// Get recent activities
const getRecentActivities = async (req, res) => {
  try {
    const { hours = 24 } = req.query;
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    const activities = await ActivityLog.find({
      date: { $gte: cutoffTime }
    })
      .sort({ date: -1 })
      .limit(50);
    
    res.json(activities);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching recent activities', error: error.message });
  }
};

// Get activity statistics
const getActivityStats = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const total = await ActivityLog.countDocuments({
      date: { $gte: cutoffDate }
    });
    
    const byType = await ActivityLog.aggregate([
      { $match: { date: { $gte: cutoffDate } } },
      { $group: { _id: '$action', count: { $sum: 1 } } }
    ]);
    
    const stats = {
      total,
      byType: byType.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {})
    };
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching activity statistics', error: error.message });
  }
};

// Get activities by date range
const getActivitiesByDateRange = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      page = 1,
      limit = 20
    } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }
    
    const filter = {
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };
    
    const activities = await ActivityLog.find(filter)
      .sort({ date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    const total = await ActivityLog.countDocuments(filter);
    res.json({
      activities,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching activities by date range', error: error.message });
  }
};

module.exports = {
  logActivity,
  getUserActivities,
  getActivityById,
  getAllActivities,
  getRecentActivities,
  getActivityStats,
  getActivitiesByDateRange
};
