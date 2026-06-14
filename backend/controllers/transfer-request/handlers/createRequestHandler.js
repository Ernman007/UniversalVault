const { createRequest } = require('../services/transferRequestService');
const { sendVerificationEmail } = require('../providers/emailProvider');
const { logActivity } = require('../../../services/activityLogService');
const { emitDashboardMetricsUpdate } = require('../../admin/dashboardController');

// @desc    Create transfer request and send verification code
// @route   POST /api/transfer-requests
// @access  Private
exports.createRequest = async (req, res) => {
  console.log('[TRANSFER-REQUEST] Create transfer request:', { fromAccountId: req.body?.fromAccountId, toAccount: req.body?.toAccount, amount: req.body?.amount, userId: req.user?._id, correlationId: req.correlationId });
  try {
    const { fromAccountId, toAccount, amount, description, bankName, accountHolderName, idempotencyKey } = req.body;
    const headerIdempotencyKey = req.headers['idempotency-key'];
    const requestIdempotencyKey =
      idempotencyKey || (Array.isArray(headerIdempotencyKey) ? headerIdempotencyKey[0] : headerIdempotencyKey);
    
    if (!fromAccountId || !toAccount || !amount) {
      return res.status(400).json({ 
        message: 'Missing required fields',
        details: {
          fromAccountId: !fromAccountId ? 'From account is required' : null,
          toAccount: !toAccount ? 'To account is required' : null,
          amount: !amount ? 'Amount is required' : null
        }
      });
    }

    const { transferRequest, fromAccount, duplicate } = await createRequest({
      fromAccountId,
      toAccount,
      amount,
      description,
      bankName,
      accountHolderName,
      userId: req.user._id,
      idempotencyKey: requestIdempotencyKey
    });

    if (duplicate) {
      return res.status(200).json({
        message: 'Transfer request already exists (idempotent replay)',
        requestId: transferRequest._id,
        status: transferRequest.status,
        duplicate: true
      });
    }

    console.log('[TRANSFER-REQUEST] Transfer request created:', { requestId: transferRequest._id, status: transferRequest.status, correlationId: req.correlationId });

    // If the transfer is already approved (internal own-account), skip the email verification
    if (transferRequest.status !== 'approved') {
      try {
        // Send email with code
        const userEmail = req.user.email;
        console.log('Sending email to:', userEmail);
        
        await sendVerificationEmail(userEmail, transferRequest);
        console.log('Verification email sent successfully');
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
        // Continue with the process even if email fails
      }
    } else {
      console.log('[TRANSFER-REQUEST] Skipping verification email for pre-approved transfer');
    }

    await logActivity({
      userId: req.user._id,
      action: 'Requested Transfer',
      metadata: { transferRequest: transferRequest._id }
    });

    // Real-time update for admin dashboard
    emitDashboardMetricsUpdate(req.app.get('io'));

    res.status(201).json({
      success: true,
      message: 'Transfer request created successfully',
      data: {
        requestId: transferRequest._id,
        code: transferRequest.code,
        status: transferRequest.status
      }
    });
  } catch (error) {
    console.error('Transfer request error:', error);
    res.status(500).json({ 
      message: 'Error creating transfer request', 
      error: error.message,
      details: error.errors // Include validation errors if any
    });
  }
};
