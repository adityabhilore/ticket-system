const db = require('./config/database');

(async () => {
  try {
    console.log('🔍 MANAGER SIDE EMAIL TAB DIAGNOSTIC\n');

    // Get the manager user
    const managerResult = await db.query(`
      SELECT UserID, Name, Email, Role 
      FROM Users 
      WHERE Role = 'Manager'
      LIMIT 1
    `);
    
    const users = Array.isArray(managerResult) ? managerResult : (managerResult['0'] || managerResult.recordset || []);
    
    if (!users.length) {
      console.log('❌ No manager found');
      process.exit(1);
    }

    const manager = users[0];
    console.log(`👨‍💼 Manager: ${manager.Name} (${manager.Email})\n`);

    // Check /auth/emails endpoint for this manager
    // This endpoint queries EmailNotifications where RecipientEmail matches manager's email
    console.log('📧 Checking /auth/emails endpoint:');
    const emailNotifResult = await db.query(`
      SELECT 
        e.NotificationID,
        e.TicketID,
        e.TemplateType,
        e.RecipientEmail,
        e.Subject,
        e.SentAt
      FROM EmailNotifications e
      WHERE e.RecipientEmail = ?
      ORDER BY e.SentAt DESC
      LIMIT 5
    `, [manager.Email]);
    
    const emailNotifs = Array.isArray(emailNotifResult) ? emailNotifResult : (emailNotifResult['0'] || []);
    console.log(`   Records: ${emailNotifs.length}`);
    if (emailNotifs.length > 0) {
      console.log('   ✅ FOUND EMAILS:');
      emailNotifs.forEach(e => {
        console.log(`      - Ticket #${e.TicketID}: ${e.Subject} (${e.TemplateType})`);
      });
    } else {
      console.log('   ❌ NO EMAILS SENT TO MANAGER');
    }

    // Check if there are ANY emails in EmailNotifications
    console.log('\n📬 Total EmailNotifications in system:');
    const totalResult = await db.query('SELECT COUNT(*) as total FROM EmailNotifications');
    const totals = Array.isArray(totalResult) ? totalResult : (totalResult['0'] || []);
    console.log(`   ${totals[0]?.total || 0} total records`);
    
    // Show all recipients
    const recipientsResult = await db.query(`
      SELECT DISTINCT RecipientEmail, COUNT(*) as count
      FROM EmailNotifications
      GROUP BY RecipientEmail
      ORDER BY count DESC
    `);
    const recipients = Array.isArray(recipientsResult) ? recipientsResult : (recipientsResult['0'] || []);
    if (recipients.length > 0) {
      console.log('\n   Recipients getting emails:');
      recipients.forEach(r => {
        console.log(`      - ${r.RecipientEmail}: ${r.count} emails`);
      });
    }

    console.log('\n💡 Analysis:');
    if (emailNotifs.length === 0) {
      console.log('   ⚠️  Manager is NOT in the EmailNotifications table');
      console.log('   This means no outbound emails have been SENT to the manager email');
    }

    process.exit(0);
  } catch(err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
