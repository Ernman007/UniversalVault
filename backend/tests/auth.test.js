const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const { app } = require('../app');
const User = require('../models/user');

jest.mock('jsonwebtoken');

describe('Auth API', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('POST /api/auth/login', () => {
    it('should return 401 when user is not found', async () => {
      // Mock User.findOne with select method and populate
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue(null)
      };
      jest.spyOn(User, 'findOne').mockReturnValue(mockQuery);

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'missing@example.com', password: 'secret123' });

      expect(User.findOne).toHaveBeenCalledWith({
        email: { $regex: /^missing@example\.com$/i }
      });
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message');
    });

    it('should return 200 and token on successful login', async () => {
      const mockUser = new User({
        _id: new mongoose.Types.ObjectId(),
        name: 'Jane Tester',
        email: 'tester@example.com',
        role: 'user',
        password: 'hashedPassword',
        accounts: []
      });

      // Mock User.findOne with select method and populate
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue(mockUser)
      };
      jest.spyOn(User, 'findOne').mockReturnValue(mockQuery);
      
      // Mock the matchPassword method on the user instance
      mockUser.matchPassword = jest.fn().mockResolvedValue(true);
      
      jwt.sign.mockReturnValue('mock.jwt.token');

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'tester@example.com', password: 'secret123' });

      expect(mockUser.matchPassword).toHaveBeenCalledWith('secret123');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token', 'mock.jwt.token');
      expect(response.body).toHaveProperty('user');
    });
  });

  describe('GET /api/auth/logout', () => {
    it('should return success message on logout', async () => {
      const response = await request(app).get('/api/auth/logout');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should return 404 when user does not exist', async () => {
      jest.spyOn(User, 'findOne').mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'ghost@example.com' });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('message');
    });

    it('should return 200 when user exists', async () => {
      const mockUser = new User({
        _id: new mongoose.Types.ObjectId(),
        email: 'existing@example.com'
      });
      
      mockUser.createPasswordResetToken = jest.fn().mockReturnValue('reset-token');
      jest.spyOn(User, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(mockUser, 'save').mockResolvedValue();

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'existing@example.com' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
    });
  });
});
