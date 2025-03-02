const mysql = require('mysql2');

// Get database config from environment variables
const dbHost = process.env.DB_HOST || 'localhost';
const dbUser = process.env.DB_USER;
const dbPassword = process.env.DB_PASSWORD;
const dbName = process.env.DB_NAME;
const dbPort = process.env.DB_PORT || 3306;

if (!dbUser || !dbPassword || !dbName) {
  throw new Error('Database environment variables are not properly defined.');
}

// Configure the pool
const pool = mysql.createPool({
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
    console.log('Database connection successful');
  })
  .catch(err => {
    console.error('Database connection error:', err);
  });

module.exports = pool.promise();