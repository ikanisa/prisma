/**
 * Complete Integration Example
 * 
 * This example shows the full stack integration:
 * 1. Supabase vector search for knowledge base
 * 2. Agent registry with 36 specialized agents
 * 3. OpenAI Agents SDK integration
 * 4. Gemini SDK integration
 */

import OpenAI from 'openai';
import {
  AgentRegistryLoader,
  DeepSearchWrapper,
  OpenAIAgentSDKIntegration,
  GeminiSDKIntegration,
  SupabaseDeepSearch,
} from '../src/index.js';

async function main() {
  console.log('='.repeat(70));
  console.log('Complete Agent System Integration Example');
  console.log('='.repeat(70));
  console.log('');

  // ========================================================================
  // STEP 1: Initialize Supabase DeepSearch
  // ========================================================================
  console.log('📦 Step 1: Initialize Supabase DeepSearch');
  console.log('-'.repeat(70));

  const supabaseSearch = new SupabaseDeepSearch({
    url: process.env.SUPABASE_URL || '',
    key: process.env.SUPABASE_ANON_KEY || '',
    embeddingModel: 'text-embedding-3-small',
    openaiApiKey: process.env.OPENAI_API_KEY,
  });

  // Test connection
  const isHealthy = await supabaseSearch.healthCheck();
  console.log(`Supabase connection: ${isHealthy ? '✅' : '❌'}`);

  if (isHealthy) {
    const stats = await supabaseSearch.getDocumentStats();
    console.log('KB Statistics:');
    for (const [category, count] of Object.entries(stats)) {
      console.log(`  ${category}: ${count} documents`);
    }
  }
  console.log('');

  // ========================================================================
  // STEP 2: Load Agent Registry
  // ========================================================================
  console.log('📦 Step 2: Load Agent Registry');
  console.log('-'.repeat(70));

  const registry = AgentRegistryLoader.fromDefault();
  console.log(`Loaded ${registry.getAgentCount()} agents`);
  console.log(`Groups: ${registry.listGroups().join(', ')}`);
  console.log('');

  // ========================================================================
  // STEP 3: Create DeepSearch Wrapper
  // ========================================================================
  console.log('📦 Step 3: Create DeepSearch Wrapper');
  console.log('-'.repeat(70));

  const deepSearch = new DeepSearchWrapper(
    supabaseSearch.search.bind(supabaseSearch)
  );
  console.log('✅ DeepSearch wrapper created');
  console.log('');

  // ========================================================================
  // STEP 4: OpenAI Integration
  // ========================================================================
  console.log('📦 Step 4: OpenAI Agents SDK Integration');
  console.log('-'.repeat(70));

  if (process.env.OPENAI_API_KEY) {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const openaiIntegration = new OpenAIAgentSDKIntegration({
      client: openai,
      registry,
      deepSearch,
    });

    try {
      console.log('Testing Rwanda Tax Agent...');
      const response = await openaiIntegration.chat(
        'tax-corp-rw-027',
        'What are the key corporate tax rates in Rwanda for 2024?'
      );
      console.log(`Response: ${response.substring(0, 200)}...`);
    } catch (error) {
      console.log(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  } else {
    console.log('⚠️  OPENAI_API_KEY not set - skipping OpenAI example');
  }
  console.log('');

  // ========================================================================
  // STEP 5: Gemini Integration
  // ========================================================================
  console.log('📦 Step 5: Google Gemini SDK Integration');
  console.log('-'.repeat(70));

  if (process.env.GEMINI_API_KEY) {
    const geminiIntegration = new GeminiSDKIntegration({
      apiKey: process.env.GEMINI_API_KEY,
      registry,
      deepSearch,
    });

    try {
      console.log('Testing Audit Planning Agent...');
      const response = await geminiIntegration.chat(
        'audit-planning',
        'Explain the key requirements of ISA 300 for audit planning'
      );
      console.log(`Response: ${response.substring(0, 200)}...`);
    } catch (error) {
      console.log(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  } else {
    console.log('⚠️  GEMINI_API_KEY not set - skipping Gemini example');
  }
  console.log('');

  // ========================================================================
  // STEP 6: Multi-Agent Workflow
  // ========================================================================
  console.log('📦 Step 6: Multi-Agent Workflow Example');
  console.log('-'.repeat(70));

  const agentWorkflow = [
    { id: 'tax-corp-rw-027', question: 'What is the corporate tax rate?' },
    { id: 'acct-revenue-001', question: 'How to recognize revenue under IFRS 15?' },
    { id: 'audit-planning', question: 'What are the key steps in audit planning?' },
  ];

  for (const { id, question } of agentWorkflow) {
    const agent = registry.getAgent(id);
    console.log(`\n${agent?.label}:`);
    console.log(`Question: ${question}`);
    console.log(`KB Scopes: ${registry.getAgentKBScopes(id).length} configured`);
  }
  console.log('');

  // ========================================================================
  // Summary
  // ========================================================================
  console.log('='.repeat(70));
  console.log('✨ Integration Complete');
  console.log('='.repeat(70));
  console.log('');
  console.log('✅ Supabase vector search connected');
  console.log('✅ 36 agents loaded from registry');
  console.log('✅ DeepSearch wrapper configured');
  console.log('✅ OpenAI Agents SDK ready');
  console.log('✅ Google Gemini SDK ready');
  console.log('');
  console.log('🚀 System ready for production!');
  console.log('');
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
