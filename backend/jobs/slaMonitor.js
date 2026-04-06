const cron = require('node-cron');
const { markOverdueTickets } = require('../services/ticketService');

/**
 * Start SLA monitoring - runs every hour
 */
const startSLAMonitoring = () => {
  // Schedule job to run every hour
  cron.schedule('0 * * * *', async () => {
    try {
      console.log('🔄 Running SLA monitoring job...');
      const markedCount = await markOverdueTickets();
      console.log(`✓ Marked ${markedCount} tickets as overdue`);
    } catch (err) {
      console.error('✗ SLA monitoring job error:', err.message);
    }
  });

  console.log('✓ SLA monitoring job started');
};

module.exports = {
  startSLAMonitoring,
};
