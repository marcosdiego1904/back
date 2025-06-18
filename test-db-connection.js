const mysql = require('mysql2');
require('dotenv').config();

// Database connection test script
console.log('🔍 Database Connection Diagnostic Tool');
console.log('=====================================');

// Check environment variables
console.log('\n📋 Environment Variables:');
console.log('DB_HOST:', process.env.DB_HOST || 'NOT SET');
console.log('DB_USER:', process.env.DB_USER || 'NOT SET');
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? 'SET (****)' : 'NOT SET');
console.log('DB_NAME:', process.env.DB_NAME || 'NOT SET');
console.log('DB_PORT:', process.env.DB_PORT || 'NOT SET');

const dbConfig = {
  host: process.env.DB_HOST || 'crossover.proxy.rlwy.net',
  port: process.env.DB_PORT || 14951,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'railway',
  connectTimeout: 30000,
  acquireTimeout: 30000,
  timeout: 30000
};

console.log('\n🔗 Connection Configuration:');
console.log('Host:', dbConfig.host);
console.log('Port:', dbConfig.port);
console.log('User:', dbConfig.user);
console.log('Database:', dbConfig.database);
console.log('Password Set:', !!dbConfig.password);

async function testBasicConnection() {
  console.log('\n🔧 Testing basic connection...');
  
  return new Promise((resolve) => {
    const connection = mysql.createConnection(dbConfig);
    
    connection.connect((err) => {
      if (err) {
        console.error('❌ Basic connection failed:', err.message);
        console.error('Error code:', err.code);
        console.error('Error number:', err.errno);
        resolve(false);
      } else {
        console.log('✅ Basic connection successful');
        connection.end();
        resolve(true);
      }
    });
    
    // Force timeout after 30 seconds
    setTimeout(() => {
      console.error('❌ Connection timed out after 30 seconds');
      connection.destroy();
      resolve(false);
    }, 30000);
  });
}

async function testPoolConnection() {
  console.log('\n🏊 Testing pool connection...');
  
  const pool = mysql.createPool({
    ...dbConfig,
    ssl: {
      rejectUnauthorized: false
    },
    waitForConnections: true,
    connectionLimit: 1,
    queueLimit: 0
  });
  
  try {
    const [rows] = await pool.promise().query('SELECT 1 as test');
    console.log('✅ Pool connection successful');
    console.log('Query result:', rows);
    pool.end();
    return true;
  } catch (err) {
    console.error('❌ Pool connection failed:', err.message);
    console.error('Error code:', err.code);
    pool.end();
    return false;
  }
}

async function testSSLConnection() {
  console.log('\n🔒 Testing SSL connection...');
  
  const sslConfig = {
    ...dbConfig,
    ssl: {
      rejectUnauthorized: true // Strict SSL
    }
  };
  
  const pool = mysql.createPool(sslConfig);
  
  try {
    await pool.promise().query('SELECT 1');
    console.log('✅ SSL connection successful');
    pool.end();
    return true;
  } catch (err) {
    console.error('❌ SSL connection failed:', err.message);
    pool.end();
    return false;
  }
}

async function runDiagnostic() {
  console.log('\n🚀 Starting diagnostic tests...\n');
  
  if (!dbConfig.password) {
    console.error('❌ CRITICAL: DB_PASSWORD not set!');
    return;
  }
  
  const results = {
    basic: await testBasicConnection(),
    pool: await testPoolConnection(),
    ssl: await testSSLConnection()
  };
  
  console.log('\n📊 Test Results Summary:');
  console.log('======================');
  console.log('Basic Connection:', results.basic ? '✅ PASS' : '❌ FAIL');
  console.log('Pool Connection:', results.pool ? '✅ PASS' : '❌ FAIL');
  console.log('SSL Connection:', results.ssl ? '✅ PASS' : '❌ FAIL');
  
  if (results.basic && results.pool) {
    console.log('\n🎉 Database connection is working!');
  } else {
    console.log('\n🔧 Recommended actions:');
    console.log('1. Check if Railway database is running');
    console.log('2. Verify credentials in Railway dashboard');
    console.log('3. Check network/firewall settings');
    console.log('4. Try regenerating database credentials');
  }
}

runDiagnostic().catch(console.error); 