const mysql = require('mysql2');

// Alternative Railway configuration using DATABASE_URL
let pool;

console.log('🚂 Railway Database Connection (Alternative)');

// Check if DATABASE_URL is available (Railway standard)
if (process.env.DATABASE_URL) {
  console.log('🔗 Using DATABASE_URL configuration');
  
  try {
    // Parse DATABASE_URL
    const url = new URL(process.env.DATABASE_URL);
    
    const config = {
      host: url.hostname,
      port: url.port,
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1), // Remove leading slash
      ssl: {
        rejectUnauthorized: false
      },
      waitForConnections: true,
      connectionLimit: 3,
      queueLimit: 0,
      acquireTimeout: 30000,
      timeout: 30000,
      connectTimeout: 30000,
      reconnect: true
    };
    
    console.log('📋 Parsed configuration:', {
      host: config.host,
      port: config.port,
      user: config.user,
      database: config.database,
      passwordSet: !!config.password
    });
    
    pool = mysql.createPool(config);
    
  } catch (error) {
    console.error('❌ Failed to parse DATABASE_URL:', error.message);
    process.exit(1);
  }
} else {
  // Fallback to individual environment variables
  console.log('🔗 Using individual environment variables');
  
  const dbHost = process.env.DB_HOST;
  const dbUser = process.env.DB_USER;
  const dbPassword = process.env.DB_PASSWORD;
  const dbName = process.env.DB_NAME;
  const dbPort = process.env.DB_PORT;
  
  if (!dbPassword) {
    console.error('❌ Database credentials not found');
    console.error('Please set DATABASE_URL or individual DB_* variables');
    process.exit(1);
  }
  
  pool = mysql.createPool({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    database: dbName,
    ssl: {
      rejectUnauthorized: false
    },
    waitForConnections: true,
    connectionLimit: 3,
    queueLimit: 0,
    acquireTimeout: 30000,
    timeout: 30000,
    connectTimeout: 30000,
    reconnect: true
  });
}

// Test connection
async function testConnection() {
  try {
    console.log('🔄 Testing Railway connection...');
    await pool.promise().query('SELECT 1');
    console.log('✅ Railway connection successful!');
    return true;
  } catch (error) {
    console.error('❌ Railway connection failed:', error.message);
    return false;
  }
}

testConnection();

module.exports = pool.promise(); 