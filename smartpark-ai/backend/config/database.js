const knex = require('knex');
require('dotenv').config();

// Database connection configuration
const connectionConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'smartpark_db',
  charset: 'utf8mb4',
  connectTimeout: 60000,
  waitForConnections: true
};

// Add SSL configuration for Aiven or other cloud MySQL providers
if (process.env.DB_SSL === 'true') {
  connectionConfig.ssl = {
    rejectUnauthorized: false // Required for Aiven MySQL
  };
}

const db = knex({
  client: 'mysql2',
  connection: connectionConfig,
  pool: {
    min: 2,
    max: 10,
    createTimeoutMillis: 3000,
    acquireTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 100,
  },
  debug: process.env.NODE_ENV === 'development'
});

// Test database connection
db.raw('SELECT 1')
  .then(() => {
    console.log('✅ Database connected successfully');
  })
  .catch((err) => {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  });

module.exports = db;
