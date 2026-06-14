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

// Mock user controller to avoid DB calls
jest.mock('../controllers/userController', () => ({
  createUser: (req, res) => res.status(201).json({ 
    id: 'user_1', 
    name: req.body.name,
    email: req.body.email, 
    role: req.body.role 
  }),
  getUsers: (req, res) => res.json([
    { id: 'user_1', email: 'user1@example.com', role: 'user' },
    { id: 'user_2', email: 'user2@example.com', role: 'user' }
  ]),
  getUserById: (req, res) => res.json({ 
    id: req.params.id, 
    email: 'user@example.com', 
    role: 'user' 
  }),
  deleteUser: (req, res) => res.json({ message: 'User removed' }),
  getUserCountByDateRange: (req, res) => res.json({ count: 10 }),
  getActiveUserCount: (req, res) => res.json({ count: 5 })
}));

describe('Users API', () => {
  describe('User management endpoints', () => {
    it('POST /api/users should create a new user', async () => {
      const payload = { name: 'Test User', email: 'test@example.com', password: 'password123', role: 'user' };
      const res = await request(app).post('/api/users').send(payload);
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('name', payload.name);
    });

    it('GET /api/users should list all users', async () => {
      const res = await request(app).get('/api/users');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('GET /api/users/:id should get user by id', async () => {
      const res = await request(app).get('/api/users/user_123');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id', 'user_123');
    });

    it('DELETE /api/users/:id should delete user', async () => {
      const res = await request(app).delete('/api/users/user_123');
      expect(res.status).toBe(200);
    });

    it('GET /api/users/count should get user count by date range', async () => {
      const res = await request(app).get('/api/users/count?startDate=2023-01-01&endDate=2023-12-31');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('count');
    });

    it('GET /api/users/active/count should get active user count', async () => {
      const res = await request(app).get('/api/users/active/count');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('count');
    });
  });
});
