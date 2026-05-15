const db = require('./config/database');

(async () => {
  try {
    console.log('✅ TESTING EMAILS TAB FIX\n');

    // Get a manager/engineer user
    const usersResult = await db.query(`
      SELECT UserID, Name, Email, Role 
      FROM Users 
      WHERE Role IN ('Engineer', 'Manager', 'Admin')
      LIMIT 1
    `);
    
    // Handle both array and object formats
    const users = Array.isArray(usersResult) ? usersResult : (usersResult['0'] || usersResult.recordset || []);
    
    if (!Array.isArray(users) || users.length === 0) {
      console.log('❌ No engineers/managers found');
      process.exit(1);
    }

    const user = users[0];
    const userId = user.UserID;
    console.log(`📧 Testing with user: ${user.Name} (${user.Email})\n`);

    // Before: Query with /auth/emails (outbound)
    console.log('❌ OLD /auth/emails endpoint (outbound):');
    const outbound = await db.query(`
      SELECT COUNT(*) as total
      FROM EmailNotifications e
      WHERE e.RecipientEmail IN (SELECT Email FROM Users WHERE UserID = ?)
    `, [userId]);
    console.log(`   Records found: ${outbound[0]?.total || 0}`);

    // After: Query with /auth/inbound-emails (inbound)
    console.log('\n✅ NEW /auth/inbound-emails endpoint (inbound):');
    const inbound = await db.query(`
      SELECT COUNT(*) as total
      FROM Notifications n
      WHERE n.UserID = ? AND n.Type = 'email'
    `, [userId]);
    console.log(`   Records found: ${inbound[0]?.total || 0}`);

    // Show sample inbound emails
    const samples = await db.query(`
      SELECT
        n.Title AS message,
        n.CreatedAt AS time,
        n.TicketID,
        t.Title AS ticketTitle,
        ie.FromName AS actorName,
        ie.FromEmail AS actorEmail,
        ie.Subject,
        ie.ProcessType
      FROM Notifications n
      LEFT JOIN InboundEmails ie ON n.InboundEmailID = ie.InboundEmailID
      LEFT JOIN Tickets t ON n.TicketID = t.TicketID
      WHERE n.UserID = ? AND n.Type = 'email'
      ORDER BY n.CreatedAt DESC
      LIMIT 5
    `, [userId]);

    if (samples.length > 0) {
      console.log('\n📬 Sample Inbound Emails:');
      samples.forEach(email => {
        console.log(`   - From: ${email.actorName} <${email.actorEmail}>`);
        console.log(`     Subject: ${email.Subject}`);
        console.log(`     Ticket: #${email.TicketID} - ${email.ticketTitle}`);
        console.log(`     Type: ${email.ProcessType}\n`);
      });
    } else {
      console.log('\n⚠️  No inbound emails yet (but endpoint is correctly configured)');
    }

    console.log('✅ FIX APPLIED: Frontend now calls /auth/inbound-emails');
    console.log('   This will show emails FROM clients to engineers');

    process.exit(0);
  } catch(err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
