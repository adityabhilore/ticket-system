const bcrypt = require('bcryptjs');

bcrypt.hash('Aditya@2004', 10, (err, hash) => {
  if (err) {
    console.error('Error:', err);
    process.exit(1);
  }
  console.log('Correct hash for password "Aditya@2004":');
  console.log(hash);
  process.exit(0);
});
