const { verifyUserPassword } = require('./services/userService');

async function testLogin() {
  try {
    console.log('🔐 Testing login for user 6...\n');
    console.log('📧 Email: jmayuri018@gmail.com');
    
    // Try some common test passwords
    const passwords = ['password123', 'Test@123', '12345678', 'admin', 'user123'];
    
    for (const pwd of passwords) {
      console.log(`\n🔑 Trying password: "${pwd}"`);
      const user = await verifyUserPassword('jmayuri018@gmail.com', pwd);
      
      if (user) {
        console.log('✅ LOGIN SUCCESSFUL!');
        console.log('   User:', user.Name);
        console.log('   Email:', user.Email);
        console.log('   Role:', user.Role);
        process.exit(0);
      }
    }
    
    console.log('\n❌ None of the test passwords worked!');
    console.log('📝 The password stored in DB might be different.');
    process.exit(1);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

testLogin();
