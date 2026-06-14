const User = require('../../models/user');
const Account = require('../../models/account');
const Transaction = require('../../models/transaction');
const RequestTransfer = require('../../models/requestTransfer');
const RequestCard = require('../../models/requestCard');
const SupportTicket = require('../../models/supportTicket');
const SupportMessage = require('../../models/supportMessage');

const { fetchOrSet } = require('../../services/cacheService');

let lastRealtimeMetricsAt = 0;
let realtimeEmitInFlight = null;

// @desc    Get complete admin dashboard metrics
// @route   GET /api/admin/dashboard/metrics
// @access  Private/Admin
// Helper to fetch metrics (can be used by API and Socket)
const fetchMetrics = async () => {
  const { data: metrics } = await fetchOrSet('admin_dashboard', 'metrics', async () => {
    const [
      totalUsers,
      totalBalance,
      totalTransactions,
      totalTickets,
      pendingTransfers,
      pendingCards,
      pendingAccountRequests,
      openTickets,
      openMessages
    ] = await Promise.all([
      User.countDocuments(),
      Account.getTotalSystemBalance(),
      Transaction.countDocuments(),
      SupportTicket.countDocuments(),
      RequestTransfer.countDocuments({ status: { $in: ['pending', 'pending_admin'] } }),
      RequestCard.countDocuments({ status: 'pending' }),
      SupportMessage.countDocuments({
        messageType: 'account-request',
        status: { $in: ['open', 'pending', 'in-progress'] }
      }),
      SupportTicket.countDocuments({ status: { $in: ['open', 'pending'] } }),
      SupportMessage.countDocuments({
        messageType: { $ne: 'account-request' },
        status: { $in: ['open', 'pending'] }
      })
    ]);
    const pendingSupport = openTickets + openMessages;

    const pendingTotal = pendingTransfers + pendingCards + pendingSupport + pendingAccountRequests;
    const recentActivity = [];

    const [recentUsers, recentTransfers, recentCardReqs] = await Promise.all([
      User.find().sort({ createdAt: -1 }).limit(3).lean(),
      RequestTransfer.find()
        .sort({ createdAt: -1 }).limit(3)
        .populate('requestedBy', 'name')
        .populate('fromAccount', 'accountNumber')
        .lean(),
      RequestCard.find()
        .sort({ createdAt: -1 }).limit(2)
        .populate('user', 'name')
        .lean()
    ]);

    recentUsers.forEach(u => {
      recentActivity.push({
        type: 'user_registered',
        message: `New user registered: ${u.name}`,
        timestamp: u.createdAt
      });
    });

    recentTransfers.forEach(t => {
      recentActivity.push({
        type: 'transfer',
        message: `Transfer ${t.status}: $${t.amount.toLocaleString()} by ${t.requestedBy?.name || 'Unknown'}`,
        timestamp: t.createdAt
      });
    });

    recentCardReqs.forEach(c => {
      recentActivity.push({
        type: 'card_request',
        message: `Card request ${c.status} for ${c.user?.name || 'Unknown'}`,
        timestamp: c.createdAt
      });
    });

    recentActivity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return {
      totalUsers,
      totalBalance,
      totalTransactions,
      totalTickets,
      pendingActions: pendingTotal,
      pendingTransfers,
      pendingCards,
      pendingSupport,
      pendingAccountRequests,
      recentActivity: recentActivity.slice(0, 10)
    };
  }, 10);
  return metrics;
};

// @desc    Get complete admin dashboard metrics
// @route   GET /api/admin/dashboard/metrics
// @access  Private/Admin
const getDashboardMetrics = async (req, res) => {
  try {
    const metrics = await fetchMetrics();
    res.json(metrics);
  } catch (error) {
    console.error('Dashboard metrics error:', error);
    res.status(500).json({ message: 'Failed to load dashboard metrics', error: error.message });
  }
};

// Unified emission helper to ensure "fluent" real-time updates
const emitDashboardMetricsUpdate = async (io) => {
  if (!io) return;
  if (realtimeEmitInFlight) {
    return realtimeEmitInFlight;
  }
  try {
    const now = Date.now();
    if (now - lastRealtimeMetricsAt < 5000) {
      return;
    }
    realtimeEmitInFlight = (async () => {
      const metrics = await fetchMetrics();
      io.of('/notifications').emit('dashboard_metrics_update', metrics);
      lastRealtimeMetricsAt = Date.now();
      console.log('[DashboardController] Real-time metrics emitted to /notifications');
    })();
    await realtimeEmitInFlight;
  } catch (error) {
    console.error('Failed to emit dashboard metrics update:', error);
  } finally {
    realtimeEmitInFlight = null;
  }
};

module.exports = {
  getDashboardMetrics,
  emitDashboardMetricsUpdate,
  fetchMetrics
};
