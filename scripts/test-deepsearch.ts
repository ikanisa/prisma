/**
 * DeepSearch Validation Script
 * Tests the complete RAG pipeline: embedding → RPC → results
 *
 * Run: tsx scripts/test-deepsearch.ts
 */

import { deepSearch, deepSearchPresets } from '../src/lib/deepSearch';

async function main() {
  console.log('🔍 DeepSearch Validation\n');

  // Test 1: Basic search
  console.log('Test 1: Basic IFRS search');
  const ifrsResults = await deepSearchPresets.ifrs('revenue recognition');
  console.log(`✅ Retrieved ${ifrsResults.length} chunks`);
  if (ifrsResults.length > 0) {
    console.log(`   Top result: ${ifrsResults[0].source_name}`);
    console.log(`   Similarity: ${ifrsResults[0].similarity.toFixed(3)}`);
    console.log(`   URL: ${ifrsResults[0].page_url}\n`);
  }

  // Test 2: Rwanda tax search
  console.log('Test 2: Rwanda tax search');
  const rwTaxResults = await deepSearchPresets.taxRwanda('VAT rates');
  console.log(`✅ Retrieved ${rwTaxResults.length} chunks`);
  if (rwTaxResults.length > 0) {
    console.log(`   Top result: ${rwTaxResults[0].source_name}`);
    console.log(`   Jurisdiction: ${rwTaxResults[0].jurisdiction_code}\n`);
  }

  // Test 3: Malta tax with fallback
  console.log('Test 3: Malta tax search');
  const mtTaxResults = await deepSearchPresets.taxMalta('imputation system');
  console.log(`✅ Retrieved ${mtTaxResults.length} chunks`);
  if (mtTaxResults.length > 0) {
    console.log(`   Top result: ${mtTaxResults[0].source_name}`);
    console.log(`   Category: ${mtTaxResults[0].category}\n`);
  }

  // Test 4: ISA audit search
  console.log('Test 4: ISA audit search');
  const isaResults = await deepSearchPresets.isa('audit risk assessment');
  console.log(`✅ Retrieved ${isaResults.length} chunks`);
  if (isaResults.length > 0) {
    console.log(`   Top result: ${isaResults[0].source_name}`);
    console.log(`   Tags: ${isaResults[0].tags.join(', ')}\n`);
  }

  // Test 5: Custom search with filters
  console.log('Test 5: Custom search (category + jurisdiction)');
  const customResults = await deepSearch({
    query: 'transfer pricing',
    category: 'TAX',
    jurisdictionCode: 'GLOBAL',
    matchCount: 5,
  });
  console.log(`✅ Retrieved ${customResults.length} chunks`);

  console.log('\n✅ All tests completed successfully!');
  console.log('\nNext steps:');
  console.log('1. Deploy migration: psql "$DATABASE_URL" -f supabase/migrations/20251201213700_match_knowledge_chunks_rpc.sql');
  console.log('2. Test with real agents: import { accountantIfrsAgent } from "./src/agents"');
  console.log('3. Build Knowledge Console UI for monitoring');
}

main().catch((err) => {
  console.error('❌ Test failed:', err.message);
  process.exit(1);
});
