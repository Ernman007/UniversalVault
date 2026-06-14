const RequestCard = require('../models/requestCard');
const Account = require('../models/account');
const Card = require('../models/card');
const mongoose = require('mongoose');
const { createNotification } = require('./notificationController');
const { invalidateByPrefix } = require('../services/cacheService');
const { emitDashboardMetricsUpdate } = require('./admin/dashboardController');

const ALLOWED_CARD_TYPES = new Set(['debit', 'credit']);

const normalizeString = (v) => (typeof v === 'string' ? v.trim().toLowerCase() : '');

const isValidObjectId = (v) =>
  typeof v === 'string' && /^[0-9a-fA-F]{24}$/.test(v);

const generateRandomNumber = (length) => {
  let result = '';
  const characters = '0123456789';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

const createCardForAccount = async (accountId, cardType, session) => {
  let retries = 0;
  while (retries < 5) {
    const cardNumber = `4${generateRandomNumber(15)}`;
    const cvv = generateRandomNumber(3);
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 3);

    try {
      const [newCard] = await Card.create(
        [
          {
            account: accountId,
            cardNumber,
            cardType,
            expiryDate,
            cvv
          }
        ],
        { session }
      );
      return newCard;
    } catch (error) {
      const duplicateKey =
        error &&
        error.code === 11000 &&
        typeof error.message === 'string' &&
        error.message.includes('cardNumber');
      if (!duplicateKey) {
        throw error;
      }
      retries += 1;
    }
  }

  throw new Error('Unable to generate unique card number');
};

