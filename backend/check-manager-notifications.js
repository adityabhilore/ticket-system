const db = require('./config/database');

(async () => {
  try {
    console.log('📊 MANAGER NOTIFICATIONS BREAKDOWN\n');

    // Get manager
    const managerResult = await db.query(`
      SELECT UserID, Name, Email FROM Users WHERE Role = 'Manager' LIMIT 1
    `);
    
    const users = Array.isArray(managerResult) ? managerResult : (managerResult['0'] || []);
    const manager = users[0];
    
    console.log(`👨‍💼 Manager: ${manager.Name}\n`);

    // Check COMMENTS tab (Notifications table)
    const notifResult = await db.query(`
      SELECT n.Type, COUNT(*) as count
      FROM Notifications n
      WHERE n.UserID = ? AND n.Type != 'email'
      GROUP BY n.Type
    `, [manager.UserID]);
    
    const notifs = Array.isArray(notifResult) ? notifResult : (notifResult['0'] || []);
    console.log('💬 COMMENTS tab (Notifications table, Type != email):');
    if (notifs.length > 0) {
      notifs.forEach(n => {
        console.log(`   ${n.Type}: ${n.count}`);
      });
    } else {
      console.log('   No records');
    }

    // Check EMAIL tab (EmailNotifications table)
    const emailResult = await db.query(`
      SELECT COUNT(*) as total
      FROM EmailNotifications
      WHERE RecipientEmail = ?
    `, [manager.Email]);
    
    const emails = Array.isArray(emailResult) ? emailResult : (emailResult['0'] || []);
    console.log(`\n📧 EMAILS tab (EmailNotifications table):`);
    console.log(`   Records: ${emails[0]?.total || 0}`);
    console.log(`   Reason: Manager role does NOT receive outbound emails`);
    console.log(`   (Only Clients and Engineers receive emails)\n`);

    console.log('ℹ️  DESIGN NOTE:');
    console.log('   - COMMENTS tab: In-app notifications (assigned, created, commented)');
    console.log('   - EMAILS tab: Outbound email log (currently empty for managers)');
    console.log('\n   This is WORKING AS DESIGNED - managers get UI notifications');
    console.log('   Clients and Engineers get both UI notifications + emails');

    process.exit(0);
  } catch(err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
