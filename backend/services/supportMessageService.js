const SupportMessage = require('../models/supportMessage');
const { sendAccountApprovalEmail } = require('../controllers/transfer-request/providers/emailProvider');

// Create a new support message
const createMessage = async (messageData) => {
  console.log('[supportMessageService] Creating message with data:', {
    name: messageData.name,
    email: messageData.email,
    subject: messageData.subject,
    messageType: messageData.messageType,
    status: messageData.status
  });
  const supportMessage = new SupportMessage(messageData);
  const createdMessage = await supportMessage.save();
  console.log('[supportMessageService] Created message:', {
    id: createdMessage._id,
    status: createdMessage.status,
    messageType: createdMessage.messageType
  });
  return createdMessage;
};

// Get all support messages
const getAllMessages = async () => {
  const messages = await SupportMessage.find({});
  return messages;
};

// Get a single support message by ID
const getMessageById = async (id) => {
  const message = await SupportMessage.findById(id);
  return message;
};

// Update a support message by ID
const updateMessage = async (id, updateData) => {
  console.log('[supportMessageService] Updating message:', id, 'with data:', updateData);
  const message = await SupportMessage.findById(id);

  if (message) {
    console.log('[supportMessageService] Current message status:', message.status, '-> New status:', updateData.status);
    if (updateData.status !== undefined) {
      message.status = updateData.status;
      message.resolvedBy = updateData.resolvedBy || null;
      message.resolvedAt = updateData.resolvedAt || (updateData.status !== 'open' && updateData.status !== 'in-progress' && updateData.status !== 'pending' ? new Date() : null);
    }
    if (updateData.adminReply !== undefined) {
      message.adminReply = updateData.adminReply;
    }
    if (updateData.rejectionReason !== undefined) {
      message.rejectionReason = updateData.rejectionReason;
    }
    
    // Check for approval to send email
    const wasPending = ['open', 'in-progress', 'pending'].includes(message.status);
    const isNowApproved = updateData.status === 'approved';
    
    const updatedMessage = await message.save();
    
    if (wasPending && isNowApproved && updatedMessage.messageType === 'account-request') {
      // Send approval email
      sendAccountApprovalEmail(
        { name: updatedMessage.name, email: updatedMessage.email },
        { type: updatedMessage.accountType, accountNumber: 'Pending Activation' }
      ).catch(err => console.error('[supportMessageService] Approval email failed:', err.message));
    }

    console.log('[supportMessageService] Updated message status:', updatedMessage.status);
    return updatedMessage;
  } else {
    return null;
  }
};

// Delete a support message by ID
const deleteMessage = async (id) => {
  const message = await SupportMessage.findByIdAndDelete(id);
  return message;
};

// Delete multiple support messages by IDs
const deleteManyMessages = async (ids) => {
  const result = await SupportMessage.deleteMany({ _id: { $in: ids } });
  return result;
};

module.exports = {
  createMessage,
  getAllMessages,
  getMessageById,
  updateMessage,
  deleteMessage,
  deleteManyMessages,
};
