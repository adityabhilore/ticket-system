const { query } = require('./config/database');

(async () => {
  try {
    console.log('Running migration: Creating UserEmailPreferences table...\n');

    // Create table
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS UserEmailPreferences (
        PreferenceID INT PRIMARY KEY AUTO_INCREMENT,
        UserID INT NOT NULL UNIQUE,
        EmailOnCreated BOOLEAN DEFAULT TRUE,
        EmailOnAssigned BOOLEAN DEFAULT TRUE,
        EmailOnResolved BOOLEAN DEFAULT TRUE,
        EmailOnCommented BOOLEAN DEFAULT TRUE,
        CreatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        UpdatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE,
        INDEX idx_userid (UserID),
        INDEX idx_updated (UpdatedAt)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;

    await query(createTableSQL);
    console.log('✓ UserEmailPreferences table created successfully\n');

    // Add preferences for existing users
    const insertPreferencesSQL = `
      INSERT IGNORE INTO UserEmailPreferences (UserID, EmailOnCreated, EmailOnAssigned, EmailOnResolved, EmailOnCommented)
      SELECT UserID, TRUE, TRUE, TRUE, TRUE FROM Users WHERE IsDeleted = 0
    `;

    const result = await query(insertPreferencesSQL);
    console.log(`✓ Added preferences for existing users\n`);

    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
})();
