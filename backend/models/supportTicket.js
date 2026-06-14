const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema(
  {
    url: { type: String, trim: true },
    name: { type: String, trim: true }
  },
  { _id: false }
);

const supportTicketSchema = new mongoose.Schema(
  {
    subject: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    category: {
      type: String,
      enum: ['account', 'card', 'loan', 'technical', 'other'],
      required: true,
      lowercase: true,
      trim: true
    },
    status: {
      type: String,
      enum: ['open', 'pending', 'resolved', 'closed'],
      default: 'open',
      lowercase: true,
      trim: true
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
      lowercase: true,
      trim: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    attachments: [attachmentSchema],
    metadata: {
      slaDueAt: { type: Date },
      origin: { type: String, trim: true },
      tags: [{ type: String, trim: true }]
    },
    lastResponseAt: { type: Date }
  },
  {
    timestamps: true
  }
);

supportTicketSchema.index({ status: 1, category: 1 });
supportTicketSchema.index({ createdBy: 1, status: 1 });
supportTicketSchema.index({ status: 1, createdBy: 1, updatedAt: -1 });

module.exports = mongoose.models.SupportTicket || mongoose.model('SupportTicket', supportTicketSchema);
