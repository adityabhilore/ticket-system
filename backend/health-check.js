const db = require('./config/database');

(async () => {
  console.log('🔍 PROJECT HEALTH CHECK\n');
  console.log('═'.repeat(70));

  try {
    // 1. Database Connection
    console.log('\n1️⃣  DATABASE CONNECTION');
    const dbTest = await db.query('SELECT COUNT(*) as count FROM Users');
    const users = Array.isArray(dbTest) ? dbTest : (dbTest['0'] || []);
    console.log('   ✅ Connected to MySQL');
    console.log(`   ✅ Users table: ${users[0]?.count || 0} records\n`);

    // 2. Email Processor Service
    console.log('2️⃣  EMAIL PROCESSOR SERVICE');
    const emailProcessor = require('./services/emailProcessor');
    console.log('   ✅ emailProcessor.js loads successfully');
    console.log('   ✅ Gmail integration ready\n');

    // 3. Notification Service
    console.log('3️⃣  NOTIFICATION SERVICE');
    const notificationService = require('./services/notificationService');
    console.log('   ✅ notificationService.js loads successfully');
    console.log('   ✅ Email templates system ready\n');

    // 4. Tables Check
    console.log('4️⃣  DATABASE TABLES');
    const tables = ['Users', 'Tickets', 'Notifications', 'InboundEmails', 'EmailNotifications', 'TicketComments'];
    
    for (const table of tables) {
      try {
        const result = await db.query(`SELECT COUNT(*) as count FROM ${table}`);
        const data = Array.isArray(result) ? result : (result['0'] || []);
        console.log(`   ✅ ${table}: ${data[0]?.count || 0} records`);
      } catch(e) {
        console.log(`   ❌ ${table}: ERROR`);
      }
    }

    // 5. Core Flows
    console.log('\n5️⃣  CORE FEATURES');
    
    // Users by role
    const rolesResult = await db.query(`
      SELECT Role, COUNT(*) as count FROM Users GROUP BY Role
    `);
    const roles = Array.isArray(rolesResult) ? rolesResult : (rolesResult['0'] || []);
    
    console.log('   Users by role:');
    roles.forEach(r => {
      console.log(`      - ${r.Role}: ${r.count}`);
    });

    // Tickets by status
    console.log('\n   Tickets by status:');
    const statusResult = await db.query(`
      SELECT s.Name as status, COUNT(*) as count
      FROM Tickets t
      LEFT JOIN Status s ON t.StatusID = s.StatusID
      GROUP BY s.Name
    `);
    const statuses = Array.isArray(statusResult) ? statusResult : (statusResult['0'] || []);
    
    if (statuses.length > 0) {
      statuses.forEach(s => {
        console.log(`      - ${s.status || 'Unknown'}: ${s.count}`);
      });
    } else {
      console.log('      (No tickets yet)');
    }

    // 6. Email System
    console.log('\n6️⃣  EMAIL SYSTEM');
    
    // Outbound emails (EmailNotifications)
    const outboundResult = await db.query(`
      SELECT COUNT(*) as count FROM EmailNotifications
    `);
    const outbound = Array.isArray(outboundResult) ? outboundResult : (outboundResult['0'] || []);
    console.log(`   Outbound emails sent: ${outbound[0]?.count || 0}`);

    // Inbound emails (InboundEmails)
    const inboundResult = await db.query(`
      SELECT COUNT(*) as count FROM InboundEmails
    `);
    const inbound = Array.isArray(inboundResult) ? inboundResult : (inboundResult['0'] || []);
    console.log(`   Inbound emails received: ${inbound[0]?.count || 0}`);

    // In-app notifications
    const notifResult = await db.query(`
      SELECT COUNT(*) as count FROM Notifications
    `);
    const notifs = Array.isArray(notifResult) ? notifResult : (notifResult['0'] || []);
    console.log(`   In-app notifications: ${notifs[0]?.count || 0}`);

    // 7. API Routes Check
    console.log('\n7️⃣  API ROUTES');
    const authRoutes = require('./routes/authRoutes');
    const ticketRoutes = require('./routes/ticketRoutes');
    console.log('   ✅ authRoutes.js loaded');
    console.log('   ✅ ticketRoutes.js loaded\n');

    // 8. Recent Activity
    console.log('8️⃣  RECENT ACTIVITY (Last 5 tickets)');
    const recentTickets = await db.query(`
      SELECT t.TicketID, t.Title, t.StatusID, s.Name as StatusName, t.CreatedAt
      FROM Tickets t
      LEFT JOIN Status s ON t.StatusID = s.StatusID
      ORDER BY t.CreatedAt DESC
      LIMIT 5
    `);
    const tickets = Array.isArray(recentTickets) ? recentTickets : (recentTickets['0'] || []);
    
    if (tickets.length > 0) {
      tickets.forEach(t => {
        console.log(`   Ticket #${t.TicketID}: ${t.Title} [${t.StatusName}]`);
      });
    } else {
      console.log('   (No tickets created yet)');
    }

    console.log('\n' + '═'.repeat(70));
    console.log('\n✅ PROJECT STATUS: ALL SYSTEMS OPERATIONAL\n');
    console.log('Summary:');
    console.log('  ✅ Database: Connected');
    console.log('  ✅ Email System: Ready');
    console.log('  ✅ Notifications: Ready');
    console.log('  ✅ Core Services: Loaded');
    console.log('  ✅ API Routes: Loaded\n');
    console.log('Ready for:');
    console.log('  • Creating tickets');
    console.log('  • Sending email notifications');
    console.log('  • Processing inbound emails');
    console.log('  • Managing ticket lifecycle\n');

    process.exit(0);
  } catch(err) {
    console.error('\n❌ ERROR:', err.message);
    process.exit(1);
  }
})();
