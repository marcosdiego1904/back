/**
 * API Validation Testing Script
 * Tests input validation through actual HTTP requests
 */

const axios = require('axios').default;

const BASE_URL = 'http://localhost:5000';

console.log('🔒 Testing Input Validation via API Calls\n');

async function testAPI() {
  try {
    // Test 1: Health check (should work)
    console.log('1. 🟢 Testing Health Check (should work):');
    const health = await axios.get(`${BASE_URL}/api/health`);
    console.log('   ✅ Health check passed:', health.data);

    // Test 2: Valid category ID (should work)
    console.log('\n2. 🟢 Testing Valid Category ID (should work):');
    try {
      const validCategory = await axios.get(`${BASE_URL}/api/subcategories/1`);
      console.log('   ✅ Valid category ID accepted');
    } catch (error) {
      console.log('   ℹ️ Category ID test (may fail if category doesn\'t exist):', error.response?.status);
    }

    // Test 3: Invalid category ID (should fail with validation error)
    console.log('\n3. 🔴 Testing Invalid Category ID (should fail):');
    try {
      await axios.get(`${BASE_URL}/api/subcategories/abc`);
      console.log('   ❌ ERROR: Invalid category ID was accepted!');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('   ✅ Invalid category ID correctly rejected:', error.response.data);
      } else {
        console.log('   ⚠️ Unexpected error:', error.response?.status);
      }
    }

    // Test 4: Negative category ID (should fail)
    console.log('\n4. 🔴 Testing Negative Category ID (should fail):');
    try {
      await axios.get(`${BASE_URL}/api/subcategories/-1`);
      console.log('   ❌ ERROR: Negative category ID was accepted!');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('   ✅ Negative category ID correctly rejected:', error.response.data);
      } else {
        console.log('   ⚠️ Unexpected error:', error.response?.status);
      }
    }

    // Test 5: XSS attempt in category ID (should fail)
    console.log('\n5. 🔴 Testing XSS Attack in Category ID (should fail):');
    try {
      await axios.get(`${BASE_URL}/api/subcategories/<script>alert('xss')</script>`);
      console.log('   ❌ ERROR: XSS attack was accepted!');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('   ✅ XSS attack correctly rejected:', error.response.data);
      } else {
        console.log('   ⚠️ Unexpected error:', error.response?.status);
      }
    }

    // Test 6: Valid registration (should work)
    console.log('\n6. 🟢 Testing Valid Registration (should work):');
    try {
      const validRegistration = await axios.post(`${BASE_URL}/api/auth/register`, {
        username: 'testuser123',
        email: 'test@example.com',
        password: 'SecurePass123'
      });
      console.log('   ✅ Valid registration accepted');
    } catch (error) {
      if (error.response?.status === 409) {
        console.log('   ℹ️ User already exists (expected if ran before)');
      } else {
        console.log('   ⚠️ Registration error:', error.response?.data);
      }
    }

    // Test 7: Invalid email (should fail)
    console.log('\n7. 🔴 Testing Invalid Email (should fail):');
    try {
      await axios.post(`${BASE_URL}/api/auth/register`, {
        username: 'testuser456',
        email: 'invalid-email',
        password: 'SecurePass123'
      });
      console.log('   ❌ ERROR: Invalid email was accepted!');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('   ✅ Invalid email correctly rejected:', error.response.data);
      } else {
        console.log('   ⚠️ Unexpected error:', error.response?.status);
      }
    }

    // Test 8: XSS attempt in username (should fail)
    console.log('\n8. 🔴 Testing XSS Attack in Username (should fail):');
    try {
      await axios.post(`${BASE_URL}/api/auth/register`, {
        username: '<script>alert("xss")</script>',
        email: 'test2@example.com',
        password: 'SecurePass123'
      });
      console.log('   ❌ ERROR: XSS attack in username was accepted!');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('   ✅ XSS attack in username correctly rejected:', error.response.data);
      } else {
        console.log('   ⚠️ Unexpected error:', error.response?.status);
      }
    }

    // Test 9: Weak password (should fail)
    console.log('\n9. 🔴 Testing Weak Password (should fail):');
    try {
      await axios.post(`${BASE_URL}/api/auth/register`, {
        username: 'testuser789',
        email: 'test3@example.com',
        password: 'weak'
      });
      console.log('   ❌ ERROR: Weak password was accepted!');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('   ✅ Weak password correctly rejected:', error.response.data);
      } else {
        console.log('   ⚠️ Unexpected error:', error.response?.status);
      }
    }

    // Test 10: SQL Injection attempt (should fail)
    console.log('\n10. 🔴 Testing SQL Injection Attempt (should fail):');
    try {
      await axios.post(`${BASE_URL}/api/auth/register`, {
        username: "'; DROP TABLE users; --",
        email: 'test4@example.com',
        password: 'SecurePass123'
      });
      console.log('   ❌ ERROR: SQL injection attempt was accepted!');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('   ✅ SQL injection attempt correctly rejected:', error.response.data);
      } else {
        console.log('   ⚠️ Unexpected error:', error.response?.status);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the tests
console.log('🚀 Starting API validation tests...\n');
testAPI().then(() => {
  console.log('\n🎉 Input Validation API Tests Complete!');
  console.log('✅ If you see validation rejections, your security is working!');
  console.log('❌ If attacks are accepted, there might be an issue.');
}).catch(error => {
  console.error('❌ Test suite failed:', error.message);
}); 