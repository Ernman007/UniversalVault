const request = require('supertest');
const { app } = require('../app');
const { setMockUserRole } = require('./__mocks__/authMiddleware');

// Mock auth middleware to bypass authentication in tests
jest.mock('../middleware/authMiddleware', () => require('./__mocks__/authMiddleware'));

// Mock activity controller to avoid DB calls
jest.mock('../controllers/activityController', () => ({
  logActivity: (req, res) => res.status(201).json({ 
    _id: 'act_1', 
    user: req.body.userId || req.user._id,
    action: req.body.action,
    metadata: req.body.details || {},
    date: new Date()
  }),
  getUserActivities: (req, res) => res.json({
    activities: [
      { _id: 'act_1', user: req.user._id, action: 'login', date: new Date() },
      { _id: 'act_2', user: req.user._id, action: 'view_account', date: new Date() }
    ],
    totalPages: 1,
    currentPage: 1,
    total: 2
  }),
  getActivityById: (req, res) => res.json({ 
    _id: req.params.id, 
    user: '507f1f77bcf86cd799439011', 
    action: 'transfer', 
    date: new Date() 
  }),
  getAllActivities: (req, res) => res.json({
    activities: [
      { _id: 'act_1', user: '507f1f77bcf86cd799439011', action: 'login', date: new Date() },
      { _id: 'act_2', user: '507f1f77bcf86cd799439012', action: 'transfer', date: new Date() }
    ],
    totalPages: 1,
    currentPage: 1,
    total: 2
  }),
  getRecentActivities: (req, res) => res.json([
    { _id: 'act_3', user: '507f1f77bcf86cd799439011', action: 'login', date: new Date() }
  ]),
  getActivityStats: (req, res) => res.json({ 
    total: 150, 
    byType: {
      login: 45,
      transfer: 30,
      view_account: 75
    }
  }),
  getActivitiesByDateRange: (req, res) => res.json({
    activities: [
      { _id: 'act_4', user: '507f1f77bcf86cd799439011', action: 'login', date: new Date() }
    ],
    totalPages: 1,
    currentPage: 1,
    total: 1
  })
}));

describe('Activity Logs API', () => {
  describe('User activity endpoints', () => {
    it('POST /api/activities should log activity', async () => {
      const payload = { action: 'view_account', details: { accountId: 'acc_123' } };
      const res = await request(app).post('/api/activities').send(payload);
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('action', payload.action);
    });

    it('GET /api/activities/user should get user activities', async () => {
      const res = await request(app).get('/api/activities/user');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('activities');
      expect(Array.isArray(res.body.activities)).toBe(true);
    });
  });

  describe('Admin activity endpoints', () => {
    // Set user role to admin for these tests
    beforeEach(() => {
      setMockUserRole('admin');
    });

    afterEach(() => {
      setMockUserRole('user');
    });

    it('GET /api/activities should list all activities for admin', async () => {
      const res = await request(app).get('/api/activities');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('activities');
      expect(Array.isArray(res.body.activities)).toBe(true);
    });

    it('GET /api/activities/:id should get activity by id', async () => {
      const res = await request(app).get('/api/activities/act_123');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('_id', 'act_123');
    });

    it('GET /api/activities/recent should get recent activities', async () => {
      const res = await request(app).get('/api/activities/recent');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /api/activities/stats should get activity statistics', async () => {
      const res = await request(app).get('/api/activities/stats');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('byType');
    });

    it('GET /api/activities/date-range should get activities by date range', async () => {
      const query = { startDate: '2023-01-01', endDate: '2023-01-31' };
      const res = await request(app).get('/api/activities/date-range').query(query);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('activities');
      expect(Array.isArray(res.body.activities)).toBe(true);
    });
  });
});
