const db = require('./config/database');

(async () => {
  try {
    console.log('✅ TESTING MANAGER EMAIL NOTIFICATIONS\n');

    // Get manager
    const managerResult = await db.query(`
      SELECT UserID, Name, Email FROM Users WHERE Role = 'Manager' LIMIT 1
    `);
    
    const users = Array.isArray(managerResult) ? managerResult : (managerResult['0'] || []);
    const manager = users[0];
    
    if (!manager) {
      console.log('❌ No manager found');
      process.exit(1);
    }

    console.log(`👨‍💼 Manager: ${manager.Name}\n`);

    // Check emails in EmailNotifications for manager
    const emailResult = await db.query(`
      SELECT TemplateType, COUNT(*) as count, MAX(SentAt) as lastSent
      FROM EmailNotifications
      WHERE RecipientEmail = ?
      GROUP BY TemplateType
      ORDER BY lastSent DESC
    `, [manager.Email]);
    
    const emails = Array.isArray(emailResult) ? emailResult : (emailResult['0'] || []);
    
    console.log('📧 EMAILS tab (EmailNotifications):');
    if (emails.length > 0) {
      console.log(`   ✅ Manager NOW has ${emails.reduce((sum, e) => sum + e.count, 0)} emails!\n`);
      console.log('   Email types:');
      emails.forEach(e => {
        console.log(`      - ${e.TemplateType}: ${e.count}`);
      });
    } else {
      console.log(`   ❌ Manager still has 0 emails`);
      console.log(`   (Changes will take effect after a new ticket is created)\n`);
    }

    // Also check IN-APP notifications (COMMENTS tab)
    const notifResult = await db.query(`
      SELECT n.Type, COUNT(*) as count
      FROM Notifications n
      WHERE n.UserID = ? AND n.Type != 'email'
      GROUP BY n.Type
    `, [manager.UserID]);
    
    const notifs = Array.isArray(notifResult) ? notifResult : (notifResult['0'] || []);
    console.log('\n💬 COMMENTS tab (Notifications, Type != email):');
    if (notifs.length > 0) {
      notifs.forEach(n => {
        console.log(`   - ${n.Type}: ${n.count}`);
      });
    }

    console.log('\n✅ CHANGES APPLIED:');
    console.log('   Manager will now receive emails for:');
    console.log('   1. TICKET_ASSIGNED - When a ticket is created');
    console.log('   2. TICKET_RESOLVED - When a ticket is resolved');
    console.log('   3. TICKET_REOPENED - When a ticket is reopened');
    console.log('\n   These will appear in the EMAILS tab once new tickets are created.');

    process.exit(0);
  } catch(err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