// @desc    Request a new card (canonical path)
// @route   POST /api/card-requests
// @access  Private
exports.createCardRequest = async (req, res) => {
  console.log('[CARD-REQUEST] Create card request:', { accountId: req.body?.accountId, cardType: req.body?.cardType, userId: req.user?.id || req.user?._id, correlationId: req.correlationId });
  try {
    const accountIdRaw = normalizeString(req.body?.accountId);
    const cardTypeRaw = normalizeString(req.body?.cardType);
    const userId = req.user?.id || req.user?._id;

    const errors = {};
    if (!accountIdRaw || !isValidObjectId(accountIdRaw)) {
      errors.accountId = 'A valid accountId is required';
    }
    if (!cardTypeRaw || !ALLOWED_CARD_TYPES.has(cardTypeRaw)) {
      errors.cardType = `Card type must be one of: ${Array.from(ALLOWED_CARD_TYPES).join(', ')}`;
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        errors
      });
    }

    const account = await Account.findOne({ _id: accountIdRaw, user: userId });
    if (!account) {
      return res.status(404).json({
        message: 'Account not found or does not belong to the user',
        code: 'ACCOUNT_NOT_FOUND'
      });
    }

    const idempotencyKey = req.get('x-idempotency-key');
    const filterBase = {
      user: userId,
      account: accountIdRaw,
      cardType: cardTypeRaw,
      status: 'pending'
    };
    if (idempotencyKey) {
      filterBase._idempotencyKey = idempotencyKey;
    }
    const existingPending = await RequestCard.findOne(filterBase);
    if (existingPending) {
      const responseBody =
        typeof existingPending.toObject === 'function'
          ? existingPending.toObject()
          : existingPending;
      return res.status(200).json(responseBody);
    }

    const request = new RequestCard({
      user: userId,
      account: accountIdRaw,
      cardType: cardTypeRaw,
      _idempotencyKey: idempotencyKey || undefined
    });
    await request.save();
    console.log('[CARD-REQUEST] Card request created:', { requestId: request._id, userId, cardType: cardTypeRaw, correlationId: req.correlationId });

    await createNotification(
      userId,
      'info',
      `Your ${cardTypeRaw} card request has been submitted and is pending review.`
    );

    res.status(201).json({
      success: true,
      message: 'Card request created successfully',
      data: request.toObject()
    });
  } catch (error) {
    console.error('Error in createCardRequest:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// @desc    Get all pending card requests (Admin)
// @route   GET /api/card-requests/pending
// @access  Private/Admin
exports.getPendingCardRequests = async (req, res) => {
  try {
    const pendingRequests = await RequestCard.find({ status: 'pending' })
      .populate('user', 'name email')
      .populate('account', 'accountNumber accountType');

    res.json(pendingRequests.map(r => r.toObject()));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update card request status (Admin)
// @route   PUT /api/card-requests/:id
// @access  Private/Admin
exports.updateCardRequestStatus = async (req, res) => {
  console.log('[CARD-REQUEST] Update card request status:', { requestId: req.params?.id, status: req.body?.status, adminId: req.user?._id, correlationId: req.correlationId });
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: 'Invalid request id',
        code: 'VALIDATION_ERROR',
        errors: { id: 'Request id must be a valid object id' }
      });
    }

    const allowedStatuses = new Set(['approved', 'rejected', 'cancelled']);
    if (!status || !allowedStatuses.has(normalizeString(status))) {
      return res.status(400).json({
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        errors: { status: `Status must be one of: ${Array.from(allowedStatuses).join(', ')}` }
      });
    }

    const normalizedStatus = normalizeString(status);
    const request = await RequestCard.findById(id).populate('user');

    if (!request) {
      return res.status(404).json({ message: 'Card request not found', code: 'NOT_FOUND' });
    }

    let notificationMessage = '';
    let notificationType = 'info';
    let approvedCard = null;

    if (normalizedStatus === 'approved') {
      try {
        const session = await mongoose.startSession();
        try {
          await session.withTransaction(async () => {
            const requestForUpdate = await RequestCard.findById(id).session(session);
            if (!requestForUpdate) {
              throw new Error('Card request not found');
            }

            const account = await Account.findById(requestForUpdate.account).session(session);
            if (!account) {
              throw new Error('Account not found for the card request');
            }

            approvedCard = await createCardForAccount(account._id, requestForUpdate.cardType, session);
            account.cards.push(approvedCard._id);
            await account.save({ session });

            requestForUpdate.status = 'approved';
            await requestForUpdate.save({ session });
          });
        } finally {
          await session.endSession();
        }

        notificationMessage = `Your ${request.cardType} card request has been approved!`;
        notificationType = 'success';
        await createNotification(request.user._id, notificationType, notificationMessage);
        await invalidateByPrefix('admin_dashboard');
        emitDashboardMetricsUpdate(req.app.get('io')).catch(() => {});
        const io = req.app.get('io');
        if (io) {
          io.of('/notifications')
            .to(`user_${request.user._id}`)
            .emit('new_notification', {
              type: 'card_approved',
              message: notificationMessage
            });
        }

        return res.status(200).json({
          message: 'Card request status updated successfully',
          card: approvedCard
        });
      } catch (cardError) {
        console.error('Card issuance error:', cardError);
        return res.status(500).json({ message: cardError.message });
      }
    } else if (normalizedStatus === 'rejected') {
      request.status = normalizedStatus;
      await request.save();
      notificationType = 'error';
      notificationMessage = `Your card request for a ${request.cardType} card has been rejected.`;
    } else {
      request.status = normalizedStatus;
      await request.save();
      notificationMessage = `Your card request for a ${request.cardType} card has been ${normalizedStatus}.`;
    }

    if (notificationMessage) {
      await createNotification(request.user._id, notificationType, notificationMessage);
    }

    await invalidateByPrefix('admin_dashboard');
    emitDashboardMetricsUpdate(req.app.get('io')).catch(() => {});
    const io = req.app.get('io');
    if (io) {
      io.of('/notifications')
        .to(`user_${request.user._id}`)
        .emit('new_notification', {
          type: `card_${normalizedStatus}`,
          message: notificationMessage
        });
    }

    res.status(200).json({ message: 'Card request status updated successfully' });
  } catch (error) {
    console.error('Error updating card request status:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
