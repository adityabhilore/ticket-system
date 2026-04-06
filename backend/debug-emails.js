const { query } = require('./config/database');

async function debugEmails() {
  try {
    console.log('🔍 Checking EmailNotifications table...\n');
    
    // Check ALL emails in the table
    console.log('📧 ALL EMAIL NOTIFICATIONS:');
    const allEmails = await query(
      `SELECT EmailNotificationID, TicketID, TemplateType, RecipientEmail, RecipientName, RecipientRole, Status, SentAt
       FROM EmailNotifications
       ORDER BY SentAt DESC
       LIMIT 20`,
      []
    );
    
    if (allEmails[0] && allEmails[0].length > 0) {
      allEmails[0].forEach(e => {
        console.log(`  - ID: ${e.EmailNotificationID}, Ticket: #${e.TicketID}, Type: ${e.TemplateType}, To: ${e.RecipientEmail}, Role: ${e.RecipientRole}, Status: ${e.Status}`);
      });
    } else {
      console.log('  ❌ NO EMAILS IN TABLE!');
    }
    
    // Check emails for ticket 109 specifically
    console.log('\n📬 EMAILS FOR TICKET #109:');
    const ticket109 = await query(
      `SELECT EmailNotificationID, TicketID, TemplateType, RecipientEmail, RecipientName, Status, SentAt
       FROM EmailNotifications
       WHERE TicketID = 109`,
      []
    );
    
    if (ticket109[0] && ticket109[0].length > 0) {
      ticket109[0].forEach(e => {
        console.log(`  ✅ Found: ${e.TemplateType} sent to ${e.RecipientEmail} on ${e.SentAt}`);
      });
    } else {
      console.log('  ❌ NO EMAILS FOR TICKET 109!');
    }
    
    // Check what engineer user ID for Aditya
    console.log('\n👤 ADITYA USER DETAILS:');
    const aditya = await query(
      `SELECT UserID, Name, Email, Role FROM Users WHERE Name = 'Aditya' OR Email LIKE '%aditya%'`,
      []
    );
    
    if (aditya[0] && aditya[0].length > 0) {
      aditya[0].forEach(u => {
        console.log(`  - UserID: ${u.UserID}, Name: ${u.Name}, Email: ${u.Email}, Role: ${u.Role}`);
      });
    } else {
      console.log('  ❌ ADITYA NOT FOUND!');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

debugEmails();
