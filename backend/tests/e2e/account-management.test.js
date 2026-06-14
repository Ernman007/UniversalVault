const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const bcrypt = require('bcryptjs');

const { app } = require('../../app');
const User = require('../../models/user');
const Account = require('../../models/account');

describe('Account Management E2E Tests', () => {
  let mongoServer;
  let testUser;
  let authToken;
  let testAccount;

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

    // Login to get token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });
    
    authToken = loginResponse.body.token;
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Account Creation and Management', () => {
    it('should create a new account', async () => {
      const accountData = {
        type: 'savings',
        initialDeposit: 1000
      };

      const response = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(accountData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('accountNumber');
      expect(response.body).toHaveProperty('type', accountData.type);
      expect(response.body).toHaveProperty('balance', accountData.initialDeposit);
      expect(response.body).toHaveProperty('userId', testUser._id.toString());
      
      testAccount = response.body;
    });

    it('should list user accounts', async () => {
      const response = await request(app)
        .get('/api/accounts')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('accountNumber');
      expect(response.body[0]).toHaveProperty('balance');
    });

    it('should get account by ID', async () => {
      const response = await request(app)
        .get(`/api/accounts/${testAccount._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('_id', testAccount._id);
      expect(response.body).toHaveProperty('accountNumber');
      expect(response.body).toHaveProperty('balance');
    });

    it('should reject access to another user\'s account', async () => {
      // Create another user
      const anotherUser = new User({
        name: 'Another User',
        email: 'another@example.com',
        password: await bcrypt.hash('password123', 12),
        role: 'user',
        status: 'active'
      });
      await anotherUser.save();

      // Login as another user
      const anotherLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'another@example.com',
          password: 'password123'
        });
      
      const anotherToken = anotherLoginResponse.body.token;

      // Try to access first user's account
      const response = await request(app)
        .get(`/api/accounts/${testAccount._id}`)
        .set('Authorization', `Bearer ${anotherToken}`);

      expect(response.status).toBe(404); // Account not found for this user
    });
  });

  describe('Account Validation', () => {
    it('should reject account creation with invalid type', async () => {
      const invalidAccountData = {
        type: 'invalid-type',
        initialDeposit: 1000
      };

      const response = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidAccountData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
    });

    it('should reject account creation with negative deposit', async () => {
      const invalidAccountData = {
        type: 'savings',
        initialDeposit: -100
      };

      const response = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidAccountData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
    });

    it('should reject account creation without type', async () => {
      const incompleteAccountData = {
        initialDeposit: 1000
      };

      const response = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(incompleteAccountData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Account Statistics', () => {
    it('should get active account count', async () => {
      const response = await request(app)
        .get('/api/accounts/active/count')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('count');
      expect(typeof response.body.count).toBe('number');
    });

    it('should get balance change summary', async () => {
      const response = await request(app)
        .get('/api/accounts/balance-change')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('change');
      expect(typeof response.body.change).toBe('number');
    });
  });

  describe('Admin Account Management', () => {
    let adminToken;
    let adminUser;

    beforeAll(async () => {
      // Create admin user
      const hashedPassword = await bcrypt.hash('admin123', 12);
      adminUser = new User({
        name: 'Admin User',
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'admin',
        status: 'active'
      });
      await adminUser.save();

      // Login as admin
      const adminLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@example.com',
          password: 'admin123'
        });
      
      adminToken = adminLoginResponse.body.token;
    }, 30000);

    it('should allow admin to get all accounts', async () => {
      const response = await request(app)
        .get('/api/accounts/all')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should reject regular user from accessing all accounts', async () => {
      const response = await request(app)
        .get('/api/accounts/all')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('message');
    });
  });
});
