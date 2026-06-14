const User = require('../models/user');
const ActivityLog = require('../models/activityLog');
const { fetchOrSet, invalidateByPrefix, buildPrefix } = require('./cacheService');
const logger = require('../utils/logger');

const CACHE_NAMESPACE = 'users';
const DEFAULT_TTL = Number(process.env.REDIS_CACHE_TTL_USERS || 120);

const toIsoOrNone = (value) => {
  if (!value) {
    return 'none';
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'invalid' : date.toISOString();
};

const getAllUsersCached = async (ttlSeconds = DEFAULT_TTL) => {
  const segments = ['all'];
  const { data } = await fetchOrSet(
    CACHE_NAMESPACE,
    segments,
    async () => User.find().select('-password').lean({ getters: true }),
    ttlSeconds
  );
  return data;
};

const getUserCountByDateRangeCached = async ({ startDate, endDate } = {}, ttlSeconds = DEFAULT_TTL) => {
  const segments = ['count', toIsoOrNone(startDate), toIsoOrNone(endDate)];
  const filter = {};

  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) {
      filter.createdAt.$gte = new Date(startDate);
    }
    if (endDate) {
      filter.createdAt.$lte = new Date(endDate);
    }
  }

  const { data } = await fetchOrSet(
    CACHE_NAMESPACE,
    segments,
    async () => User.countDocuments(filter),
    ttlSeconds
  );
  return data;
};

const getActiveUserCountCached = async (ttlSeconds = DEFAULT_TTL) => {
  const segments = ['activeCount'];
  const { data } = await fetchOrSet(
    CACHE_NAMESPACE,
    segments,
    async () => ActivityLog.aggregate([
      { $match: { action: 'Create Transaction' } },
      { $group: { _id: '$user' } },
      { $count: 'activeUserCount' }
    ]).then((result) => (result.length ? result[0].activeUserCount : 0)),
    ttlSeconds
  );
  return data;
};

const invalidateAllUsers = async () => {
  const prefixes = ['all', 'count', 'activeCount'].map((segment) => buildPrefix(CACHE_NAMESPACE, segment));
  await Promise.all(prefixes.map((prefix) => invalidateByPrefix(prefix)));
  logger.debug('User cache invalidated');
};

module.exports = {
  CACHE_NAMESPACE,
  getAllUsersCached,
  getUserCountByDateRangeCached,
  getActiveUserCountCached,
  invalidateAllUsers
};
