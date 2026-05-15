const db = require('./config/database');

(async () => {
  try {
    console.log('🔍 Checking EMAILS tab issue...\n');

    // Check EmailNotifications table
    console.log('📧 EmailNotifications table:');
    try {
      const emailNotifs = await db.query('SELECT COUNT(*) as total FROM EmailNotifications');
      console.log(`   Result type: ${typeof emailNotifs}`);
      
      const emailNotifsSample = await db.query(`
        SELECT NotificationID, TicketID, TemplateType, RecipientEmail FROM EmailNotifications ORDER BY SentAt DESC LIMIT 3
      `);      
      console.log('   Sample records found:', Array.isArray(emailNotifsSample) && emailNotifsSample.length > 0 ? '✅ Yes' : '❌ No');
      if (Array.isArray(emailNotifsSample) && emailNotifsSample.length > 0) {
        console.log('   First record:', emailNotifsSample[0]);
      }
    } catch(e) {
      console.log('   Error fetching:', e.message);
    }

    // Check Notifications table
    console.log('\n📬 Notifications table (Type=\'email\'):');
    try {
      const notifs = await db.query(`
        SELECT n.NotificationID, n.UserID, n.TicketID, n.Type, ie.ProcessType, ie.FromEmail
        FROM Notifications n
        LEFT JOIN InboundEmails ie ON n.InboundEmailID = ie.InboundEmailID
        WHERE n.Type = 'email'
        ORDER BY n.CreatedAt DESC LIMIT 3
      `);      
      console.log('   Records found:', Array.isArray(notifs) && notifs.length > 0 ? '✅ Yes' : '❌ No');
      if (Array.isArray(notifs) && notifs.length > 0) {
        console.log('   First record:', notifs[0]);
      }
    } catch(e) {
      console.log('   Error fetching:', e.message);
    }

    console.log('\n💡 ROOT CAUSE: The EMAILS tab calls /auth/emails endpoint');
    console.log('   which queries EmailNotifications table (outbound SENT emails)');
    console.log('   This only shows emails SENT TO engineers, not emails FROM clients.');
    console.log('\n✅ SOLUTION: Change frontend fetchEmails() to call /auth/inbound-emails');
    console.log('   Endpoints available:');
    console.log('   - /auth/emails → EmailNotifications (outbound)');
    console.log('   - /auth/inbound-emails → Notifications Type=email (inbound)');

    process.exit(0);
  } catch(err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
