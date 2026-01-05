/**
 * Complete Test Suite
 * 
 * Runs all tests for production readiness
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function runTests() {
  console.log('🚀 Running Complete Test Suite\n');
  console.log('='.repeat(50));
  
  const tests = [
    { name: 'OAuth Flow', script: 'test-oauth.ts' },
    { name: 'MCP Server', script: 'test-mcp.ts' },
    { name: 'ChatGPT UI', script: 'test-chatgpt-ui.ts' },
  ];
  
  for (const test of tests) {
    console.log(`\n📋 Running ${test.name} test...`);
    console.log('-'.repeat(50));
    
    try {
      const { stdout, stderr } = await execAsync(
        `npx tsx scripts/${test.script}`,
        { cwd: process.cwd() }
      );
      
      if (stdout) console.log(stdout);
      if (stderr) console.error(stderr);
    } catch (error: any) {
      console.error(`❌ ${test.name} test failed:`, error.message);
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ Test suite complete!');
  console.log('\nReview the output above for any issues.');
}

runTests().catch(console.error);

