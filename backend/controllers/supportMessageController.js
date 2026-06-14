const supportMessageService = require('../services/supportMessageService');
const { emitDashboardMetricsUpdate } = require('./admin/dashboardController');
const path = require('path');
const mongoose = require('mongoose');
const SupportMessage = require('../models/supportMessage');
const { createNotification } = require('./notificationController');
const { sendAccountRequestEmail } = require('./transfer-request/providers/emailProvider');
const { uploadToGridFS } = require('../config/gridfs');

const ALLOWED_ACCOUNT_TYPES = new Set(['savings', 'checking', 'investment', 'business']);
const ALLOWED_SUPPORT_STATUSES = new Set(['open', 'in-progress', 'pending', 'approved', 'rejected', 'closed']);

const normalizeString = (value) => (typeof value === 'string' ? value.trim() : '');

const normalizeEmail = (value) => normalizeString(value).toLowerCase();

const normalizeAccountType = (value) => normalizeString(value).toLowerCase();

const isValidEmail = (value) => /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(value);

const isValidPhone = (value) => /^[0-9]{10}$/.test(value);

const isValidPassword = (value) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/.test(value);

// @desc    Create a new support message
// @route   POST /api/support
// @access  Public
const createSupportMessage = async (req, res) => {
  try {
    console.log('Received support message request');
    
    // Validate required fields
    const { name, email, subject, message } = req.body;
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ 
        message: 'Missing required fields',
        details: {
          name: !name ? 'Name is required' : null,
          email: !email ? 'Email is required' : null,
          subject: !subject ? 'Subject is required' : null,
          message: !message ? 'Message is required' : null
        }
      });
    }

    // Create the support message
    const createdMessage = await supportMessageService.createMessage({
      ...req.body,
      status: 'open'
    });

    // Create a notification for the user using the centralized function
    if (req.user?._id) {
      await createNotification(
        req.user._id,
        'info',
        `Your support message "${subject}" has been received.`
      );
    }

    console.log('Support message created successfully');
    res.status(201).json(createdMessage);
  } catch (error) {
    console.error('Error creating support message:', error);
    res.status(500).json({ message: 'Error creating support message' });
  }
};

