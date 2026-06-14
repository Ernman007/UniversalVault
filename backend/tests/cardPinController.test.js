const request = require('supertest');
const mongoose = require('mongoose');
const User = require('../models/user');
const app = require('../app').app;

describe('Card PIN Controller', () => {
  let testUser;
  let authToken;

  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/banking_test');
    }
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear users collection
    await User.deleteMany({});

    // Create test user
    testUser = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      role: 'user'
    });

    // Get auth token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });
    
    authToken = loginRes.body.token;
  });

  describe('GET /api/auth/card-pin/status', () => {
    it('should return PIN status - no PIN set', async () => {
      const res = await request(app)
        .get('/api/auth/card-pin/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('hasPin', false);
      expect(res.body).toHaveProperty('isLocked', false);
      expect(res.body).toHaveProperty('failedAttempts', 0);
    });

    it('should return PIN status - PIN set', async () => {
      // First set up PIN
      await request(app)
        .post('/api/auth/card-pin/setup')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ pin: '1234', confirmPin: '1234' });

      const res = await request(app)
        .get('/api/auth/card-pin/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('hasPin', true);
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .get('/api/auth/card-pin/status');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/card-pin/setup', () => {
    it('should setup PIN successfully', async () => {
      const res = await request(app)
        .post('/api/auth/card-pin/setup')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ pin: '5678', confirmPin: '5678' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('pinSessionToken');
      expect(res.body.message).toContain('successfully');
    });

    it('should reject weak PINs', async () => {
      const res = await request(app)
        .post('/api/auth/card-pin/setup')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ pin: '1234', confirmPin: '1234' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('weak');
    });

    it('should reject PINs that do not match', async () => {
      const res = await request(app)
        .post('/api/auth/card-pin/setup')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ pin: '5678', confirmPin: '5679' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('do not match');
    });

    it('should reject invalid PIN format', async () => {
      const res = await request(app)
        .post('/api/auth/card-pin/setup')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ pin: 'abc', confirmPin: 'abc' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('4-6 digits');
    });

    it('should reject if PIN already set', async () => {
      // Setup PIN first
      await request(app)
        .post('/api/auth/card-pin/setup')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ pin: '5678', confirmPin: '5678' });

      // Try to setup again
      const res = await request(app)
        .post('/api/auth/card-pin/setup')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ pin: '9999', confirmPin: '9999' });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('already set');
    });
  });

  describe('POST /api/auth/card-pin/verify', () => {
    beforeEach(async () => {
      // Setup PIN before each verify test
      await request(app)
        .post('/api/auth/card-pin/setup')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ pin: '5678', confirmPin: '5678' });
    });

    it('should verify correct PIN', async () => {
      const res = await request(app)
        .post('/api/auth/card-pin/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ pin: '5678' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('pinSessionToken');
    });

    it('should reject incorrect PIN', async () => {
      const res = await request(app)
        .post('/api/auth/card-pin/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ pin: '0000' });

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Incorrect');
      expect(res.body).toHaveProperty('attemptsRemaining');
    });

    it('should lock account after 5 failed attempts', async () => {
      // Make 5 failed attempts
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/card-pin/verify')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ pin: '0000' });
      }

      // 6th attempt should be locked
      const res = await request(app)
        .post('/api/auth/card-pin/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ pin: '5678' });

      expect(res.status).toBe(429);
      expect(res.body).toHaveProperty('locked', true);
      expect(res.body.message).toContain('failed attempts');
    });

    it('should reset failed attempts on successful verification', async () => {
      // Make 2 failed attempts
      await request(app)
        .post('/api/auth/card-pin/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ pin: '0000' });

      await request(app)
        .post('/api/auth/card-pin/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ pin: '0000' });

      // Successful verification
      await request(app)
        .post('/api/auth/card-pin/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ pin: '5678' });

      // Check status - should have 0 failed attempts
      const statusRes = await request(app)
        .get('/api/auth/card-pin/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(statusRes.body.failedAttempts).toBe(0);
    });
  });

  describe('PUT /api/auth/card-pin/change', () => {
    beforeEach(async () => {
      // Setup PIN before each change test
      await request(app)
        .post('/api/auth/card-pin/setup')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ pin: '5678', confirmPin: '5678' });
    });

    it('should change PIN successfully', async () => {
      const res = await request(app)
        .put('/api/auth/card-pin/change')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPin: '5678',
          newPin: '9999',
          confirmNewPin: '9999'
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('pinSessionToken');

      // Verify new PIN works
      const verifyRes = await request(app)
        .post('/api/auth/card-pin/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ pin: '9999' });

      expect(verifyRes.status).toBe(200);
    });

    it('should reject wrong current PIN', async () => {
      const res = await request(app)
        .put('/api/auth/card-pin/change')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPin: '0000',
          newPin: '9999',
          confirmNewPin: '9999'
        });

      expect(res.status).toBe(401);
      expect(res.body.message).toContain('incorrect');
    });

    it('should reject mismatched new PINs', async () => {
      const res = await request(app)
        .put('/api/auth/card-pin/change')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currentPin: '5678',
          newPin: '9999',
          confirmNewPin: '8888'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('do not match');
    });
  });

  describe('POST /api/auth/card-pin/reset-request', () => {
    beforeEach(async () => {
      // Setup PIN before each reset test
      await request(app)
        .post('/api/auth/card-pin/setup')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ pin: '5678', confirmPin: '5678' });
    });

    it('should request PIN reset successfully', async () => {
      const res = await request(app)
        .post('/api/auth/card-pin/reset-request')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.message).toContain('email sent');
    });
  });

  describe('POST /api/auth/card-pin/reset', () => {
    let resetToken;
    let previousExposeFlag;

    beforeAll(() => {
      previousExposeFlag = process.env.CARD_PIN_INCLUDE_RESET_TOKEN;
      process.env.CARD_PIN_INCLUDE_RESET_TOKEN = 'true';
    });

    afterAll(() => {
      if (typeof previousExposeFlag === 'undefined') {
        delete process.env.CARD_PIN_INCLUDE_RESET_TOKEN;
      } else {
        process.env.CARD_PIN_INCLUDE_RESET_TOKEN = previousExposeFlag;
      }
    });

    beforeEach(async () => {
      // Setup PIN
      await request(app)
        .post('/api/auth/card-pin/setup')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ pin: '5678', confirmPin: '5678' });

      // Request reset
      const res = await request(app)
        .post('/api/auth/card-pin/reset-request')
        .set('Authorization', `Bearer ${authToken}`);

      resetToken = res.body.resetToken;
    });

    it('should reset PIN with valid token', async () => {
      const res = await request(app)
        .post('/api/auth/card-pin/reset')
        .send({
          resetToken,
          newPin: '8888',
          confirmNewPin: '8888'
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('success', true);

      // Verify new PIN works
      const verifyRes = await request(app)
        .post('/api/auth/card-pin/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ pin: '8888' });

      expect(verifyRes.status).toBe(200);
    });

    it('should reject invalid reset token', async () => {
      const res = await request(app)
        .post('/api/auth/card-pin/reset')
        .send({
          resetToken: 'invalidtoken',
          newPin: '8888',
          confirmNewPin: '8888'
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Invalid or expired');
    });
  });
});
