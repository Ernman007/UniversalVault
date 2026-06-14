const ActivityLog = require('../models/activityLog');
const { fetchOrSet, invalidateByPrefix, buildPrefix } = require('./cacheService');
const logger = require('../utils/logger');

const CACHE_NAMESPACE = 'activityLogs';
const DEFAULT_TTL = Number(process.env.REDIS_CACHE_TTL_ACTIVITY_LOGS || 60);

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const getUserActivityLogs = async (userId, ttlSeconds = DEFAULT_TTL) => {
  const cacheSegments = [userId.toString()];
  const { data } = await fetchOrSet(
    CACHE_NAMESPACE,
    cacheSegments,
    async () => ActivityLog.find({ user: userId }).sort('-date').lean({ getters: true }),
    ttlSeconds
  );
  return data;
};

const getUserActivityLogsPage = async (
  userId,
  { page = 1, limit = 10 } = {},
  ttlSeconds = DEFAULT_TTL
) => {
  const normalizedPage = toPositiveInt(page, 1);
  const normalizedLimit = toPositiveInt(limit, 10);
  const cacheSegments = [userId.toString(), 'page', normalizedPage, 'limit', normalizedLimit];

  const { data } = await fetchOrSet(
    CACHE_NAMESPACE,
    cacheSegments,
    async () => {
      const [activities, total] = await Promise.all([
        ActivityLog.find({ user: userId })
          .sort({ date: -1 })
          .limit(normalizedLimit)
          .skip((normalizedPage - 1) * normalizedLimit)
          .lean({ getters: true }),
        ActivityLog.countDocuments({ user: userId })
      ]);

      return {
        activities,
        totalPages: Math.ceil(total / normalizedLimit) || 1,
        currentPage: normalizedPage,
        total
      };
    },
    ttlSeconds
  );

  return data;
};

const invalidateUserLogs = async (userId) => {
  if (!userId) {
    return;
  }
  const prefix = buildPrefix(CACHE_NAMESPACE, userId.toString());
  await invalidateByPrefix(prefix);
};

const logActivity = async ({ userId, action, metadata = {}, correlationId }) => {
  if (!userId) {
    throw new Error('logActivity requires a userId');
  }
  const entry = await ActivityLog.create({ 
    user: userId, 
    action, 
    metadata,
    correlationId
  });
  logger.debug(`Activity log created for user ${userId} (${action})`, { correlationId });
  await invalidateUserLogs(userId);
  return entry;
};

module.exports = {
  CACHE_NAMESPACE,
  getUserActivityLogs,
  getUserActivityLogsPage,
  invalidateUserLogs,
  logActivity
};
