const mysql = require('mysql2/promise');
(async () => {
  const pool = mysql.createPool({ host: 'localhost', user: 'root', password: 'Aditya@2004', database: 'TicketingSystem' });
  const conn = await pool.getConnection();
  const [cols] = await conn.query('DESCRIBE Users');
  console.log('Users table columns:');
  cols.forEach(c => console.log(`  - ${c.Field} (${c.Type})`));
  conn.release();
  pool.end();
})();
