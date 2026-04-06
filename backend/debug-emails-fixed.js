const { query } = require('./config/database');

async function checkEmails() {
  try {
    console.log('🔍 Checking EmailNotifications table...\n');
    
    // Check ALL emails in the table
    console.log('📧 ALL EMAIL NOTIFICATIONS (last 20):');
    const allEmails = await query(
      `SELECT NotificationID, TicketID, TemplateType, RecipientEmail, RecipientName, RecipientRole, Status, SentAt
       FROM EmailNotifications
       ORDER BY SentAt DESC
       LIMIT 20`,
      []
    );
    
    if (allEmails[0] && allEmails[0].length > 0) {
      console.log(`✅ Found ${allEmails[0].length} emails\n`);
      allEmails[0].forEach(e => {
        console.log(`  - NotificationID: ${e.NotificationID}, Ticket: #${e.TicketID}, Type: ${e.TemplateType}`);
        console.log(`    To: ${e.RecipientEmail} (${e.RecipientRole}), Status: ${e.Status}`);
        console.log(`    Sent: ${e.SentAt}\n`);
      });
    } else {
      console.log('  ❌ NO EMAILS IN TABLE!\n');
    }
    
    // Check emails for ticket 109
    console.log('📬 EMAILS FOR TICKET #109:');
    const ticket109 = await query(
      `SELECT NotificationID, TicketID, TemplateType, RecipientEmail, RecipientName, Status, SentAt
       FROM EmailNotifications
       WHERE TicketID = 109`,
      []
    );
    
    if (ticket109[0] && ticket109[0].length > 0) {
      console.log(`✅ Found ${ticket109[0].length} emails for ticket 109\n`);
      ticket109[0].forEach(e => {
        console.log(`  - Type: ${e.TemplateType}, To: ${e.RecipientEmail}`);
        console.log(`    Status: ${e.Status}, Sent: ${e.SentAt}`);
      });
    } else {
      console.log('  ❌ NO EMAILS FOR TICKET 109!\n');
    }
    
    // Get Aditya's info
    console.log('👤 ADITYA USER INFO:');
    const aditya = await query(
      `SELECT UserID, Name, Email, Role FROM Users WHERE Name LIKE '%aditya%' OR Email LIKE '%aditya%'`,
      []
    );
    
    if (aditya[0] && aditya[0].length > 0) {
      aditya[0].forEach(u => {
        console.log(`  - UserID: ${u.UserID}, Name: ${u.Name}, Email: ${u.Email}, Role: ${u.Role}`);
        
        // Also show tickets assigned to this user
        query(
          `SELECT TicketID, Title, AssignedTo FROM Tickets WHERE AssignedTo = ? LIMIT 5`,
          [u.UserID]
        ).then(result => {
          if (result[0] && result[0].length > 0) {
            console.log(`\n  📋 Recent tickets assigned to ${u.Name}:`);
            result[0].forEach(t => {
              console.log(`    - Ticket #${t.TicketID}: ${t.Title}`);
            });
          }
        });
      });
    } else {
      console.log('  ❌ ADITYA NOT FOUND!');
    }
    
    setTimeout(() => process.exit(0), 1000);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

checkEmails();
