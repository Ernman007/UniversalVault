const supportTicketService = require('../services/supportTicketService');
const { invalidateByPrefix } = require('../services/cacheService');
const { emitDashboardMetricsUpdate } = require('./admin/dashboardController');
const logger = require('../utils/logger');
const { body, param, query } = require('express-validator');
const { validateRequest } = require('../middleware/validationMiddleware');

const buildTicketFilters = (user, query = {}) => {
  const filters = {};
  if (query.status) {
    filters.status = query.status;
  }
  if (query.category) {
    filters.category = query.category;
  }
  if (query.assignee) {
    filters.assignee = query.assignee;
  }
  if (user.role !== 'admin') {
    filters.createdBy = user._id;
  } else if (query.createdBy) {
    filters.createdBy = query.createdBy;
  }

  return filters;
};

const normalizeId = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value._id) return value._id.toString();
  if (value.equals) return value.toString();
  return value.toString();
};

const ensureTicketAccess = (ticket, user) => {
  if (!ticket) {
    return false;
  }
  if (user.role === 'admin') {
    return true;
  }
  const userId = normalizeId(user._id);
  const creatorId = normalizeId(ticket.createdBy);
  const assigneeId = normalizeId(ticket.assignee);
  return userId && (userId === creatorId || userId === assigneeId);
};

const createTicketValidators = [
  body('subject').isString().trim().isLength({ min: 3, max: 200 }).withMessage('Subject must be between 3 and 200 characters.'),
  body('description').optional().isString().trim().isLength({ max: 4000 }).withMessage('Description must be a string up to 4000 characters.'),
  body('category').isString().isIn(['account', 'card', 'loan', 'technical', 'other']).withMessage('Invalid category.'),
  body('priority').optional().isString().isIn(['low', 'medium', 'high']).withMessage('Invalid priority.'),
  body('attachments')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Attachments must be an array with up to 10 items.')
    .bail()
    .custom((attachments) => attachments.every((item) => item && typeof item.url === 'string' && typeof item.name === 'string'))
    .withMessage('Each attachment must include string url and name fields.'),
  body('metadata').optional().isObject().withMessage('Metadata must be an object.'),
  validateRequest
];

const listTicketsValidators = [
  query('status').optional().isIn(['open', 'pending', 'resolved', 'closed']).withMessage('Invalid status filter.'),
  query('category').optional().isString().trim().withMessage('Category filter must be a string.'),
  query('assignee').optional().isMongoId().withMessage('Assignee must be a valid ID.'),
  query('createdBy').optional().isMongoId().withMessage('createdBy must be a valid ID.'),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt().withMessage('Limit must be between 1 and 100.'),
  query('page').optional().isInt({ min: 1 }).toInt().withMessage('Page must be >= 1.'),
  validateRequest
];

const getTicketDetailValidators = [
  param('id').isMongoId().withMessage('Ticket id must be a valid ID.'),
  validateRequest
];

const postMessageValidators = [
  body('ticketId').isMongoId().withMessage('ticketId must be a valid ID.'),
  body('body').isString().trim().isLength({ min: 1, max: 4000 }).withMessage('Message body must be between 1 and 4000 characters.'),
  body('attachments')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Attachments must be an array with up to 10 items.')
    .bail()
    .custom((attachments) => attachments.every((item) => item && typeof item.url === 'string' && typeof item.name === 'string'))
    .withMessage('Each attachment must include string url and name fields.'),
  validateRequest
];

const getUnresolvedCountValidators = [
  query('assignee').optional().isMongoId().withMessage('Assignee must be a valid ID.'),
  query('category').optional().isString().trim().withMessage('Category must be a string.'),
  validateRequest
];

const updateTicketStatusValidators = [
  param('id').isMongoId().withMessage('Ticket id must be a valid ID.'),
  body('status').optional().isIn(['open', 'pending', 'resolved', 'closed']).withMessage('Invalid status.'),
  body('assignee').optional({ nullable: true }).custom((value) => value === null || typeof value === 'string').withMessage('Assignee must be null or a valid ID.'),
  body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('Invalid priority.'),
  body('metadata').optional().isObject().withMessage('Metadata must be an object.'),
  validateRequest
];

const createTicket = async (req, res) => {
  try {
    const { subject, description, category, priority, attachments, metadata } = req.body;
    if (!subject || !category) {
      return res.status(400).json({ message: 'Subject and category are required.' });
    }

    const ticket = await supportTicketService.createTicket({
      subject,
      description,
      category,
      priority,
      attachments,
      metadata,
      createdBy: req.user._id
    });

    res.status(201).json(ticket);

    // Invalidate dashboard cache so metrics update immediately
    invalidateByPrefix('admin_dashboard').catch(() => {});
    emitDashboardMetricsUpdate(req.app.get('io')).catch(() => {});
  } catch (error) {
    logger.error('Failed to create support ticket', { error: error.message });
    res.status(500).json({ message: 'Failed to create support ticket.' });
  }
};

const updateTicketStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, assignee, priority, metadata } = req.body;

    if (!status && assignee === undefined && !priority && !metadata) {
      return res.status(400).json({ message: 'At least one field (status, assignee, priority, metadata) must be provided.' });
    }

    const ticket = await supportTicketService.updateTicketStatus(id, {
      status,
      assignee,
      priority,
      metadata
    });

    if (!ticket) {
      return res.status(404).json({ message: 'Support ticket not found.' });
    }

    const io = req.app.get('io');
    if (io) {
      io.of('/support').to(`ticket_${id}`).emit('support_ticket_updated', {
        ticketId: id,
        status: ticket.status,
        assignee: ticket.assignee,
        priority: ticket.priority,
        metadata: ticket.metadata
      });
    }

    res.json(ticket);

    // Invalidate dashboard cache so metrics update immediately
    invalidateByPrefix('admin_dashboard').catch(() => {});
    emitDashboardMetricsUpdate(req.app.get('io')).catch(() => {});
  } catch (error) {
    logger.error('Failed to update support ticket status', { error: error.message });
    res.status(500).json({ message: 'Failed to update support ticket.' });
  }
};

