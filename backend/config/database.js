const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

// Load .env from the correct location
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// MySQL pool configuration
const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || '+',
  port: parseInt(process.env.DB_PORT) || 3306,
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
};

let pool = null;

const validateConfig = () => {
  if (!poolConfig.user || !poolConfig.password) {
    throw new Error(
      'Missing DB_USER or DB_PASSWORD. Update backend/.env with your MySQL username and password.'
    );
  }
};

/**
 * Get database connection pool
 */
const getPool = async () => {
  if (pool) return pool;

  try {
    validateConfig();
    console.log(`Connecting to MySQL: ${poolConfig.host}:${poolConfig.port}/${poolConfig.database}`);
    pool = mysql.createPool(poolConfig);
    
    // Test connection
    const connection = await pool.getConnection();
    console.log('✓ Database connected successfully');
    connection.release();
    
    return pool;
  } catch (err) {
    console.error('✗ Database connection error:', err.message);
    throw err;
  }
};

/**
 * Execute query
 */
const query = async (queryText, params = []) => {
  try {
    const pool = await getPool();
    const [results] = await pool.query(queryText, params);
    return {
      0: results,
      recordset: results,
    };
  } catch (err) {
    // Silently skip duplicate entry errors (old emails being re-processed)
    if (!err.message.includes('Duplicate entry')) {
      console.error('Query execution error:', err.message || err.code || err);
      console.error('  Query:', queryText);
      console.error('  Stack:', err.stack);
    }
    throw err;
  }
};

/**
 * Execute query with single row result
 */
const queryOne = async (queryText, params = []) => {
  try {
    const result = await query(queryText, params);
    return result.recordset && result.recordset.length > 0 ? result.recordset[0] : null;
  } catch (err) {
    // Silently skip duplicate entry errors (old emails being re-processed)
    if (!err.message.includes('Duplicate entry')) {
      console.error('Query execution error:', err.message || err.code || err);
    }
    throw err;
  }
};

/**
 * Close database connection
 */
const closeConnection = async () => {
  if (pool) {
    await pool.end();
    console.log('Database connection closed');
    pool = null;
  }
};

module.exports = {
  getPool,
  query,
  queryOne,
  closeConnection,
};
