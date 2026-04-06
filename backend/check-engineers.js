const mysql = require('mysql2/promise');
(async () => {
  const pool = mysql.createPool({ host: 'localhost', user: 'root', password: 'Aditya@2004', database: 'TicketingSystem' });
  const conn = await pool.getConnection();
  
  console.log('=== ALL ENGINEERS ===');
  const [engineers] = await conn.query('SELECT UserID, Name, Email, CompanyID, Role FROM Users WHERE Role = ?', ['Engineer']);
  if(engineers.length === 0) {
    console.log('NO ENGINEERS FOUND!');
  } else {
    engineers.forEach(e => {
      console.log(`  ✓ ID ${e.UserID}: ${e.Name} | Company ${e.CompanyID} | ${e.Email}`);
    });
  }
  
  console.log('\n=== CLIENT USER ===');
  const [client] = await conn.query('SELECT UserID, Name, CompanyID, Email FROM Users WHERE UserID = ?', [3]);
  console.log(`  ID 3: ${client[0].Name} | Company ${client[0].CompanyID}`);
  
  console.log('\n=== LATEST TICKET ===');
  const [tickets] = await conn.query('SELECT TicketID, Title, CompanyID, CreatedBy, AssignedTo FROM Tickets ORDER BY TicketID DESC LIMIT 1');
  const t = tickets[0];
  console.log(`  #${t.TicketID}: ${t.Title.substring(0, 30)}`);
  console.log(`  Company: ${t.CompanyID}, CreatedBy: ${t.CreatedBy}, AssignedTo: ${t.AssignedTo || 'NONE'}`);
  
  conn.release();
  pool.end();
})();
