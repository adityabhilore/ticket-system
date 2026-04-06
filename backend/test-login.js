const { verifyUserPassword } = require('./services/userService');

async function testLogin() {
  try {
    console.log('🔐 Testing login for user 6...\n');
    const email = 'jmayuri018@gmail.com';
    const password = 'password123';
    
    console.log('📧 Email:', email);
    console.log('🔑 Password:', password);
    console.log('\n⏳ Attempting login...');
    
    const user = await verifyUserPassword(email, password);
    
    if (user) {
      console.log('\n✅ LOGIN SUCCESSFUL! 🎉');
      console.log('\nUser Details:');
      console.log('  - UserID:', user.UserID);
      console.log('  - Name:', user.Name);
      console.log('  - Email:', user.Email);
      console.log('  - Role:', user.Role);
      console.log('  - CompanyID:', user.CompanyID);
      console.log('  - CompanyName:', user.CompanyName);
      console.log('  - CompanyStatus:', user.CompanyStatus);
    } else {
      console.log('\n❌ LOGIN FAILED!');
      console.log('   Either email/password is wrong OR password not set correctly in DB');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

testLogin();
