const { query } = require('./config/database');

async function checkReopenedEmails() {
  try {
    console.log('🔍 Checking for TICKET_REOPENED emails...\n');
    
    // Get all reopened emails
    const result = await query(
      `SELECT NotificationID, TicketID, TemplateType, RecipientEmail, RecipientName, RecipientRole, Status, SentAt
       FROM EmailNotifications
       WHERE TemplateType = 'TICKET_REOPENED'
       ORDER BY SentAt DESC
       LIMIT 20`,
      []
    );
    
    if (!result[0] || result[0].length === 0) {
      console.log('❌ NO TICKET_REOPENED emails found!\n');
      console.log('This means tickets are not being reopened, or the notifyTicketReopened is not being called.\n');
    } else {
      console.log(`✅ Found ${result[0].length} TICKET_REOPENED emails:\n`);
      result[0].forEach(e => {
        console.log(`  - Ticket #${e.TicketID}: ${e.TemplateType}`);
        console.log(`    To: ${e.RecipientEmail} (${e.RecipientName})`);
        console.log(`    Status: ${e.Status}, Sent: ${e.SentAt}\n`);
      });
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkReopenedEmails();
