const mysql = require('mysql2/promise');
(async () => {
  const pool = mysql.createPool({ host: 'localhost', user: 'root', password: 'Aditya@2004', database: 'TicketingSystem' });
  const conn = await pool.getConnection();
  
  console.log('All Engineers in System:');
  const [eng] = await conn.query('SELECT UserID, Name, Email, CompanyID, Role FROM Users WHERE Role = "Engineer"');
  eng.forEach(e => console.log(`  ID ${e.UserID}: ${e.Name} (Company ${e.CompanyID}, Email: ${e.Email})`));
  
  console.log('\nAssigning User 5 (Aditya) as Engineer to Company 2...');
  await conn.query('UPDATE Users SET CompanyID = 2, Role = "Engineer" WHERE UserID = 5');
  
  console.log('Updated! Verifying:');
  const [check] = await conn.query('SELECT UserID, Name, CompanyID, Role FROM Users WHERE UserID = 5');
  console.log(`  User 5: ${check[0].Name}, Company ${check[0].CompanyID}, Role ${check[0].Role}`);
  
  conn.release();
  pool.end();
})();
