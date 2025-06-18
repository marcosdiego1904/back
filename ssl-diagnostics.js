const mysql = require('mysql2');
const tls = require('tls');
const https = require('https');
require('dotenv').config();

console.log('🔒 SSL/TLS Diagnostic Tool for Railway');
console.log('====================================');

// Railway connection details
const mysqlUrl = process.env.MYSQL_URL || process.env.DATABASE_URL;
if (!mysqlUrl) {
  console.error('❌ No MYSQL_URL found');
  process.exit(1);
}

const url = new URL(mysqlUrl);
const host = url.hostname;
const port = parseInt(url.port) || 3306;

console.log(`🔍 Testing SSL for: ${host}:${port}`);

// Test 1: Check what happens with strict SSL
async function testStrictSSL() {
  console.log('\n🔒 Test 1: Strict SSL (rejectUnauthorized: true)');
  
  const strictConfig = {
    host: host,
    port: port,
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1),
    ssl: {
      rejectUnauthorized: true,
      ca: undefined // Let system handle CA certs
    },
    timeout: 10000
  };
  
  try {
    const connection = mysql.createConnection(strictConfig);
    await new Promise((resolve, reject) => {
      connection.connect((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    await new Promise((resolve, reject) => {
      connection.query('SELECT 1', (err, results) => {
        connection.end();
        if (err) reject(err);
        else resolve(results);
      });
    });
    
    console.log('✅ Strict SSL connection successful!');
    return true;
  } catch (error) {
    console.log('❌ Strict SSL failed:', error.message);
    console.log('   Code:', error.code);
    return false;
  }
}

// Test 2: Check certificate details
async function getCertificateInfo() {
  console.log('\n📋 Test 2: Certificate Information');
  
  return new Promise((resolve) => {
    const socket = tls.connect({
      host: host,
      port: port,
      rejectUnauthorized: false // Just for info gathering
    }, () => {
      const cert = socket.getPeerCertificate();
      
      if (cert && Object.keys(cert).length > 0) {
        console.log('📜 Certificate Details:');
        console.log('   Subject:', cert.subject?.CN || 'Not specified');
        console.log('   Issuer:', cert.issuer?.CN || 'Not specified');
        console.log('   Valid from:', cert.valid_from);
        console.log('   Valid to:', cert.valid_to);
        console.log('   Serial:', cert.serialNumber);
        console.log('   Fingerprint:', cert.fingerprint);
        
        // Check if it's a Railway certificate
        const isRailwayCert = cert.subject?.CN?.includes('railway') || 
                              cert.subject?.CN?.includes('proxy') ||
                              cert.issuer?.CN?.includes('railway');
        
        console.log('   Railway cert?:', isRailwayCert ? '✅ Yes' : '❓ Unknown');
        
        socket.end();
        resolve({
          valid: true,
          subject: cert.subject?.CN,
          issuer: cert.issuer?.CN,
          isRailway: isRailwayCert
        });
      } else {
        console.log('❌ No certificate information available');
        socket.end();
        resolve({ valid: false });
      }
    });
    
    socket.on('error', (error) => {
      console.log('❌ TLS connection failed:', error.message);
      resolve({ valid: false, error: error.message });
    });
    
    socket.setTimeout(10000, () => {
      console.log('❌ TLS connection timeout');
      socket.end();
      resolve({ valid: false, error: 'timeout' });
    });
  });
}

// Test 3: Check if Railway has valid CA certs
async function testWithSystemCA() {
  console.log('\n🏛️  Test 3: System CA Validation');
  
  const systemCAConfig = {
    host: host,
    port: port,
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1),
    ssl: {
      rejectUnauthorized: true,
      ca: undefined, // Use system CA store
      checkServerIdentity: (hostname, cert) => {
        console.log(`   Checking identity for: ${hostname}`);
        return undefined; // Let default validation handle it
      }
    },
    timeout: 10000
  };
  
  try {
    const pool = mysql.createPool(systemCAConfig);
    await pool.promise().query('SELECT 1');
    console.log('✅ System CA validation successful!');
    pool.end();
    return true;
  } catch (error) {
    console.log('❌ System CA validation failed:', error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('\n🚀 Starting comprehensive SSL diagnostics...\n');
  
  const results = {
    strict: await testStrictSSL(),
    certInfo: await getCertificateInfo(),
    systemCA: await testWithSystemCA()
  };
  
  console.log('\n📊 SSL Diagnostic Results:');
  console.log('==========================');
  console.log('Strict SSL (rejectUnauthorized: true):', results.strict ? '✅ PASS' : '❌ FAIL');
  console.log('Certificate available:', results.certInfo.valid ? '✅ YES' : '❌ NO');
  console.log('System CA validation:', results.systemCA ? '✅ PASS' : '❌ FAIL');
  
  console.log('\n💡 Recommendations:');
  if (results.strict && results.systemCA) {
    console.log('🎉 EXCELLENT: Railway supports full SSL validation!');
    console.log('   ✅ Safe to use: rejectUnauthorized: true');
    console.log('   ✅ No custom CA certificates needed');
  } else if (results.certInfo.valid) {
    console.log('⚠️  PARTIAL: Railway uses SSL but may need custom configuration');
    console.log('   📋 Certificate subject:', results.certInfo.subject);
    console.log('   🔧 May need custom CA or certificate pinning');
  } else {
    console.log('❌ WARNING: Railway SSL configuration is complex');
    console.log('   🚨 Current insecure config may be necessary');
    console.log('   🔍 Consider Railway-specific SSL documentation');
  }
}

runAllTests().catch(console.error); 