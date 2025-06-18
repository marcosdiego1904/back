const mysql = require('mysql2');

// Database connection configuration
let pool;

// Validate that all required environment variables are present
const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'DB_PORT'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
  console.error('Please check your .env file and ensure all database credentials are set.');
  process.exit(1);
}

// Use environment variables (no fallbacks for security)
const dbHost = process.env.DB_HOST;
const dbUser = process.env.DB_USER;
const dbPassword = process.env.DB_PASSWORD;
const dbName = process.env.DB_NAME;
const dbPort = process.env.DB_PORT;

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
  queueLimit: 0
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