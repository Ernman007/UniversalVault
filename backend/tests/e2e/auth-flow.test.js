const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { app } = require('../../app');
const User = require('../../models/user');

describe('Authentication Flow E2E Tests', () => {
  let mongoServer;
  let testUser;
  let authToken;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    
    await mongoose.connect(mongoUri);
    
    // Create a test user
    const hashedPassword = await bcrypt.hash('password123', 12);
    testUser = new User({
      name: 'Test User',
      email: 'test@example.com',
      password: hashedPassword,
      role: 'user',
      status: 'active'
    });
    await testUser.save();
  }, 30000);

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Authentication Flow', () => {
    it('should login successfully and return valid token', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('test@example.com');
      expect(response.body.user).not.toHaveProperty('password');
      
      authToken = response.body.token;
    });

    it('should access protected route with valid token', async () => {
      const response = await request(app)
        .get('/api/accounts')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should reject protected route with invalid token', async () => {
      const response = await request(app)
        .get('/api/accounts')
        .set('Authorization', 'Bearer invalid.token.here');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
    });

    it('should reject protected route without token', async () => {
      const response = await request(app)
        .get('/api/accounts');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
    });

    it('should handle forgot password flow', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
    });

    it('should handle logout', async () => {
      const response = await request(app)
        .get('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Login Validation', () => {
    it('should reject login with invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
    });

    it('should reject login with missing password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
    });

    it('should reject login with wrong password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
    });

    it('should reject login with non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Rate Limiting', () => {
    it('should handle rate limiting on login attempts', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      // Make multiple failed login attempts
      const attempts = [];
      for (let i = 0; i < 5; i++) {
        attempts.push(
          request(app)
            .post('/api/auth/login')
            .send(loginData)
        );
      }

      const responses = await Promise.all(attempts);
      
      // First few should fail with 401
      responses.slice(0, 4).forEach(response => {
        expect(response.status).toBe(401);
      });

      // Fifth should be rate limited
      expect(responses[4].status).toBe(429);
      expect(responses[4].body).toHaveProperty('message');
    }, 10000);
  });
});
