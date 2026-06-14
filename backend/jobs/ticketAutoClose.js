const cron = require('node-cron');
const SupportTicket = require('../models/supportTicket');
const SupportTicketMessage = require('../models/supportTicketMessage');
const User = require('../models/user');

const startAutoCloseJob = (io) => {
  // Run every hour at minute 0
  cron.schedule('0 * * * *', async () => {
    console.log('Running ticket auto-close job...');
    try {
      const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
      
      // Find open or pending tickets that either have a lastResponseAt older than 48h 
      // or haven't been responded to at all and their updatedAt is older than 48h.
      const idleTickets = await SupportTicket.find({
        status: { $in: ['open', 'pending'] },
        $or: [
          { lastResponseAt: { $lt: fortyEightHoursAgo } },
          { lastResponseAt: { $exists: false }, updatedAt: { $lt: fortyEightHoursAgo } }
        ]
      });

      if (idleTickets.length === 0) return;

      const adminUser = await User.findOne({ role: 'admin' });
      if (!adminUser) {
        console.error('Cannot auto-close tickets: No admin user found for sender role');
        return;
      }

      for (const ticket of idleTickets) {
        // Create the system closing message
        const message = await SupportTicketMessage.create({
          ticket: ticket._id,
          sender: adminUser._id,
          senderRole: 'agent',
          body: 'Your ticket has been closed due to inactivity.',
        });

        // Update ticket status
        ticket.status = 'closed';
        ticket.lastResponseAt = new Date();
        await ticket.save();

        console.log(`Auto-closed ticket ${ticket._id}`);

        // Emit socket events if io is provided
        if (io) {
          const supportNamespace = io.of('/support');
          supportNamespace.to(`ticket_${ticket._id}`).emit('support_message', {
            ticketId: ticket._id,
            message: {
              _id: message._id,
              body: message.body,
              sender: { _id: adminUser._id, name: adminUser.name, role: adminUser.role },
              createdAt: message.createdAt
            }
          });
          supportNamespace.to(`ticket_${ticket._id}`).emit('support_ticket_updated', {
            ticketId: ticket._id,
            status: 'closed'
          });
        }
      }
    } catch (error) {
      console.error('Error in ticket auto-close job:', error);
    }
  });
};

module.exports = startAutoCloseJob;
