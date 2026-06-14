const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema({
  key: {
    type: String,
    default: 'system',
    unique: true
  },
  maintenance: {
    type: Boolean,
    default: false
  },
  version: {
    type: String,
    default: '1.2.3'
  },
  features: {
    darkMode: { type: Boolean, default: true },
    mfa: { type: Boolean, default: true },
    notifications: { type: Boolean, default: true }
  },
  limits: {
    maxAccounts: { type: Number, default: 10, min: 1 },
    maxDailyTransfers: { type: Number, default: 50, min: 1 },
    minTransferAmount: { type: Number, default: 1, min: 0 }
  },
  revision: {
    type: Number,
    default: 1
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);
