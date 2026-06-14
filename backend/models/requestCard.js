const mongoose = require('mongoose');

const requestCardSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
  cardType: { type: String, enum: ['debit', 'credit'], required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'cancelled'], default: 'pending' },
  requestDate: { type: Date, default: Date.now },
  _idempotencyKey: { type: String, trim: true }
}, { timestamps: true });

requestCardSchema.index(
  { user: 1, account: 1, cardType: 1, status: 1, _idempotencyKey: 1 },
  { sparse: true }
);

module.exports = mongoose.model('RequestCard', requestCardSchema);
