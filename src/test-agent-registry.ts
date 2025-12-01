/**
 * Agent Registry Test & Validation Script
 * 
 * Tests the agent registry loader and runtime
 */

import {
  getAgentConfig,
  getAllAgents,
  getAgentsByGroup,
  getAgentStats,
  validateRegistry,
  runAgent,
} from './agents/agentRegistry';

console.log('🧪 Testing Agent Registry System\n');

// Test 1: Load registry and get stats
console.log('1️⃣  Loading registry and checking stats...');
try {
  const stats = getAgentStats();
  console.log(`   ✅ Loaded ${stats.total_agents} agents, ${stats.total_tools} tools`);
  console.log(`   📊 Groups:`, stats.groups);
  console.log(`   🤖 Models:`, stats.models);
} catch (error: any) {
  console.error(`   ❌ Failed to load registry:`, error.message);
  process.exit(1);
}

// Test 2: Validate registry
console.log('\n2️⃣  Validating registry configuration...');
const errors = validateRegistry();
if (errors.length === 0) {
  console.log('   ✅ Registry validation passed');
} else {
  console.error('   ❌ Registry validation failed:');
  errors.forEach((err) => console.error(`      - ${err}`));
  process.exit(1);
}

// Test 3: Get specific agent config
console.log('\n3️⃣  Getting specific agent config...');
const taxRwAgent = getAgentConfig('tax-corp-rw-027');
if (taxRwAgent) {
  console.log(`   ✅ Found agent: ${taxRwAgent.label}`);
  console.log(`   📋 Group: ${taxRwAgent.group}`);
  console.log(`   🤖 Model: ${taxRwAgent.runtime.openai?.model}`);
  console.log(`   🛠️  Tools: ${taxRwAgent.runtime.openai?.tools.join(', ')}`);
  if (taxRwAgent.kb_scopes && taxRwAgent.kb_scopes.length > 0) {
    console.log(`   📚 KB Scopes:`);
    taxRwAgent.kb_scopes.forEach((scope, i) => {
      console.log(`      ${i + 1}. Category: ${scope.category}, Jurisdictions: ${scope.jurisdictions?.join(', ')}`);
    });
  }
} else {
  console.error('   ❌ Agent not found');
}

// Test 4: List agents by group
console.log('\n4️⃣  Listing agents by group...');
const taxAgents = getAgentsByGroup('tax');
console.log(`   ✅ Found ${taxAgents.length} tax agents:`);
taxAgents.slice(0, 5).forEach((agent) => {
  console.log(`      - ${agent.id}: ${agent.label}`);
});
if (taxAgents.length > 5) {
  console.log(`      ... and ${taxAgents.length - 5} more`);
}

// Test 5: Run agent (requires OpenAI API key)
console.log('\n5️⃣  Testing agent execution...');
if (process.env.OPENAI_API_KEY) {
  console.log('   🔄 Running test query...');
  
  runAgent('tax-corp-rw-027', 'What is the corporate income tax rate in Rwanda?')
    .then((result) => {
      console.log(`   ✅ Agent responded successfully`);
      console.log(`   📝 Response: ${result.text.slice(0, 150)}...`);
      console.log(`   🤖 Model used: ${result.model}`);
      if (result.sources && result.sources.length > 0) {
        console.log(`   📚 Sources used:`);
        result.sources.forEach((source) => {
          console.log(`      - ${source.source_name} (similarity: ${(source.similarity * 100).toFixed(1)}%)`);
        });
      }
      console.log('\n✅ All tests passed!\n');
    })
    .catch((error: any) => {
      console.error('   ❌ Agent execution failed:', error.message);
      console.log('\n⚠️  Some tests passed, but agent execution requires valid OPENAI_API_KEY\n');
    });
} else {
  console.log('   ⚠️  Skipping (OPENAI_API_KEY not set)');
  console.log('\n✅ Registry tests passed!\n');
}
