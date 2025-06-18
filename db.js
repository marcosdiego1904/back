const mysql = require('mysql2');

// Database connection configuration
let pool;

// Use individual variables for Railway connection
const dbHost = process.env.DB_HOST || 'crossover.proxy.rlwy.net';
const dbUser = process.env.DB_USER || 'root';
const dbPassword = process.env.DB_PASSWORD || 'cLytbcVXOiloQxifsSqXyvrvyeNvIhSV'; // Replace with actual password
const dbName = process.env.DB_NAME || 'railway';
const dbPort = process.env.DB_PORT || 14951;

// Configure the pool with individual variables
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
    console.log('Database connection successful');
  })
  .catch(err => {
    console.error('Database connection error:', err);
  });

module.exports = pool.promise();