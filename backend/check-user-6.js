const { query } = require('./config/database');

async function checkUser6() {
  try {
    console.log('🔍 Checking User 6...\n');
    
    // Get exact user record
    const result = await query(
      `SELECT UserID, Name, Email, PasswordHash, CompanyID, Role, IsDeleted, CreatedAt
       FROM Users WHERE UserID = 6`,
      []
    );
    
    if (!result[0] || !result[0][0]) {
      console.log('❌ User 6 NOT FOUND in database!');
      process.exit(1);
    }
    
    const user = result[0][0];
    
    console.log('✅ User 6 INFO:');
    console.log('  - UserID:', user.UserID);
    console.log('  - Name:', user.Name);
    console.log('  - Email:', user.Email);
    console.log('  - Role:', user.Role);
    console.log('  - CompanyID:', user.CompanyID);
    console.log('  - IsDeleted:', user.IsDeleted);
    console.log('  - PasswordHash length:', user.PasswordHash ? user.PasswordHash.length : 'NULL');
    console.log('  - CreatedAt:', user.CreatedAt);
    
    // Check if email is in Users table
    console.log('\n🔍 Searching by email:', user.Email);
    const emailCheck = await query(
      `SELECT UserID, Name, Email FROM Users WHERE Email = ?`,
      [user.Email]
    );
    
    if (emailCheck[0] && emailCheck[0].length > 0) {
      console.log('✅ Email found in database:');
      emailCheck[0].forEach(u => console.log(`   - UserID: ${u.UserID}, Name: ${u.Name}`));
    } else {
      console.log('❌ Email NOT found in database!');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

checkUser6();
