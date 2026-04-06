/**
 * Script to generate bcrypt password hashes for test users
 * Run this with: node scripts/generate-password-hashes.js
 */

const bcryptjs = require('bcryptjs');

const users = [
  { email: 'test@techcorp.com', password: 'password', role: 'Manager' },
  { email: 'rahul@techcorp.com', password: 'password123', role: 'Engineer' },
  { email: 'digital@solutions.com', password: 'password123', role: 'Client' },
  { email: 'admin@techcorp.com', password: 'admin123', role: 'Admin' },
];

async function generateHashes() {
  console.log('\n=== PASSWORD HASH GENERATOR ===\n');
  
  for (const user of users) {
    const hash = await bcryptjs.hash(user.password, 10);
    console.log(`Email: ${user.email}`);
    console.log(`Role: ${user.role}`);
    console.log(`Password: ${user.password}`);
    console.log(`Hash: ${hash}`);
    console.log('---');
  }

  // Generate SQL UPDATE statement
  console.log('\n=== SQL UPDATE STATEMENTS ===\n');
  for (const user of users) {
    const hash = await bcryptjs.hash(user.password, 10);
    console.log(`UPDATE Users SET PasswordHash = '${hash}' WHERE Email = '${user.email}';`);
  }

  console.log('\n✓ Copy the SQL statements above and run them in your MySQL client\n');
}

generateHashes().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
