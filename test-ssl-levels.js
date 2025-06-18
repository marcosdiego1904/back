// Quick SSL Level Test Script
require('dotenv').config();

console.log('🔒 Quick SSL Level Test');
console.log('======================');

// Test with different SSL_STRICT values
const tests = [
  { SSL_STRICT: undefined, name: 'AUTO-DETECT (default)' },
  { SSL_STRICT: 'false', name: 'LEGACY SSL' },
  { SSL_STRICT: 'true', name: 'STRICT SSL' }
];

async function testSSLLevel(sslStrict, name) {
  console.log(`\n🔄 Testing ${name}...`);
  
  // Temporarily set environment variable
  const originalValue = process.env.SSL_STRICT;
  if (sslStrict !== undefined) {
    process.env.SSL_STRICT = sslStrict;
  } else {
    delete process.env.SSL_STRICT;
  }
  
  try {
    // Import fresh db module (this reloads the configuration)
    delete require.cache[require.resolve('./db.js')];
    const db = require('./db.js');
    
    // Simple query test
    const [result] = await db.query('SELECT 1 as test');
    console.log(`✅ ${name} connection successful!`);
    console.log('   Result:', result[0]);
    
    return true;
  } catch (error) {
    console.log(`❌ ${name} failed:`, error.message);
    return false;
  } finally {
    // Restore original value
    if (originalValue !== undefined) {
      process.env.SSL_STRICT = originalValue;
    } else {
      delete process.env.SSL_STRICT;
    }
  }
}

async function runAllTests() {
  console.log('🚀 Starting SSL configuration tests...\n');
  
  const results = [];
  
  for (const test of tests) {
    const success = await testSSLLevel(test.SSL_STRICT, test.name);
    results.push({ ...test, success });
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n📊 SSL Test Results Summary:');
  console.log('============================');
  results.forEach(result => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    console.log(`${result.name}: ${status}`);
  });
  
  const successfulConfigs = results.filter(r => r.success);
  if (successfulConfigs.length > 0) {
    const mostSecure = successfulConfigs.find(r => r.SSL_STRICT === 'true') || 
                       successfulConfigs.find(r => r.SSL_STRICT === undefined) ||
                       successfulConfigs[0];
    
    console.log('\n💡 Recommendations:');
    if (mostSecure.SSL_STRICT === 'true') {
      console.log('🎉 EXCELLENT: Use SSL_STRICT=true for maximum security');
    } else if (mostSecure.SSL_STRICT === undefined) {
      console.log('⚠️  OK: AUTO-DETECT works, consider trying SSL_STRICT=true');
    } else {
      console.log('🚨 WARNING: Only LEGACY SSL works - check Railway certificates');
    }
  } else {
    console.log('\n❌ All SSL configurations failed - check your Railway connection');
  }
  
  process.exit(0);
}

runAllTests().catch(error => {
  console.error('❌ Test script failed:', error.message);
  process.exit(1);
}); 