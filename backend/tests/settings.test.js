const request = require('supertest');
const { app } = require('../app');
const { setMockUserRole } = require('./__mocks__/authMiddleware');

// Mock auth middleware to bypass authentication in tests
jest.mock('../middleware/authMiddleware', () => require('./__mocks__/authMiddleware'));

// Mock settings controller to avoid DB calls
jest.mock('../controllers/settingsController', () => ({
  getUserSettings: (req, res) => res.json({ 
    theme: 'light',
    notifications: { email: true, push: false }
  }),
  updateUserSettings: (req, res) => res.json({ 
    theme: 'dark',
    notifications: { email: false, push: true }
  }),
  getSystemSettings: (req, res) => res.json({ 
    maintenance: false, 
    version: '1.2.3',
    features: { darkMode: true, mfa: true }
  }),
  updateSystemSettings: (req, res) => res.json({ 
    maintenance: true,
    features: { newFeature: true }
  }),
  getSettingsById: (req, res) => res.json({ 
    _id: req.params.id, 
    theme: 'dark'
  })
}));

describe('Settings API', () => {
  describe('User settings endpoints', () => {
    it('GET /api/settings/user should get user settings', async () => {
      const res = await request(app).get('/api/settings/user');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('theme');
    });

    it('PUT /api/settings/user should update user settings', async () => {
      const payload = { theme: 'dark', notifications: { email: false, push: true } };
      const res = await request(app).put('/api/settings/user').send(payload);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('theme', 'dark');
    });
  });

  describe('Admin settings endpoints', () => {
    // Set user role to admin for these tests
    beforeEach(() => {
      setMockUserRole('admin');
    });

    afterEach(() => {
      setMockUserRole('user');
    });

    it('GET /api/settings/system should get system settings', async () => {
      const res = await request(app).get('/api/settings/system');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('version');
    });

    it('PUT /api/settings/system should update system settings', async () => {
      const payload = { maintenance: true, features: { newFeature: true } };
      const res = await request(app).put('/api/settings/system').send(payload);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('maintenance', true);
    });

    it('GET /api/settings/:id should get settings by id', async () => {
      const res = await request(app).get('/api/settings/settings_123');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('_id', 'settings_123');
    });
  });
});
