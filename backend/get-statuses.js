const { query } = require('./config/database');

async function getStatuses() {
  try {
    const result = await query('SELECT StatusID, Name FROM Status ORDER BY StatusID', []);
    
    console.log('📋 STATUS TYPES:\n');
    result[0].forEach(s => console.log(`  - ID ${s.StatusID}: ${s.Name}`));
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

getStatuses();
