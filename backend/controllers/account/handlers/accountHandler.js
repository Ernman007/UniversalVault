const { 
  createAccount: createAccountService,
  getAccountsByUserId: getAccountsByUserIdService,
  getAccountById: getAccountByIdService,
  getCurrentlyActiveAccountCount: getCurrentlyActiveAccountCountService,
  getAllAccounts: getAllAccountsService,
  getAccountCountByDateRange: getAccountCountByDateRangeService,
  getBalanceChange: getBalanceChangeService,
  searchAccounts: searchAccountsService
} = require('../services/accountService');
    const { fetchOrSet, invalidateByPrefix } = require('../../../services/cacheService');

const VALID_ACCOUNT_TYPES = ['savings', 'checking', 'investment'];

// Create account handler
const createAccount = async (req, res) => {
  console.log('[ACCOUNT_HANDLER] Create account request:', { 
    userId: req.body?.userId, 
    type: req.body?.type, 
    initialDeposit: req.body?.initialDeposit, 
    sourceAccountId: req.body?.sourceAccountId, 
    createdBy: req.user?._id, 
    correlationId: req.correlationId 
  });
  const { userId, type, initialDeposit, bankName, accountHolderName, sourceAccountId } = req.body;

  if (!VALID_ACCOUNT_TYPES.includes(type)) {
    console.log('[ACCOUNT_HANDLER] Invalid account type:', type);
    return res.status(400).json({
      message: `Invalid account type '${type}'. Allowed types are: ${VALID_ACCOUNT_TYPES.join(', ')}.`
    });
  }

  // Source-account validation and debit are handled atomically in service layer.

  console.log('[ACCOUNT_HANDLER] Calling createAccountService...');
  const result = await createAccountService(userId, type, initialDeposit, bankName, accountHolderName, req.user._id, sourceAccountId);
  console.log('[ACCOUNT_HANDLER] Create account result:', { 
    success: result.success, 
    accountId: result.account?._id, 
    error: result.error,
    correlationId: req.correlationId 
  });
  
  if (!result.success) {
    console.error('[ACCOUNT_HANDLER] Account creation failed:', result.message, result.error);
    const status = /insufficient|not found|does not belong|invalid/i.test(result.message || '')
      ? 400
      : 500;
    return res.status(status).json({
      message: result.message,
      error: result.error
    });
  }
  
  // Invalidate cache for this user since a new account was created
  await invalidateByPrefix(`accounts:${userId}`);
  
  console.log('[ACCOUNT_HANDLER] Account created successfully:', result.account._id);
  res.status(201).json(result.account.toObject());
};

// Get accounts handler
const getAccounts = async (req, res) => {
  const userId = req.user._id.toString();
  const { data: result } = await fetchOrSet('accounts', [userId, 'my_accounts'], async () => {
    return await getAccountsByUserIdService(userId);
  }, 120);
  
  if (!result.success) {
    return res.status(500).json({ message: result.message });
  }
  
  res.json(result.accounts);
};

// Get account by ID handler
const getAccountById = async (req, res) => {
  const accountId = req.params.id;
  const userId = req.user._id.toString();
  const { data: result } = await fetchOrSet('accounts', [userId, accountId], async () => {
    return await getAccountByIdService(accountId, userId);
  }, 120);
  
  if (!result.success) {
    return res.status(result.status || 500).json({ message: result.message });
  }
  
  res.json(result.account);
};

// Get accounts by user ID handler
const getAccountsByUserId = async (req, res) => {
  const { userId } = req.params;
  const { data: result } = await fetchOrSet('accounts', [userId, 'all'], async () => {
    return await getAccountsByUserIdService(userId);
  }, 120);
  
  if (!result.success) {
    return res.status(500).json({ message: result.message });
  }
  
  res.json(result.accounts);
};

// Get currently active account count handler
const getCurrentlyActiveAccountCount = async (req, res) => {
  const result = await getCurrentlyActiveAccountCountService();
  
  if (!result.success) {
    return res.status(500).json({ message: result.message });
  }
  
  res.json({ count: result.count });
};

// Get all accounts handler
const getAllAccounts = async (req, res) => {
  console.log('[HANDLER] getAllAccounts called by user:', req.user?._id, 'role:', req.user?.role);
  
  const result = await getAllAccountsService();
  
  console.log('[HANDLER] getAllAccounts result success:', result.success);
  console.log('[HANDLER] getAllAccounts returning accounts count:', result.accounts?.length);
  if (result.accounts?.[0]) {
    console.log('[HANDLER] Sample account:', JSON.stringify(result.accounts[0]));
  }
  
  if (!result.success) {
    return res.status(500).json({ message: result.message });
  }
  
  res.json(result.accounts);
};

// Get account count by date range handler
const getAccountCountByDateRange = async (req, res) => {
  const { startDate, endDate } = req.query;
  const result = await getAccountCountByDateRangeService(startDate, endDate);
  
  if (!result.success) {
    return res.status(500).json({ message: result.message });
  }
  
  res.json({ count: result.count });
};

// Get balance change handler
const getBalanceChange = async (req, res) => {
  // Log user ID for debugging
  console.log('User ID:', req.user._id);
  
  const result = await getBalanceChangeService(req.user._id);
  
  if (!result.success) {
    return res.status(500).json({ message: result.message });
  }
  
  res.json({ percentageChange: result.percentageChange });
};

// Search accounts by user name or email (admin only)
const searchAccounts = async (req, res) => {
  // Admin check
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }

  const { q } = req.query;
  
  const result = await searchAccountsService(q);
  
  if (!result.success) {
    return res.status(500).json({ message: result.message });
  }
  
  res.json(result.accounts);
};

module.exports = {
  createAccount,
  getAccounts,
  getAccountById,
  getAccountsByUserId,
  getCurrentlyActiveAccountCount,
  getAllAccounts,
  getAccountCountByDateRange,
  getBalanceChange,
  searchAccounts
};
