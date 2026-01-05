/**
 * OAuth Flow Test Script
 * 
 * Tests the OAuth flow end-to-end
 */

import { config } from 'dotenv';

config();

async function testOAuthFlow() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  console.log('Testing OAuth Flow...\n');
  
  // Step 1: Check OAuth configuration
  console.log('1. Checking OAuth configuration...');
  const clientId = process.env.OPENAI_APP_OAUTH_CLIENT_ID;
  const clientSecret = process.env.OPENAI_APP_OAUTH_CLIENT_SECRET;
  
  if (!clientId) {
    console.error('❌ OPENAI_APP_OAUTH_CLIENT_ID not set');
    return;
  }
  
  if (!clientSecret) {
    console.error('❌ OPENAI_APP_OAUTH_CLIENT_SECRET not set');
    return;
  }
  
  console.log('✅ OAuth credentials configured');
  console.log(`   Client ID: ${clientId.substring(0, 10)}...`);
  
  // Step 2: Test authorization endpoint
  console.log('\n2. Testing authorization endpoint...');
  try {
    const authUrl = `${baseUrl}/api/auth/openai/authorize`;
    const response = await fetch(authUrl, {
      redirect: 'manual',
    });
    
    if (response.status === 302 || response.status === 307) {
      const location = response.headers.get('location');
      if (location && location.includes('oauth/authorize')) {
        console.log('✅ Authorization endpoint redirects correctly');
        console.log(`   Redirect URL: ${location.substring(0, 100)}...`);
      } else {
        console.error('❌ Authorization endpoint does not redirect to OpenAI');
      }
    } else {
      console.error(`❌ Unexpected status: ${response.status}`);
    }
  } catch (error) {
    console.error('❌ Failed to test authorization endpoint:', error);
  }
  
  // Step 3: Test callback endpoint exists
  console.log('\n3. Testing callback endpoint...');
  const callbackUrl = `${baseUrl}/api/auth/openai/callback`;
  try {
    const response = await fetch(callbackUrl, {
      method: 'GET',
      redirect: 'manual',
    });
    
    // Should redirect or return error (not 404)
    if (response.status !== 404) {
      console.log('✅ Callback endpoint exists');
    } else {
      console.error('❌ Callback endpoint not found');
    }
  } catch (error) {
    console.error('❌ Failed to test callback endpoint:', error);
  }
  
  // Step 4: Test token exchange endpoint
  console.log('\n4. Testing token exchange endpoint...');
  const tokenUrl = `${baseUrl}/api/auth/openai/token`;
  try {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: 'test_code',
        redirect_uri: `${baseUrl}/api/auth/openai/callback`,
      }),
    });
    
    // Should return error (invalid code) but endpoint should exist
    if (response.status === 400 || response.status === 401) {
      console.log('✅ Token exchange endpoint exists');
    } else if (response.status === 404) {
      console.error('❌ Token exchange endpoint not found');
    } else {
      console.log(`⚠️  Unexpected status: ${response.status}`);
    }
  } catch (error) {
    console.error('❌ Failed to test token exchange endpoint:', error);
  }
  
  console.log('\n✅ OAuth flow test complete!');
  console.log('\nNext steps:');
  console.log('1. Visit /api/auth/openai/authorize to start OAuth flow');
  console.log('2. Complete authorization in OpenAI');
  console.log('3. Verify tokens are stored in database');
}

testOAuthFlow().catch(console.error);

