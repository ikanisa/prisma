/**
 * MCP Server Test Script
 * 
 * Tests the MCP server endpoints
 */

import { config } from 'dotenv';

config();

async function testMCPServer() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const mcpUrl = `${baseUrl}/api/mcp`;
  
  console.log('Testing MCP Server...\n');
  
  // Step 1: Test GET endpoint (capabilities)
  console.log('1. Testing GET /api/mcp (capabilities)...');
  try {
    const response = await fetch(mcpUrl);
    const data = await response.json();
    
    if (data.capabilities) {
      console.log('✅ MCP server responds to GET');
      console.log(`   Tools: ${data.capabilities.tools || 0}`);
      console.log(`   Routing Rules: ${data.capabilities.routingRules || 0}`);
    } else {
      console.error('❌ Unexpected response format');
    }
  } catch (error) {
    console.error('❌ Failed to test GET endpoint:', error);
  }
  
  // Step 2: Test tools/list
  console.log('\n2. Testing tools/list...');
  try {
    const response = await fetch(mcpUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
      }),
    });
    
    const data = await response.json();
    
    if (data.result && data.result.tools) {
      console.log('✅ tools/list works');
      console.log(`   Available tools: ${data.result.tools.length}`);
      data.result.tools.slice(0, 5).forEach((tool: any) => {
        console.log(`   - ${tool.name}: ${tool.description?.substring(0, 50)}...`);
      });
    } else {
      console.error('❌ Unexpected response format');
      console.error(JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('❌ Failed to test tools/list:', error);
  }
  
  // Step 3: Test tools/call (without auth - should fail)
  console.log('\n3. Testing tools/call (without auth - should fail)...');
  try {
    const response = await fetch(mcpUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'whoami',
          arguments: {},
        },
      }),
    });
    
    const data = await response.json();
    
    if (data.error && data.error.code === -32000) {
      console.log('✅ Authentication required (as expected)');
    } else if (data.error) {
      console.log(`⚠️  Got error: ${data.error.message}`);
    } else {
      console.log('⚠️  Unexpected: request succeeded without auth');
    }
  } catch (error) {
    console.error('❌ Failed to test tools/call:', error);
  }
  
  console.log('\n✅ MCP server test complete!');
  console.log('\nNote: To test authenticated endpoints, provide a valid JWT token:');
  console.log('  Authorization: Bearer <token>');
}

testMCPServer().catch(console.error);

