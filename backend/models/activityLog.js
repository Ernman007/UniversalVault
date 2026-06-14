const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, required: true },
  date: { type: Date, default: Date.now },
  metadata: { type: mongoose.Schema.Types.Mixed },
  correlationId: { type: String, index: true }, // For tracing requests across system
}, { timestamps: true });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
