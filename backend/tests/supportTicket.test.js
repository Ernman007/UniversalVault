const request = require('supertest');
const { app } = require('../app');

// Mock auth middleware to bypass authentication in tests
jest.mock('../middleware/authMiddleware', () => ({
  protect: (req, res, next) => {
    req.user = { _id: '507f1f77bcf86cd799439011', role: 'user', email: 'test@example.com' };
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

// Mock controller handlers to avoid DB calls
jest.mock('../controllers/supportTicketController', () => ({
  createTicket: (req, res) => res.status(201).json({ 
    id: 'ticket_1', 
    createdBy: req.user._id,
    subject: req.body.subject,
    status: 'open'
  }),
  listTickets: (req, res) => res.json({
    tickets: [
      { id: 'ticket_1', createdBy: req.user._id, subject: 'Test Ticket', status: 'open' }
    ],
    totalPages: 1,
    currentPage: 1,
    total: 1
  }),
  getTicketDetail: (req, res) => res.json({ 
    ticket: {
      id: req.params.id, 
      createdBy: req.user._id,
      subject: 'Test Ticket',
      status: 'open'
    },
    messages: []
  }),
  updateTicketStatus: (req, res) => res.json({ 
    id: req.params.id, 
    status: req.body.status 
  }),
  postMessage: (req, res) => res.status(201).json({ 
    id: 'msg_1', 
    ticketId: req.body.ticketId,
    body: req.body.body,
    sender: req.user._id
  }),
  getUnresolvedCount: (req, res) => res.json({ count: 5 })
}));

describe('Support Ticket API', () => {
  describe('User endpoints', () => {
    it('POST /api/support/tickets should create ticket', async () => {
      const payload = { subject: 'Help needed', description: 'I need assistance' };
      const res = await request(app).post('/api/support/tickets').send(payload);
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.subject).toBe(payload.subject);
    });

    it('GET /api/support/tickets should list user tickets', async () => {
      const res = await request(app).get('/api/support/tickets');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('tickets');
      expect(Array.isArray(res.body.tickets)).toBe(true);
    });

    it('GET /api/support/tickets/:id should get ticket by id', async () => {
      const res = await request(app).get('/api/support/tickets/ticket_123');
      expect(res.status).toBe(200);
      expect(res.body.ticket).toHaveProperty('id', 'ticket_123');
    });

    it('POST /api/support/messages should add message', async () => {
      const payload = { ticketId: 'ticket_123', body: 'This is a test message' };
      const res = await request(app).post('/api/support/messages').send(payload);
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('ticketId', 'ticket_123');
      expect(res.body).toHaveProperty('body', payload.body);
    });

    it('GET /api/support/tickets/:id should get ticket with messages', async () => {
      const res = await request(app).get('/api/support/tickets/ticket_123');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('ticket');
      expect(res.body).toHaveProperty('messages');
      expect(Array.isArray(res.body.messages)).toBe(true);
    });
  });

  describe('Admin endpoints', () => {
    // Override user role to admin for these tests
    beforeEach(() => {
      jest.mock('../middleware/authMiddleware', () => ({
        protect: (req, res, next) => {
          req.user = { _id: '507f1f77bcf86cd799439011', role: 'admin', email: 'admin@example.com' };
          next();
        },
        admin: (req, res, next) => {
          if (req.user && req.user.role === 'admin') {
            next();
          } else {
            res.status(403).json({ message: 'Admin access required' });
          }
        }
      }), { virtual: true });
    });

    it('GET /api/support/tickets should list all tickets for admin', async () => {
      const res = await request(app).get('/api/support/tickets');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('tickets');
      expect(Array.isArray(res.body.tickets)).toBe(true);
    });

    it('GET /api/support/tickets/unresolved/count should get count', async () => {
      const res = await request(app).get('/api/support/tickets/unresolved/count');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('count');
    });

    it('PUT /api/support/tickets/:id should update ticket', async () => {
      const payload = { status: 'resolved' };
      const res = await request(app).put('/api/support/tickets/ticket_123').send(payload);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', payload.status);
    });
  });
});
