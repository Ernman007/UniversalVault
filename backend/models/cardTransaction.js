const mongoose = require('mongoose');

const cardTransactionSchema = new mongoose.Schema({
  card: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Card',
    required: true
  },
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  merchantDetails: {
    type: String,
    required: true
  },
  transactionType: {
    type: String, // e.g., 'purchase', 'withdrawal'
    required: true
  },
  date: {
    type: Date,
    default: Date.now,
    required: true
  },
  transactionId: { // Add transactionId field
    type: String,
    unique: true,
  },
  // Potentially add more fields like location, currency, etc.
}, { timestamps: true });

// Function to generate a random ID
const generateRandomId = (length = 12) => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

// Generate transactionId before saving
cardTransactionSchema.pre('save', function(next) {
  if (this.isNew && !this.transactionId) {
    this.transactionId = generateRandomId();
  }
  next();
});

const CardTransaction = mongoose.model('CardTransaction', cardTransactionSchema);

module.exports = CardTransaction;