const deleteTicketValidators = [
  param('id').isMongoId().withMessage('Ticket id must be a valid ID.'),
  validateRequest
];

const deleteTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const ticket = await supportTicketService.getTicketById(id);
    if (!ticket) {
      return res.status(404).json({ message: 'Support ticket not found.' });
    }

    if (!['resolved', 'closed'].includes(ticket.status)) {
      return res.status(400).json({ message: 'Only resolved or closed tickets can be deleted.' });
    }

    await supportTicketService.deleteTicket(id);
    logger.info(`[SupportTicketController] Ticket ${id} deleted by admin ${req.user._id}`);

    invalidateByPrefix('admin_dashboard').catch(() => {});
    emitDashboardMetricsUpdate(req.app.get('io')).catch(() => {});

    res.json({ message: 'Ticket deleted successfully.' });
  } catch (error) {
    logger.error('Failed to delete support ticket', { error: error.message });
    res.status(500).json({ message: 'Failed to delete support ticket.' });
  }
};

const listTickets = async (req, res) => {
  try {
    const { limit, page } = req.query;
    const filters = buildTicketFilters(req.user, req.query);
    logger.info(`[SupportTicketController] Fetching tickets for user ${req.user._id} with filters:`, filters);
    const result = await supportTicketService.listTickets({ ...filters, limit, page });
    logger.info(`[SupportTicketController] Fetched tickets:`, { 
      isArray: Array.isArray(result), 
      keys: result ? Object.keys(result) : null,
      ticketsLength: Array.isArray(result) ? result.length : (result?.tickets?.length || 0)
    });
    res.json(result);
  } catch (error) {
    logger.error('Failed to list support tickets', { error: error.message });
    res.status(500).json({ message: 'Failed to list support tickets.' });
  }
};

const getTicketDetail = async (req, res) => {
  try {
    logger.info(`[SupportTicketController] getTicketDetail called for ID: ${req.params.id} by User: ${req.user._id}`);
    const ticket = await supportTicketService.getTicketById(req.params.id);
    if (!ensureTicketAccess(ticket, req.user)) {
      return res.status(404).json({ message: 'Support ticket not found.' });
    }

    const messages = await supportTicketService.getMessagesForTicket(req.params.id);
    res.json({ ticket, messages });
  } catch (error) {
    logger.error('Failed to retrieve support ticket detail', { error: error.message });
    res.status(500).json({ message: 'Failed to retrieve support ticket.' });
  }
};

const postMessage = async (req, res) => {
  try {
    const { ticketId, body, attachments } = req.body;
    if (!ticketId || !body) {
      return res.status(400).json({ message: 'ticketId and body are required.' });
    }

    const ticket = await supportTicketService.getTicketById(ticketId);
    if (!ensureTicketAccess(ticket, req.user)) {
      return res.status(404).json({ message: 'Support ticket not found.' });
    }

    const senderRole = req.user.role === 'admin' ? 'agent' : 'user';
    const message = await supportTicketService.addMessage({
      ticketId,
      sender: req.user._id,
      senderRole,
      body,
      attachments
    });

    if (!message) {
      return res.status(500).json({ message: 'Failed to append message to ticket.' });
    }

    const io = req.app.get('io');
    if (io) {
      io.of('/support').to(`ticket_${ticketId}`).emit('support_message', {
        ticketId,
        message: {
          _id: message._id,
          body: message.body,
          sender: {
            _id: req.user._id,
            name: req.user.name,
            role: req.user.role
          },
          attachments: message.attachments,
          createdAt: message.createdAt
        }
      });
    }

    const { createNotification } = require('./notificationController');
    let recipientId = null;
    if (senderRole === 'agent') {
      recipientId = ticket.createdBy._id;
    } else if (ticket.assignee) {
      recipientId = ticket.assignee._id;
    }

    if (recipientId) {
      const messageText = senderRole === 'agent'
        ? `New reply on your support ticket "${ticket.subject}"`
        : `New reply on support ticket "${ticket.subject}" assigned to you`;
      await createNotification(recipientId, 'info', messageText);
    }

    res.status(201).json(message);
    emitDashboardMetricsUpdate(req.app.get('io')).catch(() => {});
  } catch (error) {
    logger.error('Failed to append support ticket message', { error: error.message });
    res.status(500).json({ message: 'Failed to append support ticket message.' });
  }
};

const getUnresolvedCount = async (req, res) => {
  try {
    const filters = {};
    if (req.query.assignee) {
      filters.assignee = req.query.assignee;
    }
    if (req.query.category) {
      filters.category = req.query.category;
    }

    const count = await supportTicketService.getUnresolvedCount(filters);
    res.json({ count });
  } catch (error) {
    logger.error('Failed to retrieve unresolved ticket count', { error: error.message });
    res.status(500).json({ message: 'Failed to retrieve unresolved ticket count.' });
  }
};

module.exports = {
  createTicket,
  listTickets,
  getTicketDetail,
  postMessage,
  getUnresolvedCount,
  updateTicketStatus,
  deleteTicket,
  createTicketValidators,
  listTicketsValidators,
  getTicketDetailValidators,
  postMessageValidators,
  getUnresolvedCountValidators,
  updateTicketStatusValidators,
  deleteTicketValidators
};
