const mysql = require('mysql2');
const { URL } = require('url');

// Get the database URL from environment variables
const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  throw new Error('DATABASE_URL environment variable is not defined.');
}

// Parse the database URL
const parsedUrl = new URL(dbUrl);

// Configure the pool with SSL settings that accept self-signed certificates
const pool = mysql.createPool({
  host: parsedUrl.hostname,
  port: parsedUrl.port,
  user: parsedUrl.username,
  password: parsedUrl.password,
  database: parsedUrl.pathname.replace('/', ''),
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