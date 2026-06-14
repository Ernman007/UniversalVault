const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['info', 'warning', 'success', 'error'],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  time: {
    type: Date,
    default: Date.now
  },
  read: {
    type: Boolean,
    default: false
  },
  actionUrl: {
    type: String,
    default: null
  }
});

notificationSchema.index({ userId: 1, read: 1, time: -1 });
notificationSchema.index({ userId: 1, time: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
