const request = require('supertest');
const { app } = require('../app');

// Mock auth middleware to bypass authentication in tests
jest.mock('../middleware/authMiddleware', () => ({
  protect: (req, res, next) => {
    req.user = { _id: '507f1f77bcf86cd799439011', role: 'user' };
    next();
  }
}));

// Mock controller to avoid DB
jest.mock('../controllers/notificationController', () => ({
  getNotifications: (req, res) => {
    if (req.params.userId) {
      // For the user-specific endpoint
      return res.json([{ id: 'n3', userId: req.params.userId }]);
    }
    // For the general endpoint
    return res.json([{ id: 'n1' }, { id: 'n2' }]);
  },
  markAsRead: (req, res) => res.json({ id: req.params.id, read: true }),
  markAllRead: (req, res) => res.json({ message: 'All notifications marked as read' }),
  getNotificationById: (req, res) => res.json({ id: req.params.id }),
  deleteNotification: (req, res) => res.json({ message: 'Notification deleted successfully' })
}));

describe('Notifications API', () => {
  it('GET /api/notifications should return list for authenticated user', async () => {
    const res = await request(app).get('/api/notifications');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('PUT /api/notifications/:id/read should mark as read', async () => {
    const res = await request(app).put('/api/notifications/abc/read');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('read', true);
  });

  it('PUT /api/notifications/mark-all-read should mark all as read', async () => {
    const res = await request(app).put('/api/notifications/mark-all-read');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');
  });

  it('GET /api/notifications/:id should get by id', async () => {
    const res = await request(app).get('/api/notifications/xyz');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', 'xyz');
  });

  it('GET /api/notifications/user/:userId should list by user id', async () => {
    const res = await request(app).get('/api/notifications/user/507f1f77bcf86cd799439011');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('DELETE /api/notifications/:id should delete and return 200', async () => {
    const res = await request(app).delete('/api/notifications/id123');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');
  });
});
