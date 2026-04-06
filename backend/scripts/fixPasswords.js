const mysql = require('mysql2/promise');

async function updatePasswords() {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'Aditya@2004',
    database: 'TicketingSystem',
    port: 3306,
  });

  try {
    const hashes = {
      'aditya@techcorp.com': '$2a$10$5Sb37J20I5meTtWr33mARejbbMT8B8jDqd5CN0214u.AoYwEnimRi',
      'admin@techcorp.com': '$2a$10$zUwwMwnqLk.nkmodW6cHeOh7fTyJVv7JJ.5w5ZPH1NNbXmTuywN1u',
    };

    for (const [email, hash] of Object.entries(hashes)) {
      const result = await pool.query(
        'UPDATE Users SET PasswordHash = ? WHERE Email = ?',
        [hash, email]
      );
      console.log(`✅ Updated ${email}: ${result[0].affectedRows} row(s) affected`);
    }

    // Verify
    const [users] = await pool.query(
      'SELECT UserID, Name, Email, Role, PasswordHash FROM Users WHERE Email IN (?, ?)',
      ['aditya@techcorp.com', 'admin@techcorp.com']
    );

    console.log('\n📋 Verification:');
    users.forEach(u => {
      console.log(`\n${u.Name} (${u.Email})`);
      console.log(`  Hash: ${u.PasswordHash.substring(0, 20)}...`);
      console.log(`  Full length: ${u.PasswordHash.length}`);
    });

    await pool.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

updatePasswords();
