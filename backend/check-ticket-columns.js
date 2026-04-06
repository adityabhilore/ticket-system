const { query } = require('./config/database');

async function checkTicketColumns() {
  try {
    const columns = await query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = 'TicketingSystem' AND TABLE_NAME = 'Tickets'
       ORDER BY COLUMN_NAME`,
      []
    );
    
    console.log('📋 TICKETS TABLE COLUMNS:');
    columns[0].forEach(col => console.log(`  - ${col.COLUMN_NAME}`));
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkTicketColumns();
