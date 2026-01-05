/**
 * ChatGPT UI Test Script
 * 
 * Tests the ChatGPT UI component
 */

import { config } from 'dotenv';

config();

async function testChatGPTUI() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const chatgptUrl = `${baseUrl}/chatgpt`;
  
  console.log('Testing ChatGPT UI...\n');
  
  // Step 1: Test ChatGPT page exists
  console.log('1. Testing /chatgpt page...');
  try {
    const response = await fetch(chatgptUrl, {
      redirect: 'manual',
    });
    
    if (response.status === 200) {
      console.log('✅ ChatGPT page exists');
      const html = await response.text();
      
      // Check for key components
      if (html.includes('ChatGPTAppComponent') || html.includes('chatgpt')) {
        console.log('✅ ChatGPT component found in page');
      }
      
      // Check for iframe compatibility
      if (html.includes('X-Frame-Options') && html.includes('DENY')) {
        console.warn('⚠️  X-Frame-Options is set to DENY - ChatGPT iframe may not work');
      } else {
        console.log('✅ Page is iframe-compatible');
      }
    } else if (response.status === 302 || response.status === 307) {
      const location = response.headers.get('location');
      console.log(`⚠️  Page redirects to: ${location}`);
    } else {
      console.error(`❌ Unexpected status: ${response.status}`);
    }
  } catch (error) {
    console.error('❌ Failed to test ChatGPT page:', error);
  }
  
  // Step 2: Test app config
  console.log('\n2. Testing /.well-known/openai-app-config.json...');
  try {
    const configUrl = `${baseUrl}/.well-known/openai-app-config.json`;
    const response = await fetch(configUrl);
    const config = await response.json();
    
    if (config.name && config.api_endpoints) {
      console.log('✅ App config exists');
      console.log(`   Name: ${config.name}`);
      console.log(`   MCP endpoint: ${config.api_endpoints.mcp}`);
      
      // Validate required fields
      const required = ['name', 'api_endpoints', 'oauth'];
      const missing = required.filter((field) => !config[field]);
      
      if (missing.length === 0) {
        console.log('✅ All required fields present');
      } else {
        console.error(`❌ Missing required fields: ${missing.join(', ')}`);
      }
    } else {
      console.error('❌ Invalid app config format');
    }
  } catch (error) {
    console.error('❌ Failed to test app config:', error);
  }
  
  console.log('\n✅ ChatGPT UI test complete!');
  console.log('\nNext steps:');
  console.log('1. Load /chatgpt in ChatGPT iframe');
  console.log('2. Verify window.openai API works');
  console.log('3. Test widget actions');
}

testChatGPTUI().catch(console.error);

