const mysql = require('mysql2');

// Database connection configuration with enhanced SSL security
let pool;

console.log('🔗 Railway MySQL Connection Setup (Enhanced SSL)');

// Railway provides MYSQL_URL, not DATABASE_URL
const mysqlUrl = process.env.MYSQL_URL || process.env.DATABASE_URL;

// SSL Security Configuration
function getSecureSSLConfig() {
  // Allow overriding SSL strictness via environment variable for flexibility
  if (process.env.SSL_STRICT === 'true') {
    console.log('🔒 Using STRICT SSL (forced by SSL_STRICT=true)');
    return { rejectUnauthorized: true };
  }
  if (process.env.SSL_STRICT === 'false') {
    console.log('⚠️  Using LEGACY SSL (forced by SSL_STRICT=false)');
    return { rejectUnauthorized: false };
  }

  // Default to production-based SSL settings
  const isProduction = process.env.NODE_ENV === 'production';
  console.log(`🔒 SSL mode based on NODE_ENV: ${isProduction ? 'Strict' : 'Legacy'}`);
  
  return {
    rejectUnauthorized: isProduction
  };
}

if (mysqlUrl) {
  console.log('✅ Using MYSQL_URL from Railway');
  
  try {
    // Parse Railway MYSQL_URL: mysql://root:password@host:port/database
    const url = new URL(mysqlUrl);
    
    const config = {
      host: url.hostname,
      port: parseInt(url.port) || 3306,
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1), // Remove leading slash
      ssl: getSecureSSLConfig(),
      // Pool-specific configurations (valid for createPool)
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
      charset: 'utf8mb4'
    };
    
    console.log('📋 Railway Connection Config:', {
      host: config.host,
      port: config.port,
      user: config.user,
      database: config.database,
      passwordSet: !!config.password,
      sslEnabled: !!config.ssl,
      sslStrict: config.ssl?.rejectUnauthorized || false
    });
    
    pool = mysql.createPool(config);
    
  } catch (error) {
    console.error('❌ Failed to parse MYSQL_URL:', error.message);
    process.exit(1);
  }
} else {
  // Fallback to individual Railway environment variables
  console.log('🔗 Using individual Railway environment variables');
  
  const dbHost = process.env.MYSQLHOST || process.env.DB_HOST;
  const dbUser = process.env.MYSQLUSER || process.env.DB_USER || 'root';
  const dbPassword = process.env.MYSQLPASSWORD || process.env.DB_PASSWORD;
  const dbName = process.env.MYSQLDATABASE || process.env.DB_NAME || 'railway';
  const dbPort = process.env.MYSQLPORT || process.env.DB_PORT || 3306;
  
  if (!dbPassword) {
    console.error('❌ Database password not found');
    console.error('Expected: MYSQL_URL, MYSQLPASSWORD, or DB_PASSWORD');
    process.exit(1);
  }
  
  console.log('📋 Individual Config:', {
    host: dbHost,
    port: dbPort,
    user: dbUser,
    database: dbName,
    passwordSet: !!dbPassword
  });
  
  pool = mysql.createPool({
    host: dbHost,
    port: parseInt(dbPort),
    user: dbUser,
    password: dbPassword,
    database: dbName,
    ssl: getSecureSSLConfig(),
    // Pool-specific configurations (valid for createPool)
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    charset: 'utf8mb4'
  });
}

// Enhanced connection test with SSL security awareness
async function testConnection(retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`🔄 Testing Railway database connection (attempt ${i + 1}/${retries})...`);
      const startTime = Date.now();
      const [result] = await pool.promise().query('SELECT 1 as test');
      const duration = Date.now() - startTime;
      console.log(`✅ Railway database connection successful (${duration}ms)`);
      console.log('📊 Connection result:', result[0]);
      
      // Log SSL security status
      const sslConfig = pool.config.connectionConfig.ssl;
      if (sslConfig) {
        console.log('🔒 SSL Status:', sslConfig.rejectUnauthorized ? 
          '✅ Secure (Certificate Validation Enabled)' : 
          '⚠️  Legacy (Certificate Validation Disabled)'
        );
      } else {
        console.log('🔒 SSL Status: ❌ Disabled');
      }
      
      return true;
    } catch (err) {
      console.error(`❌ Railway connection attempt ${i + 1} failed:`, err.message);
      console.error('Error code:', err.code);
      
      // SSL-specific error handling
      if (err.code === 'CERT_AUTHORITY_INVALID') {
        console.log('🔒 SSL Certificate validation failed - consider setting SSL_STRICT=false');
      } else if (err.code === 'CERT_HAS_EXPIRED') {
        console.log('🔒 SSL Certificate expired - check Railway certificate status');
      } else if (err.code === 'ETIMEDOUT') {
        console.log('⚠️  Network timeout - Railway might be experiencing high load');
      } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
        console.log('⚠️  Authentication failed - Check Railway credentials');
      } else if (err.code === 'ECONNREFUSED') {
        console.log('⚠️  Connection refused - Railway database might be starting');
      }
      
      if (i < retries - 1) {
        const delay = Math.min(5000 * (i + 1), 15000);
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.error('❌ All Railway connection attempts failed');
  console.error('🔧 Troubleshooting steps:');
  console.error('   1. Check Railway service status');
  console.error('   2. Verify MYSQL_URL or individual credentials');
  console.error('   3. If SSL errors, try: SSL_STRICT=false in environment');
  console.error('   4. Check if database is sleeping (common in free tier)');
  console.error('   5. Try redeploying the Railway service');
  return false;
}

// Test connection on startup
testConnection().then(success => {
  if (success) {
    console.log('🎉 Railway database ready for use!');
    
    // Log security recommendations
    const sslConfig = pool.config.connectionConfig.ssl;
    if (sslConfig && !sslConfig.rejectUnauthorized) {
      console.log('\n🔒 SSL Security Recommendation:');
      console.log('   ⚠️  Currently using legacy SSL (less secure)');
      console.log('   💡 To improve security, try setting: SSL_STRICT=true');
      console.log('   📚 See RAILWAY_CONFIG.md for more details');
    }
  } else {
    console.error('❌ Railway database connection failed');
    console.error('📱 Server will continue but database operations may fail');
  }
});

module.exports = pool.promise();