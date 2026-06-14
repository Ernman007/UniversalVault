const mongoose = require('mongoose');

const supportTicketMessageSchema = new mongoose.Schema(
  {
    ticket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SupportTicket',
      required: true,
      index: true
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    senderRole: {
      type: String,
      enum: ['user', 'agent'],
      required: true,
      lowercase: true
    },
    body: {
      type: String,
      required: true,
      trim: true
    },
    attachments: [
      {
        url: { type: String, trim: true },
        name: { type: String, trim: true }
      }
    ],
    metadata: {
      readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
    }
  },
  {
    timestamps: true
  }
);

supportTicketMessageSchema.index({ ticket: 1, createdAt: 1 });

module.exports =
  mongoose.models.SupportTicketMessage ||
  mongoose.model('SupportTicketMessage', supportTicketMessageSchema);
