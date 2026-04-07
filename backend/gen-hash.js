const bcrypt = require('bcryptjs');

async function generateHash() {
  const password = 'password';
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);
  console.log('Password:', password);
  console.log('Hash:', hash);
  
  // Also verify it
  const isValid = await bcrypt.compare(password, hash);
  console.log('Verification:', isValid);
}

generateHash();
