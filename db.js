const mysql = require('mysql2');

// Database connection configuration
let pool;

// Use environment variables with secure fallbacks for production compatibility
const dbHost = process.env.DB_HOST || 'crossover.proxy.rlwy.net';
const dbUser = process.env.DB_USER || 'root';
const dbPassword = process.env.DB_PASSWORD; // No fallback for security
const dbName = process.env.DB_NAME || 'railway';
const dbPort = process.env.DB_PORT || 14951;

// Validate critical credentials
if (!dbPassword) {
  console.error('❌ DB_PASSWORD is required for security. Please set it in your environment variables.');
  console.error('This prevents hardcoded passwords in the codebase.');
  process.exit(1);
}

// Configure the pool with environment variables
pool = mysql.createPool({
  host: dbHost,
  port: dbPort,
  user: dbUser,
  password: dbPassword,
  database: dbName,
  ssl: {
    // This allows self-signed certificates
    rejectUnauthorized: false
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000
});

// Test the connection
pool.promise().query('SELECT 1')
  .then(() => {
    console.log('✅ Database connection successful');
  })
  .catch(err => {
    console.error('❌ Database connection error:', err.message);
  });

module.exports = pool.promise();