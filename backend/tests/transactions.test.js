const request = require('supertest');
const { app } = require('../app');

// Mock auth middleware to bypass authentication in tests
jest.mock('../middleware/authMiddleware', () => ({
  protect: (req, res, next) => {
    req.user = { _id: '507f1f77bcf86cd799439011', role: 'user' };
    next();
  },
  admin: (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
      next();
    } else {
      res.status(403).json({ message: 'Admin access required' });
    }
  }
}));

// Mock transaction controllers to avoid DB calls
jest.mock('../controllers/transaction', () => ({
  createTransaction: (req, res) => res.status(201).json({ 
    id: 'tx_1', 
    fromAccount: req.body.fromAccount,
    toAccount: req.body.toAccount,
    amount: req.body.amount,
    type: req.body.type || 'transfer'
  }),
  getTransactions: (req, res) => res.json([
    { id: 'tx_1', fromAccount: 'acc_1', toAccount: 'acc_2', amount: 100 }
  ]),
  getAllTransactions: (req, res) => res.json([
    { id: 'tx_1', fromAccount: 'acc_1', toAccount: 'acc_2', amount: 100 },
    { id: 'tx_2', fromAccount: 'acc_2', toAccount: 'acc_3', amount: 200 }
  ]),
  getTransactionsByUserId: (req, res) => res.json([
    { id: 'tx_1', userId: req.params.userId, fromAccount: 'acc_1', amount: 100 }
  ]),
  updateTransactionStatus: (req, res) => res.json({ 
    id: req.params.transactionId, 
    status: req.body.status 
  }),
  getTransactionByRequestId: (req, res) => res.json({ 
    id: req.params.requestId, 
    fromAccount: 'acc_1', 
    toAccount: 'acc_2', 
    amount: 100 
  }),
  createCardTransaction: (req, res) => res.status(201).json({ 
    id: 'tx_1', 
    cardId: req.body.cardId,
    amount: req.body.amount,
    merchant: req.body.merchant
  }),
  cancelTransactionRequestAndReturnFunds: (req, res) => res.json({ 
    message: 'Transaction cancelled and funds returned' 
  }),
  getAllAccounts: (req, res) => res.json([
    { id: 'acc_1', userId: '507f1f77bcf86cd799439011', balance: 1000 },
    { id: 'acc_2', userId: '507f1f77bcf86cd799439012', balance: 2000 }
  ])
}));

// Mock transfer request controller
jest.mock('../controllers/transfer-request', () => ({
  createRequest: (req, res) => res.status(201).json({ 
    id: 'req_1', 
    fromAccount: req.body.fromAccount,
    toAccount: req.body.toAccount,
    amount: req.body.amount,
    status: 'pending'
  }),
  getTransferRequests: (req, res) => res.json([
    { id: 'req_1', fromAccount: 'acc_1', toAccount: 'acc_2', amount: 100, status: 'pending' }
  ]),
  manageTransferRequest: (req, res) => res.json({ 
    id: req.params.id, 
    status: req.body.status 
  }),
  deleteTransferRequest: (req, res) => res.json({ 
    message: 'Transfer request deleted' 
  }),
  verifyTransferRequest: (req, res) => res.json({ 
    id: req.params.requestId || req.body.requestId, 
    status: 'verified' 
  })
}));

describe('Transactions API', () => {
  describe('Regular transactions', () => {
    it('POST /api/transactions should create transaction', async () => {
      const payload = { fromAccount: 'acc_1', toAccount: 'acc_2', amount: 100 };
      const res = await request(app).post('/api/transactions').send(payload);
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.amount).toBe(payload.amount);
    });

    it('GET /api/transactions should list transactions', async () => {
      const res = await request(app).get('/api/transactions');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /api/transactions/by-request/:requestId should get transaction by request id', async () => {
      const res = await request(app).get('/api/transactions/by-request/req_123');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', 'req_123');
    });

    it('GET /api/transactions/user/:userId should get by user', async () => {
      const res = await request(app).get('/api/transactions/user/507f1f77bcf86cd799439011');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /api/transactions/all should get all transactions', async () => {
      const res = await request(app).get('/api/transactions/all');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /api/transactions/accounts should get all accounts', async () => {
      const res = await request(app).get('/api/transactions/accounts');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('Transfer requests', () => {
    it('POST /api/transfer-requests should create request', async () => {
      const payload = { fromAccount: 'acc_1', toAccount: 'acc_2', amount: 100 };
      const res = await request(app).post('/api/transfer-requests').send(payload);
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('status', 'pending');
    });

    it('GET /api/transfer-requests should list requests', async () => {
      const res = await request(app).get('/api/transfer-requests');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /api/transfer-requests/:id should get request by id', async () => {
      const res = await request(app).get('/api/transfer-requests/req_123');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', 'req_123');
    });

    it('PUT /api/transfer-requests/:id/manage should update status', async () => {
      const payload = { status: 'approved' };
      const res = await request(app).put('/api/transfer-requests/req_123/manage').send(payload);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', payload.status);
    });

    it('GET /api/transfer-requests/user/:userId should get by user', async () => {
      const res = await request(app).get('/api/transfer-requests/user/507f1f77bcf86cd799439011');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
