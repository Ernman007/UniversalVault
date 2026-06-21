const Transaction = require("../models/transaction");
const Account = require("../models/account");
// Required so Mongoose registers the schema before populate('requestTransferId') runs
require("../models/requestTransfer");
const {
  fetchOrSet,
  invalidateByPrefix,
  buildPrefix,
} = require("./cacheService");
const logger = require("../utils/logger");

const CACHE_NAMESPACE = "transactions";
const DEFAULT_TTL = Number(process.env.REDIS_CACHE_TTL_TRANSACTIONS || 60);

const buildSegments = (
  userId,
  { type, status, accountId, startDate, endDate, page, limit, sort } = {},
) => {
  const segments = [userId.toString()];
  segments.push(type || "all");
  segments.push(status || "all");
  segments.push(accountId || "all");
  segments.push(startDate ? new Date(startDate).toISOString() : "none");
  segments.push(endDate ? new Date(endDate).toISOString() : "none");
  segments.push(`page:${page || 1}`);
  segments.push(`limit:${limit || 20}`);
  segments.push(`sort:${sort || "-date"}`);
  return segments;
};

const buildFilter = async (
  userId,
  { type, status, accountId, startDate, endDate } = {},
) => {
  // Get all accounts belonging to this user
  const userAccounts = await Account.find({ user: userId })
    .select("_id")
    .lean();
  const accountIds = userAccounts.map((a) => a._id);

  // Build filter to find transactions where:
  // 1. User is the owner of the transaction (userId matches)
  // 2. OR user's account is the source (fromAccount)
  // 3. OR user's account is the destination (toAccount)
  const filter = {
    $or: [
      { userId },
      { fromAccount: { $in: accountIds } },
      { toAccount: { $in: accountIds } },
    ],
  };

  if (type) {
    filter.type = type;
  }
  if (status) {
    filter.status = status;
  }
  if (accountId) {
    // If specific account is requested, narrow the search
    filter.$or = [{ fromAccount: accountId }, { toAccount: accountId }];
  }
  if (startDate || endDate) {
    filter.date = {};
    if (startDate) {
      filter.date.$gte = new Date(startDate);
    }
    if (endDate) {
      filter.date.$lte = new Date(endDate);
    }
  }
  return filter;
};

const fetchTransactions = async (
  filter,
  userId,
  { page, limit, sort } = {},
) => {
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 20;
  const sortField = sort || "-date";
  const skip = (pageNum - 1) * limitNum;

  logger.info("[TRANSACTION-CACHE] fetchTransactions start", {
    userId: userId?.toString(),
    pageNum,
    limitNum,
    sortField,
  });

  const [data, total] = await Promise.all([
    Transaction.find(filter)
      .populate("toAccount", "accountNumber user")
      .populate("fromAccount", "accountNumber user")
      .populate("requestTransferId", "status")
      .sort(sortField)
      .skip(skip)
      .limit(limitNum)
      .lean({ getters: true }),
    Transaction.countDocuments(filter),
  ]);

  logger.info("[TRANSACTION-CACHE] fetchTransactions query done", {
    rawCount: data.length,
    total,
  });

  // Add isUserSender/isUserReceiver flags for each transaction
  const enrichedData = data.map((tx) => {
    const fromAccountUser = tx.fromAccount?.user?._id || tx.fromAccount?.user;
    const toAccountUser = tx.toAccount?.user?._id || tx.toAccount?.user;

    let isUserSender =
      fromAccountUser && fromAccountUser.toString() === userId.toString();
    let isUserReceiver =
      toAccountUser && toAccountUser.toString() === userId.toString();

    // Defensive normalization for legacy data anomalies:
    // - Deposits should classify as incoming
    // - Withdrawals should classify as outgoing
    if (tx.type === "deposit") {
      isUserSender = false;
      isUserReceiver = true;
    } else if (tx.type === "withdrawal") {
      isUserSender = true;
      isUserReceiver = false;
    }

    console.log("[TRANSACTION-CACHE] Transaction:", {
      txId: tx._id,
      type: tx.type,
      fromAccountUser: fromAccountUser?.toString(),
      toAccountUser: toAccountUser?.toString(),
      requestUserId: userId.toString(),
      isUserSender,
      isUserReceiver,
    });

    // Derive transferStatus for sender's pending transactions
    let transferStatus = null;
    if (isUserSender && tx.requestTransferId) {
      const reqStatus = tx.requestTransferId?.status;
      if (reqStatus === "pending") transferStatus = "awaiting_verification";
      else if (reqStatus === "pending_admin")
        transferStatus = "awaiting_bank_approval";
    }

    return {
      ...tx,
      isUserSender,
      isUserReceiver,
      transferStatus,
    };
  });

  // Receiver visibility rule: hide any incoming transfer that is not yet confirmed.
  // Senders always see their outgoing transactions regardless of status.
  // Deposits and withdrawals are always visible (never pending for the owner).
  const visibleData = enrichedData.filter((tx) => {
    if (
      tx.isUserReceiver &&
      !tx.isUserSender &&
      tx.type === "transfer" &&
      tx.status !== "confirmed"
    ) {
      return false;
    }
    return true;
  });

  logger.info("[TRANSACTION-CACHE] fetchTransactions done", {
    enrichedCount: enrichedData.length,
    visibleCount: visibleData.length,
  });

  return {
    data: visibleData,
    meta: {
      total:
        visibleData.length < enrichedData.length
          ? total - (enrichedData.length - visibleData.length)
          : total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };
};

const getTransactionsCached = async (
  userId,
  options = {},
  ttlSeconds = DEFAULT_TTL,
) => {
  const { page, limit, sort, ...filterOptions } = options;

  // For paginated queries, skip cache to ensure fresh data
  if (page || limit) {
    const filter = await buildFilter(userId, filterOptions);
    return fetchTransactions(filter, userId, { page, limit, sort });
  }

  // Legacy non-paginated query (cached)
  const segments = buildSegments(userId, options);
  const filter = await buildFilter(userId, options);
  const { data } = await fetchOrSet(
    CACHE_NAMESPACE,
    segments,
    async () => fetchTransactions(filter, userId),
    ttlSeconds,
  );
  return data;
};

const getUserTransactions = async (userId, options = {}) =>
  getTransactionsCached(userId, options);

const getTransactionsByFilters = async (userId, filters = {}) =>
  getTransactionsCached(userId, filters);

const invalidateUserTransactions = async (userId) => {
  if (!userId) {
    return;
  }
  const prefix = buildPrefix(CACHE_NAMESPACE, userId.toString());
  await invalidateByPrefix(prefix);
  logger.debug(`Transaction cache invalidated for user ${userId}`);
};

module.exports = {
  CACHE_NAMESPACE,
  getUserTransactions,
  getTransactionsByFilters,
  invalidateUserTransactions,
};
