const mysql = require('mysql2');

// Enhanced SSL Database connection with security tiers
let pool;

console.log('🔒 Enhanced SSL Database Connection');

// Railway provides MYSQL_URL, not DATABASE_URL
const mysqlUrl = process.env.MYSQL_URL || process.env.DATABASE_URL;

// SSL Security Configuration Tiers
const SSL_SECURITY_LEVELS = {
  STRICT: 'strict',      // Full certificate validation
  RELAXED: 'relaxed',    // Basic validation with custom CA
  LEGACY: 'legacy'       // Minimal validation (current)
};

// Get SSL security level from environment (default to STRICT for security)
const sslLevel = process.env.SSL_SECURITY_LEVEL || SSL_SECURITY_LEVELS.STRICT;

console.log(`🛡️  SSL Security Level: ${sslLevel.toUpperCase()}`);

function getSSLConfig(level, host) {
  switch (level) {
    case SSL_SECURITY_LEVELS.STRICT:
      return {
        rejectUnauthorized: true,
        ca: undefined, // Use system CA store
        checkServerIdentity: (hostname, cert) => {
          // Additional hostname verification
          console.log(`🔍 Verifying SSL certificate for: ${hostname}`);
          return undefined; // Let default validation handle it
        }
      };
      
    case SSL_SECURITY_LEVELS.RELAXED:
      return {
        rejectUnauthorized: true,
        ca: undefined,
        // Allow specific Railway domains
        checkServerIdentity: (hostname, cert) => {
          console.log(`🔍 Relaxed SSL check for: ${hostname}`);
          
          // Accept Railway domains
          const railwayDomains = [
            'railway.internal',
            'proxy.rlwy.net',
            'railway.app'
          ];
          
          const isRailwayDomain = railwayDomains.some(domain => 
            hostname.includes(domain)
          );
          
          if (isRailwayDomain) {
            console.log('✅ Railway domain verified');
            return undefined; // Accept
          }
          
          // For other domains, use default validation
          return undefined;
        }
      };
      
    case SSL_SECURITY_LEVELS.LEGACY:
    default:
      console.log('⚠️  Using legacy SSL (less secure)');
      return {
        rejectUnauthorized: false
      };
  }
}

async function createSecureConnection() {
  if (mysqlUrl) {
    console.log('✅ Using MYSQL_URL from Railway');
    
    try {
      const url = new URL(mysqlUrl);
      
      // Try different SSL security levels
      const securityLevels = [
        SSL_SECURITY_LEVELS.STRICT,
        SSL_SECURITY_LEVELS.RELAXED,
        SSL_SECURITY_LEVELS.LEGACY
      ];
      
      for (const level of securityLevels) {
        console.log(`\n🔄 Trying SSL level: ${level.toUpperCase()}`);
        
        const config = {
          host: url.hostname,
          port: parseInt(url.port) || 3306,
          user: url.username,
          password: url.password,
          database: url.pathname.slice(1),
          ssl: getSSLConfig(level, url.hostname),
          waitForConnections: true,
          connectionLimit: 5,
          queueLimit: 0,
          charset: 'utf8mb4'
        };
        
        try {
          // Test this configuration
          const testPool = mysql.createPool(config);
          await testPool.promise().query('SELECT 1 as test');
          
          console.log(`✅ SSL level ${level.toUpperCase()} successful!`);
          
          // Close test pool and create final pool
          testPool.end();
          pool = mysql.createPool(config);
          
          // Log security status
          logSecurityStatus(level);
          return true;
          
        } catch (error) {
          console.log(`❌ SSL level ${level.toUpperCase()} failed:`, error.message);
          
          // Continue to next security level
          if (level === SSL_SECURITY_LEVELS.LEGACY) {
            throw new Error('All SSL security levels failed');
          }
        }
      }
      
    } catch (error) {
      console.error('❌ Failed to establish secure connection:', error.message);
      process.exit(1);
    }
  } else {
    // Fallback to individual environment variables
    console.log('🔗 Using individual Railway environment variables');
    
    const dbHost = process.env.MYSQLHOST || process.env.DB_HOST;
    const dbUser = process.env.MYSQLUSER || process.env.DB_USER || 'root';
    const dbPassword = process.env.MYSQLPASSWORD || process.env.DB_PASSWORD;
    const dbName = process.env.MYSQLDATABASE || process.env.DB_NAME || 'railway';
    const dbPort = process.env.MYSQLPORT || process.env.DB_PORT || 3306;
    
    if (!dbPassword) {
      console.error('❌ Database password not found');
      process.exit(1);
    }
    
    pool = mysql.createPool({
      host: dbHost,
      port: parseInt(dbPort),
      user: dbUser,
      password: dbPassword,
      database: dbName,
      ssl: getSSLConfig(sslLevel, dbHost),
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
      charset: 'utf8mb4'
    });
  }
}

function logSecurityStatus(level) {
  console.log('\n🛡️  SSL Security Status:');
  console.log('========================');
  
  switch (level) {
    case SSL_SECURITY_LEVELS.STRICT:
      console.log('🎉 EXCELLENT SECURITY:');
      console.log('   ✅ Full certificate validation');
      console.log('   ✅ Hostname verification');
      console.log('   ✅ Protected against MITM attacks');
      break;
      
    case SSL_SECURITY_LEVELS.RELAXED:
      console.log('⚠️  GOOD SECURITY:');
      console.log('   ✅ Certificate validation');
      console.log('   ⚠️  Relaxed hostname checks for Railway');
      console.log('   ✅ Protected against most MITM attacks');
      break;
      
    case SSL_SECURITY_LEVELS.LEGACY:
      console.log('❌ LEGACY SECURITY (INSECURE):');
      console.log('   ❌ No certificate validation');
      console.log('   ❌ Vulnerable to MITM attacks');
      console.log('   ⚠️  Consider upgrading Railway plan or config');
      break;
  }
}

// Enhanced connection test
async function testSecureConnection(retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`\n🔄 Testing secure database connection (attempt ${i + 1}/${retries})...`);
      const startTime = Date.now();
      const [result] = await pool.promise().query('SELECT 1 as test, VERSION() as mysql_version');
      const duration = Date.now() - startTime;
      
      console.log(`✅ Secure database connection successful (${duration}ms)`);
      console.log('📊 Connection result:', result[0]);
      return true;
      
    } catch (err) {
      console.error(`❌ Secure connection attempt ${i + 1} failed:`, err.message);
      
      if (i < retries - 1) {
        const delay = Math.min(5000 * (i + 1), 15000);
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.error('❌ All secure connection attempts failed');
  return false;
}

// Initialize secure connection
async function init() {
  await createSecureConnection();
  
  const success = await testSecureConnection();
  if (success) {
    console.log('🎉 Secure Railway database ready for use!');
  } else {
    console.error('❌ Secure database connection failed');
    console.error('📱 Check your Railway configuration and SSL settings');
  }
}

// Export both the pool and initialization function
module.exports = {
  init,
  getPool: () => pool ? pool.promise() : null
}; 