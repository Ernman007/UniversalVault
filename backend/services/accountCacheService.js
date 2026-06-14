const Account = require('../models/account');
const { fetchOrSet, invalidateByPrefix, buildPrefix } = require('./cacheService');
const logger = require('../utils/logger');

const CACHE_NAMESPACE = 'accounts';
const DEFAULT_TTL = Number(process.env.REDIS_CACHE_TTL_ACCOUNTS || 120);

const toIsoOrNone = (value) => {
  if (!value) {
    return 'none';
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'invalid' : date.toISOString();
};

const getUserAccounts = async (userId, ttlSeconds = DEFAULT_TTL) => {
  const segments = [userId.toString(), 'list'];
  const { data } = await fetchOrSet(
    CACHE_NAMESPACE,
    segments,
    async () => Account.find({ user: userId }).lean({ getters: true }),
    ttlSeconds
  );
  return data;
};

const getAllAccountsCached = async (ttlSeconds = DEFAULT_TTL) => {
  const segments = ['all'];
  const { data } = await fetchOrSet(
    CACHE_NAMESPACE,
    segments,
    async () => Account.find().lean({ getters: true }),
    ttlSeconds
  );
  return data;
};

const getAccountCountByDateRangeCached = async ({ startDate, endDate } = {}, ttlSeconds = DEFAULT_TTL) => {
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
    async () => Account.countDocuments(filter),
    ttlSeconds
  );
  return data;
};

const getActiveAccountCountCached = async (ttlSeconds = DEFAULT_TTL) => {
  const segments = ['activeCount'];
  const { data } = await fetchOrSet(
    CACHE_NAMESPACE,
    segments,
    async () => Account.countDocuments({ isActive: true }),
    ttlSeconds
  );
  return data;
};

const invalidateUserAccounts = async (userId) => {
  if (!userId) {
    return;
  }
  const prefix = buildPrefix(CACHE_NAMESPACE, `${userId}`);
  await invalidateByPrefix(prefix);
  logger.debug(`Account cache invalidated for user ${userId}`);
};

const invalidateAccountSummaries = async () => {
  const prefixes = ['all', 'count', 'activeCount'].map((segment) => buildPrefix(CACHE_NAMESPACE, segment));
  await Promise.all(prefixes.map((prefix) => invalidateByPrefix(prefix)));
  logger.debug('Account summary cache invalidated');
};

module.exports = {
  CACHE_NAMESPACE,
  getUserAccounts,
  getAllAccountsCached,
  getAccountCountByDateRangeCached,
  getActiveAccountCountCached,
  invalidateUserAccounts,
  invalidateAccountSummaries
};
