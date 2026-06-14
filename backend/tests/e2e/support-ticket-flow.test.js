const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const bcrypt = require('bcryptjs');

const { app } = require('../../app');
const User = require('../../models/user');
const SupportTicket = require('../../models/supportTicket');

describe('Support Ticket Flow E2E Tests', () => {
  let mongoServer;
  let testUser;
  let adminUser;
  let userToken;
  let adminToken;
  let testTicket;

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

    // Create an admin user
    adminUser = new User({
      name: 'Admin User',
      email: 'admin@example.com',
      password: hashedPassword,
      role: 'admin',
      status: 'active'
    });
    await adminUser.save();

    // Login as regular user
    const userLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'password123'
      });
    userToken = userLoginResponse.body.token;

    // Login as admin
    const adminLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@example.com',
        password: 'password123'
      });
    adminToken = adminLoginResponse.body.token;
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Support Ticket Creation and Management', () => {
    it('should create a new support ticket', async () => {
      const ticketData = {
        subject: 'Login Issue',
        description: 'I am unable to login to my account',
        priority: 'medium'
      };

      const response = await request(app)
        .post('/api/support/tickets')
        .set('Authorization', `Bearer ${userToken}`)
        .send(ticketData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('subject', ticketData.subject);
      expect(response.body).toHaveProperty('description', ticketData.description);
      expect(response.body).toHaveProperty('status', 'open');
      expect(response.body).toHaveProperty('userId', testUser._id.toString());
      
      testTicket = response.body;
    });

    it('should list user\'s support tickets', async () => {
      const response = await request(app)
        .get('/api/support/tickets')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('subject');
      expect(response.body[0]).toHaveProperty('status');
    });

    it('should get specific ticket by ID', async () => {
      const response = await request(app)
        .get(`/api/support/tickets/${testTicket._id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('_id', testTicket._id);
      expect(response.body).toHaveProperty('subject', testTicket.subject);
    });

    it('should add message to ticket', async () => {
      const messageData = {
        content: 'I have tried resetting my password but it still doesn\'t work'
      };

      const response = await request(app)
        .post(`/api/support/tickets/${testTicket._id}/messages`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(messageData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('content', messageData.content);
      expect(response.body).toHaveProperty('ticketId', testTicket._id);
    });

    it('should get ticket messages', async () => {
      const response = await request(app)
        .get(`/api/support/tickets/${testTicket._id}/messages`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('content');
    });
  });

  describe('Admin Ticket Management', () => {
    it('should allow admin to get all tickets', async () => {
      const response = await request(app)
        .get('/api/support/tickets/all')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should allow admin to update ticket status', async () => {
      const updateData = {
        status: 'in_progress',
        comment: 'Working on this issue'
      };

      const response = await request(app)
        .put(`/api/support/tickets/${testTicket._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', updateData.status);
    });

    it('should get unresolved tickets count', async () => {
      const response = await request(app)
        .get('/api/support/tickets/unresolved/count')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('count');
      expect(typeof response.body.count).toBe('number');
    });

    it('should reject regular user from accessing all tickets', async () => {
      const response = await request(app)
        .get('/api/support/tickets/all')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('message');
    });

    it('should reject regular user from updating ticket status', async () => {
      const updateData = {
        status: 'resolved'
      };

      const response = await request(app)
        .put(`/api/support/tickets/${testTicket._id}/status`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Ticket Validation and Access Control', () => {
    it('should reject ticket creation without subject', async () => {
      const invalidTicketData = {
        description: 'Missing subject'
      };

      const response = await request(app)
        .post('/api/support/tickets')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invalidTicketData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('message');
    });

    it('should reject access to another user\'s ticket', async () => {
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

      // Try to access first user's ticket
      const response = await request(app)
        .get(`/api/support/tickets/${testTicket._id}`)
        .set('Authorization', `Bearer ${anotherToken}`);

      expect(response.status).toBe(404); // Ticket not found for this user
    });

    it('should reject adding message to non-existent ticket', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const messageData = {
        content: 'Test message'
      };

      const response = await request(app)
        .post(`/api/support/tickets/${fakeId}/messages`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(messageData);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Ticket Status Flow', () => {
    it('should complete ticket lifecycle', async () => {
      // Create new ticket
      const ticketData = {
        subject: 'Test Lifecycle',
        description: 'Testing ticket lifecycle',
        priority: 'low'
      };

      const createResponse = await request(app)
        .post('/api/support/tickets')
        .set('Authorization', `Bearer ${userToken}`)
        .send(ticketData);

      const ticketId = createResponse.body._id;

      // Admin updates to in_progress
      const progressResponse = await request(app)
        .put(`/api/support/tickets/${ticketId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'in_progress' });

      expect(progressResponse.body.status).toBe('in_progress');

      // Admin updates to resolved
      const resolveResponse = await request(app)
        .put(`/api/support/tickets/${ticketId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'resolved', comment: 'Issue resolved' });

      expect(resolveResponse.body.status).toBe('resolved');
      expect(resolveResponse.body).toHaveProperty('comment', 'Issue resolved');
    });
  });
});
