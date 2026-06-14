const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true
  },
  cardNumber: {
    type: String,
    required: true,
    unique: true
  },
  cardType: {
    type: String, // e.g., 'Visa', 'Mastercard', 'Debit', 'Credit'
    required: true
  },
  expiryDate: {
    type: Date,
    required: true
  },
  cvv: {
    type: String, // Store securely, maybe encrypted or not stored directly
    required: true
  },
  isFrozen: {
    type: Boolean,
    default: false
  },
  dailyLimit: {
    type: Number,
    default: 400
  },
  transactionHistory: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CardTransaction' // Reference the new CardTransaction model
    }
  ],
  creditLimit: { 
    type: Number,
    default: null // Or a default value for credit cards
  },
  // Add other relevant card details like billing address, etc.
});

const Card = mongoose.model('Card', cardSchema);

module.exports = Card;