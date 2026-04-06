const { query } = require('./config/database');

async function checkEmails() {
  try {
    console.log('🔍 Checking for old and new emails...\n');
    
    const result = await query(
      `SELECT UserID, Name, Email FROM Users WHERE Email = ? OR Email = ?`,
      ['xyz@compny.com', 'jmayuri018@gmail.com']
    );
    
    console.log('Found records:');
    result[0].forEach(u => {
      console.log(`  UserID ${u.UserID}: ${u.Email} (${u.Name})`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

checkEmails();