// @desc    Get all support messages
// @route   GET /api/support
// @access  Private (Admin)
const getSupportMessages = async (req, res) => {
  try {
    const messages = await supportMessageService.getAllMessages();
    res.json(messages);
  } catch (error) {
    console.error('Error getting support messages:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get a single support message by ID
// @route   GET /api/support/:id
// @access  Private (Admin)
const getSupportMessageById = async (req, res) => {
  try {
    const message = await supportMessageService.getMessageById(req.params.id);
    if (message) {
      res.json(message);
    } else {
      res.status(404).json({ message: 'Support message not found' });
    }
  } catch (error) {
    console.error('Error getting support message:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a support message
// @route   PUT /api/support/:id
// @access  Private (Admin)
const updateSupportMessage = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        message: 'Invalid support message id',
        code: 'VALIDATION_ERROR',
        errors: { id: 'Support message id must be a valid object id' }
      });
    }

    const payload = req.body && typeof req.body === 'object' ? req.body : {};
    const allowedKeys = new Set(['status', 'adminReply', 'rejectionReason']);
    const unknownKeys = Object.keys(payload).filter((key) => !allowedKeys.has(key));
    if (unknownKeys.length > 0) {
      return res.status(400).json({
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        errors: { fields: `Unsupported fields: ${unknownKeys.join(', ')}` }
      });
    }

    const errors = {};
    const updateData = {};

    if (payload.status !== undefined) {
      const normalizedStatus = normalizeString(payload.status).toLowerCase();
      if (!ALLOWED_SUPPORT_STATUSES.has(normalizedStatus)) {
        errors.status = `Status must be one of: ${Array.from(ALLOWED_SUPPORT_STATUSES).join(', ')}`;
      } else {
        updateData.status = normalizedStatus;
      }
    }

    if (payload.adminReply !== undefined) {
      const normalizedReply = normalizeString(payload.adminReply);
      if (!normalizedReply) {
        errors.adminReply = 'adminReply cannot be empty';
      } else {
        updateData.adminReply = normalizedReply;
      }
    }

    if (payload.rejectionReason !== undefined) {
      const normalizedReason = normalizeString(payload.rejectionReason);
      if (!normalizedReason) {
        errors.rejectionReason = 'rejectionReason cannot be empty';
      } else {
        updateData.rejectionReason = normalizedReason;
      }
    }

    if (updateData.status === 'rejected' && !updateData.rejectionReason) {
      errors.rejectionReason = 'rejectionReason is required when status is rejected';
    }

    if (Object.keys(updateData).length === 0) {
      errors.payload = 'At least one updatable field is required';
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        errors
      });
    }

    if (updateData.status && ['approved', 'rejected', 'closed'].includes(updateData.status)) {
      updateData.resolvedBy = req.user?._id || null;
      updateData.resolvedAt = new Date();
    }

    const updatedMessage = await supportMessageService.updateMessage(req.params.id, updateData);
    if (updatedMessage) {
      res.json(updatedMessage);
      emitDashboardMetricsUpdate(req.app.get('io')).catch(() => {});
    } else {
      res.status(404).json({ message: 'Support message not found' });
    }
  } catch (error) {
    console.error('Error updating support message:', error);
    if (error.message && error.message.startsWith('Invalid status transition')) {
      return res.status(409).json({
        message: error.message,
        code: 'INVALID_STATUS_TRANSITION'
      });
    }
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete a support message
// @route   DELETE /api/support/:id
// @access  Private (Admin)
const deleteSupportMessage = async (req, res) => {
  try {
    const message = await supportMessageService.deleteMessage(req.params.id);
    if (message) {
      res.json({ message: 'Support message removed' });
      emitDashboardMetricsUpdate(req.app.get('io')).catch(() => {});
    } else {
      res.status(404).json({ message: 'Support message not found' });
    }
  } catch (error) {
    console.error('Error deleting support message:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete multiple support messages
// @route   DELETE /api/support
// @access  Private (Admin)
const deleteManySupportMessages = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'Please provide an array of message IDs to delete' });
    }

    const result = await supportMessageService.deleteManyMessages(ids);
    if (result.deletedCount > 0) {
      res.json({ message: `${result.deletedCount} support messages removed` });
      emitDashboardMetricsUpdate(req.app.get('io')).catch(() => {});
    } else {
      res.status(404).json({ message: 'No support messages found with the provided IDs' });
    }
  } catch (error) {
    console.error('Error deleting multiple support messages:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a guest support message
// @route   POST /api/support/guest
// @access  Public
const createGuestSupportMessage = async (req, res) => {
  try {
    const name = normalizeString(req.body?.name);
    const email = normalizeEmail(req.body?.email);
    const phone = normalizeString(req.body?.phone);
    const address = normalizeString(req.body?.address);
    const password = normalizeString(req.body?.password);
    const accountType = normalizeAccountType(req.body?.accountType);
    const subject = normalizeString(req.body?.subject) || 'New Account Opening Request';
    const message = normalizeString(req.body?.message) || 'New account opening request submitted.';
    const messageType = normalizeString(req.body?.messageType) || 'account-request';
    const idempotencyKey = normalizeString(req.get('x-idempotency-key') || req.body?.idempotencyKey);
    const userId = normalizeString(req.body?.userId); // For existing users
    const initialDeposit = parseFloat(req.body?.initialDeposit) || 0;
    const sourceAccountId = normalizeString(req.body?.sourceAccountId);

    const dobRaw = normalizeString(req.body?.dob);
    const dob = dobRaw ? new Date(dobRaw) : null;

    // Check if this is an existing user requesting an additional account
    const isExistingUser = !!userId;

    const validationErrors = {};
    if (!name || name.length < 3) validationErrors.name = 'Name is required and must be at least 3 characters';
    if (!email || !isValidEmail(email)) validationErrors.email = 'A valid email is required';
    if (!accountType || !ALLOWED_ACCOUNT_TYPES.has(accountType)) {
      validationErrors.accountType = `Account type must be one of: ${Array.from(ALLOWED_ACCOUNT_TYPES).join(', ')}`;
    }

    // For new users, require additional fields
    if (!isExistingUser) {
      if (!phone || !isValidPhone(phone)) validationErrors.phone = 'Phone number must be exactly 10 digits';
      if (!address || address.length < 5) validationErrors.address = 'Address is required and must be at least 5 characters';
      if (!password || !isValidPassword(password)) validationErrors.password = 'Password must be at least 8 characters with uppercase, lowercase, and number';
      if (!dob || Number.isNaN(dob.getTime())) {
        validationErrors.dob = 'Date of birth must be a valid date';
      }

      const imageFile = req.file;
      if (!imageFile) {
        validationErrors.image = 'Identification document image is required';
      }
      // Multer limits and fileFilter in config/gridfs.js handle the rest
    }

    if (Object.keys(validationErrors).length > 0) {
      return res.status(400).json({
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        errors: validationErrors
      });
    }

    if (idempotencyKey) {
      const existingByKey = await SupportMessage.findOne({
        messageType: 'account-request',
        email,
        'metadata.idempotencyKey': idempotencyKey
      });
      if (existingByKey) {
        return res.status(200).json(existingByKey);
      }
    }

    const duplicateWindowStart = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const existingPendingRequest = await SupportMessage.findOne({
      messageType: 'account-request',
      email,
      accountType,
      status: { $in: ['open', 'in-progress', 'pending'] },
      createdAt: { $gte: duplicateWindowStart }
    }).sort({ createdAt: -1 });
    if (existingPendingRequest) {
      return res.status(409).json({
        message: 'An account opening request is already pending for this email and account type',
        code: 'ACCOUNT_REQUEST_ALREADY_PENDING',
        existingRequestId: existingPendingRequest._id
      });
    }

    let imageUrl = null;
    const imageFile = req.file;
    if (imageFile) {
      // Upload to GridFS manually (memory storage used in multer)
      const uploadedFile = await uploadToGridFS(
        imageFile.buffer,
        imageFile.originalname,
        imageFile.mimetype
      );
      imageUrl = `/uploads/${uploadedFile.filename}`;
    }

    const supportMessage = await SupportMessage.create({
      name,
      email,
      phone: phone || undefined,
      address: address || undefined,
      dob: dob || undefined,
      password: password || undefined,
      accountType,
      image: imageUrl,
      subject,
      message,
      status: 'pending',
      messageType: messageType || 'account-request',
      user: userId || undefined, // Link to existing user if provided
      metadata: {
        phone: phone || undefined,
        address: address || undefined,
        dob: dob || undefined,
        accountType,
        identificationDocument: imageUrl,
        idempotencyKey: idempotencyKey || undefined,
        userId: userId || undefined, // Track existing user ID in metadata
        isExistingUser,
        initialDeposit,
        sourceAccountId: sourceAccountId || undefined
      }
    });

    // Invalidate dashboard cache and emit real-time update
    emitDashboardMetricsUpdate(req.app.get('io')).catch(() => {});

    // Send confirmation email to the requester
    sendAccountRequestEmail({ name, email }, accountType).catch(err => {
      console.error('Failed to send account request email:', err.message);
    });

    res.status(201).json(supportMessage);
  } catch (error) {
    console.error('Error in createGuestSupportMessage:', error);
    res.status(500).json({ message: 'Error creating support message' });
  }
};

module.exports = {
  createSupportMessage,
  getSupportMessages,
  getSupportMessageById,
  updateSupportMessage,
  deleteSupportMessage,
  deleteManySupportMessages,
  createGuestSupportMessage,
};
