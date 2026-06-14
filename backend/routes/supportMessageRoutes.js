const express = require('express');

const router = express.Router();
const { upload } = require('../config/gridfs');
const fs = require('fs');
const path = require('path');
const rateLimit = require('express-rate-limit');
const {
  createSupportMessage,
  getSupportMessages,
  getSupportMessageById,
  updateSupportMessage,
  deleteSupportMessage,
  deleteManySupportMessages,
  createGuestSupportMessage,
} = require('../controllers/supportMessageController');
const supportTicketController = require('../controllers/supportTicketController');
const { admin } = require('../middleware/adminMiddleware');
const { protect } = require('../middleware/authMiddleware');

const adminSupportLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: 'Too many admin support actions, please slow down.',
  standardHeaders: true,
  legacyHeaders: false
});

// Local file upload configuration removed in favor of GridFS for production persistence
// router.use(fileUpload({ ... }));

// Guest route for account opening requests - uses GridFS for ID document uploads
router.post('/guest', upload.single('image'), createGuestSupportMessage);

// ──────────────────────────────────────────────────────────────────────────────
// TICKET ROUTES — must be defined BEFORE the generic /:id message routes,
// otherwise Express treats "tickets" as a message ID and hits admin middleware.
// ──────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/support/tickets:
 *   post:
 *     summary: Create a new support ticket
 *     tags: [Support Tickets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [subject, category]
 *             properties:
 *               subject:
 *                 type: string
 *                 example: Unable to access my account
 *               description:
 *                 type: string
 *                 example: I receive an error when trying to login from the mobile app.
 *               category:
 *                 type: string
 *                 enum: [account, card, loan, technical, other]
 *                 example: technical
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high]
 *                 example: high
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     url:
 *                       type: string
 *                       example: https://cdn.example.com/uploads/screenshot.png
 *                     name:
 *                       type: string
 *                       example: screenshot.png
 *     responses:
 *       201:
 *         description: Support ticket created
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */
router.post('/tickets', protect, supportTicketController.createTicketValidators, (req, res) => {
  supportTicketController.createTicket(req, res);
});

/**
 * @swagger
 * /api/support/tickets:
 *   get:
 *     summary: List support tickets for the current user or all tickets for admins
 *     tags: [Support Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [open, pending, resolved]
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *     responses:
 *       200:
 *         description: List of support tickets
 *       401:
 *         description: Unauthorized
 */
router.get('/tickets', protect, supportTicketController.listTicketsValidators, supportTicketController.listTickets);

/**
 * @swagger
 * /api/support/tickets/unresolved/count:
 *   get:
 *     summary: Get cached unresolved ticket count (admin)
 *     tags: [Support Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: assignee
 *         schema:
 *           type: string
 *           format: objectId
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Count of unresolved tickets
 *       401:
 *         description: Unauthorized
 */
router.get('/tickets/unresolved/count', protect, admin, adminSupportLimiter, supportTicketController.getUnresolvedCountValidators, supportTicketController.getUnresolvedCount);

/**
 * @swagger
 * /api/support/tickets/{id}:
 *   get:
 *     summary: Get support ticket details with transcript
 *     tags: [Support Tickets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: objectId
 *     responses:
 *       200:
 *         description: Ticket detail
 *       404:
 *         description: Ticket not found
 */
router.get('/tickets/:id', protect, supportTicketController.getTicketDetailValidators, supportTicketController.getTicketDetail);

router.put('/tickets/:id', protect, admin, adminSupportLimiter, supportTicketController.updateTicketStatusValidators, supportTicketController.updateTicketStatus);
router.delete('/tickets/:id', protect, admin, adminSupportLimiter, supportTicketController.deleteTicketValidators, supportTicketController.deleteTicket);

/**
 * @swagger
 * /api/support/messages:
 *   post:
 *     summary: Append a message to an existing support ticket
 *     tags: [Support Tickets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ticketId, body]
 *             properties:
 *               ticketId:
 *                 type: string
 *                 format: objectId
 *               body:
 *                 type: string
 *                 example: We are looking into your issue and will update you shortly.
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     url:
 *                       type: string
 *                     name:
 *                       type: string
 *     responses:
 *       201:
 *         description: Message appended
 *       404:
 *         description: Ticket not found or not accessible
 */
router.post('/messages', protect, supportTicketController.postMessageValidators, supportTicketController.postMessage);

// ──────────────────────────────────────────────────────────────────────────────
// LEGACY SUPPORT MESSAGE ROUTES — generic /:id comes LAST to avoid conflicts.
// ──────────────────────────────────────────────────────────────────────────────

// Public route for creating a support message
router.route('/').post(protect, createSupportMessage);

// Admin private routes
router.route('/')
  .get(protect, admin, getSupportMessages) // Get all messages
  .delete(protect, admin, deleteManySupportMessages); // Delete multiple messages

router.route('/:id')
  .get(protect, admin, getSupportMessageById) // Get single message by ID
  .put(protect, admin, updateSupportMessage) // Update message by ID
  .delete(protect, admin, deleteSupportMessage); // Delete single message by ID

// Local uploads route removed. Handled centrally in app.js via GridFS.

module.exports = router;
