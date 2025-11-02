#!/usr/bin/env node
/**
 * Test Finance Review API Authentication on Staging
 * 
 * This script tests the authentication and authorization flows
 * for the /api/review/run endpoint on the staging environment.
 */

const https = require('https');
const http = require('http');

// Configuration from environment
const STAGING_BASE_URL = process.env.STAGING_BASE_URL || 'https://staging.prismaglow.example.com';
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL;
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD;
const TEST_ORG_ID = process.env.TEST_ORG_ID;

// Test results
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

/**
 * Make HTTP/HTTPS request
 */
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const lib = urlObj.protocol === 'https:' ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };
    
    const req = lib.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const body = data ? JSON.parse(data) : null;
          resolve({ status: res.statusCode, headers: res.headers, body });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

/**
 * Test unauthenticated request
 */
async function testUnauthenticated() {
  console.log('\n🧪 Test 1: Unauthenticated request should return 401');
  
  try {
    const response = await makeRequest(`${STAGING_BASE_URL}/api/review/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        orgId: TEST_ORG_ID || '00000000-0000-0000-0000-000000000000',
        hours: 24,
      },
    });
    
    if (response.status === 401) {
      console.log('✅ PASS: Received 401 Unauthorized');
      results.passed++;
      results.tests.push({ name: 'Unauthenticated request', status: 'PASS' });
      return true;
    } else {
      console.log(`❌ FAIL: Expected 401, got ${response.status}`);
      console.log('Response:', response.body);
      results.failed++;
      results.tests.push({ name: 'Unauthenticated request', status: 'FAIL', detail: `Got ${response.status}` });
      return false;
    }
  } catch (error) {
    console.log(`❌ FAIL: ${error.message}`);
    results.failed++;
    results.tests.push({ name: 'Unauthenticated request', status: 'ERROR', detail: error.message });
    return false;
  }
}

/**
 * Test with invalid credentials
 */
async function testInvalidCredentials() {
  console.log('\n🧪 Test 2: Invalid credentials should return 401');
  
  try {
    const response = await makeRequest(`${STAGING_BASE_URL}/api/review/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'invalid-session=invalid-value',
      },
      body: {
        orgId: TEST_ORG_ID || '00000000-0000-0000-0000-000000000000',
        hours: 24,
      },
    });
    
    if (response.status === 401) {
      console.log('✅ PASS: Received 401 Unauthorized');
      results.passed++;
      results.tests.push({ name: 'Invalid credentials', status: 'PASS' });
      return true;
    } else {
      console.log(`❌ FAIL: Expected 401, got ${response.status}`);
      results.failed++;
      results.tests.push({ name: 'Invalid credentials', status: 'FAIL', detail: `Got ${response.status}` });
      return false;
    }
  } catch (error) {
    console.log(`❌ FAIL: ${error.message}`);
    results.failed++;
    results.tests.push({ name: 'Invalid credentials', status: 'ERROR', detail: error.message });
    return false;
  }
}

/**
 * Test unauthorized org access
 */
async function testUnauthorizedOrg() {
  console.log('\n🧪 Test 3: Access to unauthorized org should return 403');
  console.log('⚠️  Skipping: Requires valid session token (implement in E2E tests)');
  results.tests.push({ name: 'Unauthorized org access', status: 'SKIP', detail: 'Requires E2E test framework' });
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('🚀 Starting Finance Review API Authentication Tests');
  console.log(`📍 Target: ${STAGING_BASE_URL}`);
  console.log('=' .repeat(60));
  
  await testUnauthenticated();
  await testInvalidCredentials();
  await testUnauthorizedOrg();
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Results Summary:');
  console.log(`   ✅ Passed: ${results.passed}`);
  console.log(`   ❌ Failed: ${results.failed}`);
  console.log(`   ⏭️  Skipped: ${results.tests.filter(t => t.status === 'SKIP').length}`);
  console.log('=' .repeat(60));
  
  // Exit with error if any tests failed
  if (results.failed > 0) {
    console.log('\n❌ Some tests failed. Review the output above.');
    process.exit(1);
  } else {
    console.log('\n✅ All executable tests passed!');
    process.exit(0);
  }
}

// Run tests
runTests().catch((error) => {
  console.error('💥 Test runner failed:', error);
  process.exit(1);
});
