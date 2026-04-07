const mysql = require('mysql2/promise');

async function updatePassword() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Aditya@2004',
    database: 'TicketingSystem',
  });

  try {
    const hash = '$2a$10$CQ1nYqYCSrctLLv1MU5bSuTcAMWNwTZn/PgStuQb4c.gsAjAxChVe';
    const result = await connection.execute(
      'UPDATE Users SET PasswordHash = ? WHERE UserID = 3',
      [hash]
    );
    console.log('✅ Password hash updated:', result);

    // Verify
    const [rows] = await connection.execute(
      'SELECT PasswordHash FROM Users WHERE UserID = 3'
    );
    console.log('✅ Current hash:', rows[0].PasswordHash);
  } finally {
    await connection.end();
  }
}

updatePassword();
