const {
  getUserActivityLogs,
  getUserActivityLogsPage,
  invalidateUserLogs
} = require('../services/activityLogService');

/**
 * @swagger
 * /api/activity-logs:
 *   get:
 *     summary: Get activity logs for the authenticated user
 *     tags: [Activity Logs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of activity logs
 *       401:
 *         description: Authentication required
 */
exports.getActivityLogs = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    const hasPaginationQuery = req.query && (req.query.page !== undefined || req.query.limit !== undefined);
    if (hasPaginationQuery) {
      const paged = await getUserActivityLogsPage(req.user._id, {
        page: req.query.page,
        limit: req.query.limit
      });
      return res.json(paged);
    }

    const logs = await getUserActivityLogs(req.user._id);
    return res.json(logs);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

exports.clearActivityLogCache = async (userId) => {
  if (!userId) {
    return;
  }
  await invalidateUserLogs(userId);
};
