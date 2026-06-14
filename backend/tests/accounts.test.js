const request = require('supertest');
const { app } = require('../app');

// Mock auth middleware to bypass authentication in tests
jest.mock('../middleware/authMiddleware', () => ({
  protect: (req, res, next) => {
    req.user = { _id: '507f1f77bcf86cd799439011', role: 'admin', email: 'test@example.com' };
    next();
  }
}));

// Mock controller handlers to avoid DB calls
jest.mock('../controllers/accountController', () => ({
  createAccount: (req, res) => res.status(201).json({ id: 'acc_1', ...req.body }),
  getAccounts: (req, res) => res.json([{ id: 'acc_user_1' }]),
  getAccountById: (req, res) => res.json({ id: req.params.id }),
  getAccountsByUserId: (req, res) => res.json([{ id: 'acc_user', userId: req.params.userId }]),
  getCurrentlyActiveAccountCount: (req, res) => res.json({ count: 7 }),
  getAllAccounts: (req, res) => res.json([{ id: 'acc_all_1' }, { id: 'acc_all_2' }]),
  getAccountCountByDateRange: (req, res) => res.json({ count: 3 }),
  getBalanceChange: (req, res) => res.json({ percentageChange: 120.55 })
}));

describe('Accounts API', () => {
  it('POST /api/accounts should create account', async () => {
    const payload = { userId: '507f1f77bcf86cd799439011', type: 'savings', initialDeposit: 100 };
    const res = await request(app).post('/api/accounts').send(payload);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
  });

  it('GET /api/accounts should list user accounts', async () => {
    const res = await request(app).get('/api/accounts');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/accounts/all should list all accounts', async () => {
    const res = await request(app).get('/api/accounts/all');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/accounts/count should return count', async () => {
    const res = await request(app).get('/api/accounts/count');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('count');
  });

  it('GET /api/accounts/active/count should return active count', async () => {
    const res = await request(app).get('/api/accounts/active/count');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('count');
  });

  it('GET /api/accounts/user/:userId should list accounts by user', async () => {
    const res = await request(app).get('/api/accounts/user/507f1f77bcf86cd799439011');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/accounts/:id should get account by id', async () => {
    const res = await request(app).get('/api/accounts/acc_123');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', 'acc_123');
  });

  it('GET /api/accounts/balance-change should return change summary', async () => {
    const res = await request(app).get('/api/accounts/balance-change');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('percentageChange');
  });
});
