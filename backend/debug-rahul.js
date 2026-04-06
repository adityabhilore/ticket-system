const { query } = require('./config/database');

async function debugRahul() {
  try {
    console.log('🔍 DEBUGGING: Ticket 108 Reopened - Rahul Engineer\n');
    
    // 1. Get Rahul's info
    console.log('👤 RAHUL ENGINEER:');
    const rahulResult = await query(
      `SELECT UserID, Name, Email, Role FROM Users WHERE Name LIKE '%rahul%' OR Email LIKE '%rahul%'`,
      []
    );
    
    if (!rahulResult[0] || !rahulResult[0][0]) {
      console.log('  ❌ RAHUL NOT FOUND!\n');
      process.exit(1);
    }
    
    const rahul = rahulResult[0][0];
    console.log(`  ✅ UserID: ${rahul.UserID}, Name: ${rahul.Name}, Email: ${rahul.Email}\n`);
    
    // 2. Check ticket 108
    console.log('🎫 TICKET #108:');
    const ticketResult = await query(
      `SELECT TicketID, Title, StatusID, AssignedTo FROM Tickets WHERE TicketID = 108`,
      []
    );
    
    if (ticketResult[0] && ticketResult[0][0]) {
      const ticket = ticketResult[0][0];
      console.log(`  ✅ Title: ${ticket.Title}`);
      console.log(`  ✅ Status ID: ${ticket.StatusID} (6 = Reopened)`);
      console.log(`  ✅ AssignedTo: ${ticket.AssignedTo}\n`);
    }
    
    // 3. Check ALL emails for ticket 108
    console.log('📧 EMAILS FOR TICKET #108:');
    const emailsResult = await query(
      `SELECT NotificationID, TicketID, TemplateType, RecipientEmail, RecipientName, RecipientRole, Status, SentAt
       FROM EmailNotifications
       WHERE TicketID = 108
       ORDER BY SentAt DESC`,
      []
    );
    
    if (emailsResult[0] && emailsResult[0].length > 0) {
      console.log(`  ✅ Found ${emailsResult[0].length} emails:\n`);
      emailsResult[0].forEach(e => {
        console.log(`    - Type: ${e.TemplateType}`);
        console.log(`      To: ${e.RecipientEmail} (${e.RecipientRole})`);
        console.log(`      Status: ${e.Status}, Sent: ${e.SentAt}\n`);
      });
    } else {
      console.log('  ❌ NO EMAILS FOUND FOR TICKET 108!\n');
    }
    
    // 4. Test the API query
    console.log('🔌 TESTING API QUERY FOR RAHUL:');
    const apiResult = await query(
      `SELECT 
        e.NotificationID as EmailNotificationID,
        e.TicketID,
        e.TemplateType,
        e.RecipientEmail,
        e.RecipientName,
        e.Subject,
        e.EmailBody,
        e.Status,
        e.SentAt,
        t.Title as TicketTitle,
        t.TicketNumber
      FROM EmailNotifications e
      LEFT JOIN Tickets t ON t.TicketID = e.TicketID
      WHERE e.RecipientRole = 'Engineer' AND e.RecipientEmail IN 
        (SELECT Email FROM Users WHERE UserID = ?)
      ORDER BY e.SentAt DESC
      LIMIT 10`,
      [rahul.UserID]
    );
    
    if (apiResult[0] && apiResult[0].length > 0) {
      console.log(`  ✅ API returned ${apiResult[0].length} emails for Rahul`);
      apiResult[0].forEach(e => {
        console.log(`    - Ticket #${e.TicketID}: ${e.TemplateType}`);
      });
    } else {
      console.log(`  ❌ API returned NO emails for Rahul!`);
    }
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

debugRahul();
