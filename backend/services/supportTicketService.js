const SupportTicket = require('../models/supportTicket');
const SupportTicketMessage = require('../models/supportTicketMessage');
const { getUnresolvedCountCached, invalidateUnresolvedCount } = require('./supportTicketCacheService');

const createTicket = async ({ subject, description, category, priority, createdBy, attachments = [], metadata = {} }) => {
  const ticket = await SupportTicket.create({
    subject,
    description,
    category,
    priority,
    createdBy,
    attachments,
    metadata,
    status: 'open',
    lastResponseAt: new Date()
  });

  await invalidateUnresolvedCount();
  return ticket;
};

const getTicketById = async (id) =>
  SupportTicket.findById(id)
    .populate('createdBy', 'name email role')
    .populate('assignee', 'name email role');

const listTickets = async ({ status, category, createdBy, assignee, limit = 20, page = 1 }) => {
  const query = {};
  if (status) {
    query.status = status;
  }
  if (category) {
    query.category = category;
  }
  if (createdBy) {
    query.createdBy = createdBy;
  }
  if (assignee) {
    query.assignee = assignee;
  }

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    SupportTicket.find(query)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('createdBy', 'name email role')
      .populate('assignee', 'name email role'),
    SupportTicket.countDocuments(query)
  ]);

  const normalizedPage = Number(page);
  const normalizedLimit = Number(limit);
  const totalPages = Math.ceil(total / normalizedLimit) || 1;
  const result = {
    tickets: items,
    items,
    total,
    page: normalizedPage,
    pages: totalPages,
    meta: {
      total,
      page: normalizedPage,
      limit: normalizedLimit,
      totalPages
    }
  };
  console.log(`[supportTicketService] listTickets returning ${items.length} items out of ${total} total.`);
  return result;
};

const updateTicketStatus = async (id, { status, assignee, priority, metadata }) => {
  const ticket = await SupportTicket.findById(id);
  if (!ticket) {
    return null;
  }

  if (status) {
    ticket.status = status;
  }
  if (assignee !== undefined) {
    ticket.assignee = assignee;
  }
  if (priority) {
    ticket.priority = priority;
  }
  if (metadata) {
    ticket.metadata = { ...ticket.metadata, ...metadata };
  }

  ticket.lastResponseAt = new Date();
  await ticket.save();

  await invalidateUnresolvedCount();
  return ticket;
};

const addMessage = async ({ ticketId, sender, senderRole, body, attachments = [] }) => {
  const ticket = await SupportTicket.findById(ticketId);
  if (!ticket) {
    return null;
  }

  const message = await SupportTicketMessage.create({
    ticket: ticketId,
    sender,
    senderRole,
    body,
    attachments
  });

  ticket.lastResponseAt = message.createdAt;
  if (senderRole === 'agent' && ticket.status === 'open') {
    ticket.status = 'pending';
  }
  await ticket.save();

  return message;
};

const getMessagesForTicket = async (ticketId) =>
  SupportTicketMessage.find({ ticket: ticketId })
    .sort({ createdAt: 1 })
    .populate('sender', 'name email role');

const getUnresolvedCount = async (filters = {}) => getUnresolvedCountCached(filters);

const deleteTicket = async (id) => {
  await SupportTicketMessage.deleteMany({ ticket: id });
  await SupportTicket.findByIdAndDelete(id);
  await invalidateUnresolvedCount();
};

module.exports = {
  createTicket,
  getTicketById,
  listTickets,
  updateTicketStatus,
  addMessage,
  getMessagesForTicket,
  getUnresolvedCount,
  deleteTicket
};
