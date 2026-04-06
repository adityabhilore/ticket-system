const mysql = require('mysql2/promise');
(async () => {
  const pool = mysql.createPool({ host: 'localhost', user: 'root', password: 'Aditya@2004', database: 'TicketingSystem' });
  const conn = await pool.getConnection();
  
  console.log('=== Checking User 5 (Aditya) ===');
  const [user] = await conn.query('SELECT UserID, Name, IsActive, Role, CompanyID FROM Users WHERE UserID = 5');
  const u = user[0];
  console.log(`IsActive: ${u.IsActive}`);
  console.log(`Role: ${u.Role}`);
  console.log(`Company: ${u.CompanyID}`);
  
  if(u.IsActive !== 1) {
    console.log('\nEnabling user...');
    await conn.query('UPDATE Users SET IsActive = 1 WHERE UserID = 5');
    console.log('✓ IsActive set to 1');
  }
  
  console.log('\n=== Checking EngineerAssignment ===');
  const [assignment] = await conn.query('SELECT * FROM EngineerAssignment WHERE CompanyID = 2');
  if(assignment.length === 0) {
    console.log('Creating new assignment record...');
    await conn.query('INSERT INTO EngineerAssignment (CompanyID) VALUES (2)');
    console.log('✓ Created');
  } else {
    console.log(`LastEngineer: ${assignment[0].LastAssignedEngineerID}`);
  }
  
  conn.release();
  pool.end();
})();
