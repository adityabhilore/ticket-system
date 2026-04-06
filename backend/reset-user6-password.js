const { hashPassword } = require('./utils/auth');
const { query } = require('./config/database');

async function resetPassword() {
  try {
    console.log('🔑 Resetting password for user 6...\n');
    
    const password = 'password123';
    const hashedPassword = await hashPassword(password);
    
    console.log('💾 New password hash:', hashedPassword.substring(0, 30) + '...');
    
    const result = await query(
      `UPDATE Users SET PasswordHash = ? WHERE UserID = 6`,
      [hashedPassword]
    );
    
    if (result[0] && result[0].affectedRows > 0) {
      console.log('✅ Password updated successfully!\n');
      
      // Test the login now
      console.log('🔐 Testing login...');
      const { verifyUserPassword } = require('./services/userService');
      const user = await verifyUserPassword('jmayuri018@gmail.com', password);
      
      if (user) {
        console.log('✅ LOGIN TEST SUCCESSFUL! 🎉\n');
        console.log('User can now login with:');
        console.log('  📧 Email: jmayuri018@gmail.com');
        console.log('  🔑 Password: password123');
      } else {
        console.log('❌ Login test still failed!');
      }
    } else {
      console.log('❌ Update failed - User 6 may not exist');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

resetPassword();
