const { query } = require('./config/database');

async function checkTable() {
  try {
    console.log('🔍 Checking if EmailNotifications table exists...\n');
    
    // Check if table exists
    const result = await query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = 'TicketingSystem' AND TABLE_NAME = 'EmailNotifications'`,
      []
    );
    
    if (result[0] && result[0].length > 0) {
      console.log('✅ EmailNotifications table DOES exist\n');
      
      // Get column info
      const columns = await query(
        `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = 'TicketingSystem' AND TABLE_NAME = 'EmailNotifications'`,
        []
      );
      
      console.log('📋 COLUMNS IN EmailNotifications TABLE:');
      if (columns[0]) {
        columns[0].forEach(col => {
          console.log(`  - ${col.COLUMN_NAME} (${col.COLUMN_TYPE}, nullable: ${col.IS_NULLABLE})`);
        });
      }
    } else {
      console.log('❌ EmailNotifications table DOES NOT EXIST!');
      console.log('\n📝 The table needs to be created.');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

checkTable();
