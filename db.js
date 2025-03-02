const mysql = require('mysql2');

// Database connection configuration
let pool;

// First try to use DATABASE_URL (Railway's standard format)
if (process.env.DATABASE_URL) {
  console.log('Using DATABASE_URL for connection');
  pool = mysql.createPool(process.env.DATABASE_URL);
} else {
  // Fallback to individual variables
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbUser = process.env.DB_USER;
  const dbPassword = process.env.DB_PASSWORD;
  const dbName = process.env.DB_NAME;
  const dbPort = process.env.DB_PORT || 3306;

  if (!dbUser || !dbPassword || !dbName) {
    throw new Error('Database environment variables are not properly defined.');
  }

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
}

// Test the connection
pool.promise().query('SELECT 1')
  .then(() => {
    console.log('Database connection successful');
  })
  .catch(err => {
    console.error('Database connection error:', err);
  });

module.exports = pool.promise();