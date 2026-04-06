const mysql = require('mysql2/promise');

(async () => {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'Aditya@2004',
    database: 'TicketingSystem'
  });

  try {
    const conn = await pool.getConnection();
    
    console.log('📋 EngineerAssignment table:');
    const [assignments] = await conn.query('SELECT * FROM EngineerAssignment');
    assignments.forEach(a => {
      console.log(`  CompanyID ${a.CompanyID}: Last Engineer = ${a.LastAssignedEngineerID}, Total = ${a.TotalAssignmentsInRotation}`);
    });
    
    console.log('\n📋 Tickets 72-76 Assignment Status:');
    const [tickets] = await conn.query('SELECT TicketID, AssignedTo, CompanyID FROM Tickets WHERE TicketID BETWEEN 72 AND 76 ORDER BY TicketID');
    tickets.forEach(t => {
      console.log(`  Ticket #${t.TicketID}: AssignedTo = ${t.AssignedTo || 'NULL'}, CompanyID = ${t.CompanyID}`);
    });
    
    console.log('\n📋 Engineers in Company 2:');
    const [engineers] = await conn.query('SELECT UserID, Name, Email FROM Users WHERE CompanyID = 2 AND Role = "Engineer"');
    engineers.forEach(e => {
      console.log(`  UserID ${e.UserID}: ${e.Name} (${e.Email})`);
    });
    
    console.log('\n📋 DEBUG_START records:');
    const [debugs] = await conn.query('SELECT TicketID, CreatedAt FROM EmailNotifications WHERE TemplateType = "DEBUG_START" ORDER BY NotificationID DESC LIMIT 5');
    if(debugs.length === 0) {
      console.log('  ❌ NO DEBUG_START records found - notifyTicketCreated() NOT BEING CALLED!');
    } else {
      debugs.forEach(d => {
        console.log(`  Ticket #${d.TicketID} at ${d.CreatedAt}`);
      });
    }
    
    conn.release();
    pool.end();
  } catch(err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
