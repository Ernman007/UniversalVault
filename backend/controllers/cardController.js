const Card = require('../models/card');
const Account = require('../models/account');
const Transaction = require('../models/transaction');
const CardTransaction = require('../models/cardTransaction');
const RequestCard = require('../models/requestCard');
const { createNotification } = require('./notificationController');
const { logActivity } = require('../services/activityLogService');

const normalizeCardType = (cardType) => (
  typeof cardType === 'string' ? cardType.trim().toLowerCase() : ''
);

const isCreditCardType = (cardType) => normalizeCardType(cardType) === 'credit';

// Get all cards associated with a specific account
exports.getCardsByAccountId = async (req, res) => {
  try {
    const accountId = req.params.accountId;
    const account = await Account.findById(accountId).select('user');
    if (!account) {
      return res.status(404).json({ message: 'Account not found.' });
    }
    if (req.user.role !== 'admin' && account.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const cards = await Card.find({ account: accountId }).populate('transactionHistory');
    res.status(200).json(cards);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all cards (admin only)
exports.getAllCards = async (req, res) => {
  try {
    const cards = await Card.find()
      .populate('account', 'accountNumber type user accountHolderName')
      .populate({
        path: 'account',
        populate: { path: 'user', select: 'firstName lastName email name' }
      });
    
    console.log('[getAllCards] Found cards count:', cards.length);
    
    // Map cards to include user info for display
    const cardsWithUserInfo = cards.map(card => {
      const cardObj = card.toObject ? card.toObject() : card;
      const user = card.account?.user;
      const accountHolderName = card.account?.accountHolderName;
      
      // Debug log for each card
      console.log('[getAllCards] Card:', card._id, 'account:', card.account?._id, 'user:', user?._id, {
        name: user?.name,
        firstName: user?.firstName,
        lastName: user?.lastName,
        email: user?.email,
        accountHolderName: accountHolderName
      });
      
      // Fallback: use user.name, then firstName+lastName, then accountHolderName, then 'Unknown'
      let userName = 'Unknown';
      if (user?.name) {
        userName = user.name;
      } else if (user?.firstName || user?.lastName) {
        userName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      } else if (accountHolderName) {
        userName = accountHolderName;
      }
      
      return {
        ...cardObj,
        userName,
        userEmail: user?.email || ''
      };
    });
    
    res.status(200).json(cardsWithUserInfo);
  } catch (error) {
    console.error('[getAllCards] Error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Search cards by card number, holder name, or account number (admin only)
exports.searchCards = async (req, res) => {
  try {
    const { q } = req.query;
    console.log('[searchCards] Search query:', q);
    
    if (!q || q.trim().length < 2) {
      return res.status(200).json([]);
    }
    
    const searchTerm = q.trim();
    
    // Find accounts with matching user name or account number
    const Account = require('../models/account');
    const User = require('../models/user');
    
    // Find users matching name or email
    const users = await User.find({
      $or: [
        { name: { $regex: searchTerm, $options: 'i' } },
        { email: { $regex: searchTerm, $options: 'i' } },
        { firstName: { $regex: searchTerm, $options: 'i' } },
        { lastName: { $regex: searchTerm, $options: 'i' } }
      ]
    }).select('_id');
    
    const userIds = users.map(u => u._id);
    console.log('[searchCards] Found matching users:', userIds.length);
    
    // Find accounts for these users or matching account number
    const accounts = await Account.find({
      $or: [
        { user: { $in: userIds } },
        { accountNumber: { $regex: searchTerm, $options: 'i' } }
      ]
    }).select('_id');
    
    const accountIds = accounts.map(a => a._id);
    console.log('[searchCards] Found matching accounts:', accountIds.length);
    
    // Find cards matching card number or belonging to found accounts
    const cards = await Card.find({
      $or: [
        { cardNumber: { $regex: searchTerm, $options: 'i' } },
        { account: { $in: accountIds } }
      ]
    })
      .populate('account', 'accountNumber type user accountHolderName')
      .populate({
        path: 'account',
        populate: { path: 'user', select: 'firstName lastName email name' }
      });
    
    console.log('[searchCards] Found cards:', cards.length);
    
    // Map cards to include user info for display
    const cardsWithUserInfo = cards.map(card => {
      const cardObj = card.toObject ? card.toObject() : card;
      const user = card.account?.user;
      const accountHolderName = card.account?.accountHolderName;
      
      // Debug log for each card
      console.log('[searchCards] Card:', card._id, 'account:', card.account?._id, 'user:', user?._id, {
        name: user?.name,
        firstName: user?.firstName,
        lastName: user?.lastName,
        email: user?.email,
        accountHolderName: accountHolderName
      });
      
      // Fallback: use user.name, then firstName+lastName, then accountHolderName, then 'Unknown'
      let userName = 'Unknown';
      if (user?.name) {
        userName = user.name;
      } else if (user?.firstName || user?.lastName) {
        userName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      } else if (accountHolderName) {
        userName = accountHolderName;
      }
      
      return {
        ...cardObj,
        userName,
        userEmail: user?.email || ''
      };
    });
    
    res.status(200).json(cardsWithUserInfo);
  } catch (error) {
    console.error('[searchCards] Error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Shim for legacy POST /api/cards/request — routes to admin-reviewed RequestCard flow.
// Logs deprecation telemetry and returns guidance payload.
// To be removed after all clients migrate to POST /api/card-requests.
exports.requestCardShim = async (req, res) => {
  try {
    const { accountNumber, IBAN, cardType } = req.body;
    const userId = req.user?.id || req.user?._id;

    if ((!accountNumber && !IBAN) || !cardType) {
      return res.status(400).json({
        message: 'Either Account Number or IBAN, and card type are required.',
        legacy: true,
        deprecation: {
          route: '/api/cards/request',
          replacement: '/api/card-requests',
          migration: 'Send { accountId, cardType } to /api/card-requests'
        }
      });
    }

    let account;
    if (accountNumber) {
      account = await Account.findOne({ accountNumber }).populate('user');
    } else if (IBAN) {
      account = await Account.findOne({ IBAN }).populate('user');
    }

    if (!account) {
      return res.status(404).json({
        message: 'Account not found with the provided Account Number or IBAN.',
        legacy: true,
        deprecation: { route: '/api/cards/request', replacement: '/api/card-requests' }
      });
    }

    if (account.user?._id?.toString() !== userId && account.user?.toString() !== userId) {
      return res.status(403).json({
        message: 'You do not own this account.',
        legacy: true,
        deprecation: { route: '/api/cards/request', replacement: '/api/card-requests' }
      });
    }

    const normalizedType = typeof cardType === 'string' ? cardType.trim().toLowerCase() : '';
    if (!['debit', 'credit'].includes(normalizedType)) {
      return res.status(400).json({
        message: 'Card type must be debit or credit.',
        legacy: true,
        deprecation: { route: '/api/cards/request', replacement: '/api/card-requests' }
      });
    }

    const existingPending = await RequestCard.findOne({
      user: userId,
      account: account._id,
      cardType: normalizedType,
      status: 'pending',
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });
    if (existingPending) {
      return res.status(200).json({
        ...existingPending.toObject(),
        legacy: true,
        deprecation: {
          route: '/api/cards/request',
          replacement: '/api/card-requests',
          note: 'Duplicate pending request returned (idempotent)'
        }
      });
    }

    const request = await RequestCard.create({
      user: userId,
      account: account._id,
      cardType: normalizedType
    });

    await createNotification(userId, 'info', `Your ${normalizedType} card request has been submitted and is pending review.`);

    res.status(202).json({
      message: 'Request accepted and queued for verification.',
      requestId: request._id,
      legacy: true,
      deprecation: {
        route: '/api/cards/request',
        replacement: '/api/card-requests',
        migration: 'Please update your client to POST /api/card-requests directly.'
      }
    });
  } catch (error) {
    console.error('Error in requestCardShim:', error);
    res.status(500).json({
      message: 'Internal server error',
      legacy: true,
      deprecation: { route: '/api/cards/request', replacement: '/api/card-requests' }
    });
  }
};

// Request a new card for a user/account
exports.requestNewCard = async (req, res, skipResponse = false) => {
  try {
    const { accountNumber, IBAN, cardType } = req.body;
    const normalizedType = normalizeCardType(cardType);

    // Basic validation
    if ((!accountNumber && !IBAN) || !cardType) {
      if (!skipResponse) {
        return res.status(400).json({ message: 'Either Account Number or IBAN, and card type are required.' });
      }
      throw new Error('Either Account Number or IBAN, and card type are required.');
    }
    if (!['debit', 'credit'].includes(normalizedType)) {
      if (!skipResponse) {
        return res.status(400).json({ message: 'Card type must be debit or credit.' });
      }
      throw new Error('Card type must be debit or credit.');
    }

    // Find the account by account number or IBAN
    let account;
    if (accountNumber) {
      account = await Account.findOne({ accountNumber }).populate('user');
    } else if (IBAN) {
      account = await Account.findOne({ IBAN }).populate('user');
    }

    if (!account) {
      if (!skipResponse) {
        return res.status(404).json({ message: 'Account not found with the provided Account Number or IBAN.' });
      }
      throw new Error('Account not found with the provided Account Number or IBAN.');
    }
    if (req.user.role !== 'admin') {
      const ownerId = account.user?._id ? account.user._id.toString() : account.user?.toString();
      if (ownerId !== req.user._id.toString()) {
        if (!skipResponse) {
          return res.status(403).json({ message: 'Forbidden' });
        }
        throw new Error('Forbidden');
      }
    }

    // Generate unique card number and CVV (simplified for now)
    const generateRandomNumber = (length) => {
      let result = '';
      const characters = '0123456789';
      for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      return result;
    };
    const cardNumber = '4' + generateRandomNumber(15);
    const cvv = generateRandomNumber(3);

    // Calculate expiry date (e.g., 3 years from now)
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 3);

    const newCard = new Card({
      account: account._id,
      cardNumber,
      cardType: normalizedType,
      expiryDate,
      cvv,
    });

    await newCard.save();

    account.cards.push(newCard._id);
    await account.save();

    // Create a notification for the user whose card was created
    await createNotification(
      account.user._id,
      'success',
      `Your new ${normalizedType} card has been requested successfully.`
    );

    if (!skipResponse) {
      res.status(201).json(newCard);
    }
    
    return newCard;
  } catch (error) {
    console.error('Error in requestNewCard:', error);
    if (!skipResponse) {
      res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
    throw error;
  }
};

// Freeze or unfreeze a specific card
exports.toggleFreezeCard = async (req, res) => {
  try {
    const cardId = req.params.cardId;
    const { isFrozen } = req.body;

    if (typeof isFrozen !== 'boolean') {
      return res.status(400).json({ message: 'isFrozen must be a boolean value.' });
    }

    const card = await Card.findById(cardId).populate({
      path: 'account',
      populate: { path: 'user' }
    });

    if (!card) {
      return res.status(404).json({ message: 'Card not found.' });
    }
    const ownerAccount = await Account.findById(card.account).select('user');
    if (!ownerAccount) {
      return res.status(404).json({ message: 'Account not found.' });
    }
    if (req.user.role !== 'admin' && ownerAccount.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    card.isFrozen = isFrozen;
    await card.save();

    // Create a notification for the user whose card was frozen/unfrozen
    await createNotification(
      card.account.user._id,
      isFrozen ? 'warning' : 'success',
      `Your card (${card.cardNumber.slice(-4)}) has been ${isFrozen ? 'frozen' : 'unfrozen'}.`
    );

    // Log activity for audit trail
    await logActivity({
      userId: card.account.user._id,
      action: isFrozen ? 'Card Frozen' : 'Card Unfrozen',
      metadata: {
        cardId: card._id,
        cardLastFour: card.cardNumber.slice(-4)
      },
      correlationId: req.correlationId
    });

    res.status(200).json(card);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update card settings (e.g., limits)
exports.updateCardSettings = async (req, res) => {
  try {
    const cardId = req.params.cardId;
    const { dailyLimit } = req.body; // Add other settings as needed
    const card = await Card.findById(cardId);
    if (!card) {
      return res.status(404).json({ message: 'Card not found.' });
    }
    const ownerAccount = await Account.findById(card.account).select('user');
    if (!ownerAccount) {
      return res.status(404).json({ message: 'Account not found.' });
    }
    if (req.user.role !== 'admin' && ownerAccount.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    card.dailyLimit = dailyLimit;
    await card.save();

    // Log activity for audit trail
    const cardAccount = await Account.findById(card.account).populate('user');
    if (cardAccount && cardAccount.user) {
      await logActivity({
        userId: cardAccount.user._id,
        action: 'Update Card Settings',
        metadata: {
          cardId: card._id,
          dailyLimit: card.dailyLimit
        },
        correlationId: req.correlationId
      });
    }

    res.status(200).json(card);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get transaction history for a specific card
exports.getCardTransactions = async (req, res) => {
  try {
    const cardId = req.params.cardId;
    const card = await Card.findById(cardId).select('account');
    if (!card) {
      return res.status(404).json({ message: 'Card not found.' });
    }
    const ownerAccount = await Account.findById(card.account).select('user');
    if (!ownerAccount) {
      return res.status(404).json({ message: 'Account not found.' });
    }
    if (req.user.role !== 'admin' && ownerAccount.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    // Assuming transactions have a reference to the card used
    const transactions = await CardTransaction.find({ card: cardId }).populate('card'); 
    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createCardTransaction = async (req, res) => {
  try {
    const {
      cardId,
      accountId,
      amount,
      merchantDetails,
      transactionType,
      date
    } = req.body;

    if (!cardId || !accountId || !amount || !merchantDetails || !transactionType) {
      return res.status(400).json({ message: 'cardId, accountId, amount, merchantDetails, and transactionType are required' });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required', code: 'ADMIN_REQUIRED' });
    }

    const card = await Card.findById(cardId);
    if (!card) {
      return res.status(404).json({ message: 'Card not found' });
    }

    const account = await Account.findById(accountId);
    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }

    const transaction = await CardTransaction.create({
      card: cardId,
      account: accountId,
      amount,
      merchantDetails,
      transactionType,
      date: date ? new Date(date) : new Date()
    });

    card.transactionHistory = card.transactionHistory || [];
    card.transactionHistory.push(transaction._id);
    await card.save();

    account.transactions = account.transactions || [];
    account.transactions.push(transaction._id);
    await account.save();

    await createNotification(
      account.user,
      'info',
      `A card transaction of ${amount} was recorded for your card ending ${card.cardNumber.slice(-4)} at ${merchantDetails}.`
    );

    const correlationId = req.headers['x-correlation-id'];
    await logActivity({
      userId: req.user._id,
      action: 'Admin Card Transaction Created',
      metadata: {
        cardTransaction: transaction._id,
        card: cardId,
        account: accountId,
        amount,
        merchantDetails,
        transactionType,
        managedBy: req.user._id,
        correlationId
      }
    });

    res.status(201).json(transaction);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get available credit for a credit card (if applicable)
exports.getAvailableCredit = async (req, res) => {
  try {
    const cardId = req.params.cardId;
    const card = await Card.findById(cardId).populate('transactionHistory');

    if (!card) {
      return res.status(404).json({ message: 'Card not found.' });
    }
    const ownerAccount = await Account.findById(card.account).select('user');
    if (!ownerAccount) {
      return res.status(404).json({ message: 'Account not found.' });
    }
    if (req.user.role !== 'admin' && ownerAccount.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (!isCreditCardType(card.cardType)) {
      return res.status(400).json({ message: 'Available credit is only applicable to credit cards.' });
    }

    if (card.creditLimit === null || card.creditLimit === undefined) {
      return res.status(400).json({ message: 'Credit limit not set for this card.' });
    }

    // Calculate outstanding balance from transactions
    let outstandingBalance = 0;
    if (card.transactionHistory && card.transactionHistory.length > 0) {
      outstandingBalance = card.transactionHistory.reduce((sum, transaction) => {
        // Assuming transaction has 'type' (e.g., 'debit', 'credit') and 'amount' fields
        if (transaction.type === 'debit') {
          return sum + transaction.amount;
        }
        return sum;
      }, 0);
    }

    const availableCredit = card.creditLimit - outstandingBalance;

    res.status(200).json({ availableCredit });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get credit limit for a credit card (if applicable)
exports.getCreditLimit = async (req, res) => {
  try {
    const cardId = req.params.cardId;
    const card = await Card.findById(cardId);

    if (!card) {
      return res.status(404).json({ message: 'Card not found.' });
    }
    const ownerAccount = await Account.findById(card.account).select('user');
    if (!ownerAccount) {
      return res.status(404).json({ message: 'Account not found.' });
    }
    if (req.user.role !== 'admin' && ownerAccount.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (!isCreditCardType(card.cardType)) {
      return res.status(400).json({ message: 'Credit limit is only applicable to credit cards.' });
    }

    if (card.creditLimit === null || card.creditLimit === undefined) {
      return res.status(400).json({ message: 'Credit limit not set for this card.' });
    }

    res.status(200).json({ creditLimit: card.creditLimit });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
