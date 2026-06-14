const { fetchOrSet, invalidateByPrefix, buildPrefix } = require('./cacheService');
const SupportTicket = require('../models/supportTicket');
const logger = require('../utils/logger');

const CACHE_NAMESPACE = 'supportTickets';
const DEFAULT_TTL = 120;

const buildSegments = ({ assignee, category } = {}) => [
  'unresolved',
  assignee || 'all',
  category || 'all'
];

const getUnresolvedCountCached = async (filters = {}, ttlSeconds = DEFAULT_TTL) => {
  const segments = buildSegments(filters);
  const resolver = async () => {
    const query = { status: { $in: ['open', 'pending'] } };
    if (filters.assignee) {
      query.assignee = filters.assignee;
    }
    if (filters.category) {
      query.category = filters.category;
    }
    logger.debug('supportTickets: computing unresolved count', { query });
    return SupportTicket.countDocuments(query);
  };

  const { data } = await fetchOrSet(CACHE_NAMESPACE, segments, resolver, ttlSeconds);
  return data;
};

const invalidateUnresolvedCount = async () => {
  const prefix = buildPrefix(CACHE_NAMESPACE, 'unresolved');
  await invalidateByPrefix(prefix);
};

module.exports = {
  getUnresolvedCountCached,
  invalidateUnresolvedCount
};
