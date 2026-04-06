require('dotenv').config();
const { notifyTicketReopened } = require('./services/notificationService');

const ticketId = 110;

console.log(`\n🔄 Test: Manually triggering reopened email for ticket #${ticketId}\n`);

notifyTicketReopened(ticketId)
  .then(() => {
    console.log(`✅ Test completed\n`);
    process.exit(0);
  })
  .catch(err => {
    console.error(`❌ Test failed: ${err.message}\n`);
    process.exit(1);
  });
