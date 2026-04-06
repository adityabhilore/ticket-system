const bcrypt = require('bcryptjs');

// Generate hashes for both users
async function generateHashes() {
  const adityaHash = await bcrypt.hash('Aditya@2004', 10);
  const adminHash = await bcrypt.hash('password', 10);
  
  console.log('Aditya password: Aditya@2004');
  console.log('Hash:', adityaHash);
  console.log('\nAdmin password: password');
  console.log('Hash:', adminHash);
}

generateHashes();
