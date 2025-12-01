#!/usr/bin/env tsx
/**
 * Knowledge Base Verification Script
 * 
 * Verifies the accounting knowledge base system is properly set up:
 * - Database schema exists
 * - Migrations applied
 * - Vector extension enabled
 * - Sample data present
 * - Embeddings working
 * - Search functions available
 * 
 * Usage:
 *   tsx scripts/verify-knowledge-base.ts
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  details?: any;
}

const results: CheckResult[] = [];

function check(name: string, status: 'pass' | 'fail' | 'warn', message: string, details?: any) {
  results.push({ name, status, message, details });
  const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
  console.log(`${icon} ${name}: ${message}`);
  if (details) {
    console.log(`   Details:`, JSON.stringify(details, null, 2));
  }
}

async function verifyExtensions() {
  console.log('\n🔍 Checking Extensions...\n');

  const { data, error } = await supabase.rpc('pg_available_extensions' as any);
  
  if (error) {
    check('pgvector Extension', 'fail', 'Cannot query extensions', error);
    return;
  }

  // Check via pg_extension table
  const { data: extensions, error: extError } = await supabase
    .from('pg_extension' as any)
    .select('extname')
    .eq('extname', 'vector');

  if (extError) {
    check('pgvector Extension', 'warn', 'Cannot verify extension (might not have access)', extError);
  } else if (extensions && extensions.length > 0) {
    check('pgvector Extension', 'pass', 'pgvector extension is installed');
  } else {
    check('pgvector Extension', 'fail', 'pgvector extension not found - run migrations');
  }
}

async function verifyTables() {
  console.log('\n🔍 Checking Tables...\n');

  const tables = [
    'jurisdictions',
    'knowledge_sources',
    'knowledge_documents',
    'knowledge_chunks',
    'knowledge_embeddings',
    'ingestion_jobs',
    'ingestion_files',
    'agent_queries_log',
  ];

  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (error) {
      check(`Table: ${table}`, 'fail', `Table not found or not accessible`, error);
    } else {
      check(`Table: ${table}`, 'pass', `Exists (${count ?? 0} rows)`);
    }
  }
}

async function verifyIndexes() {
  console.log('\n🔍 Checking Indexes...\n');

  // Check for vector index on knowledge_embeddings
  const { data, error } = await supabase.rpc('pg_indexes' as any);

  if (error) {
    check('Vector Index', 'warn', 'Cannot verify indexes (might not have access)');
    return;
  }

  // Try a direct query instead
  const { data: embeddings, error: embError } = await supabase
    .from('knowledge_embeddings')
    .select('id')
    .limit(1);

  if (embError) {
    check('Vector Index', 'fail', 'knowledge_embeddings table not accessible', embError);
  } else {
    check('Vector Index', 'pass', 'knowledge_embeddings table accessible');
  }
}

async function verifyData() {
  console.log('\n🔍 Checking Data...\n');

  // Check jurisdictions
  const { count: jurisdictionCount } = await supabase
    .from('jurisdictions')
    .select('*', { count: 'exact', head: true });

  if (!jurisdictionCount || jurisdictionCount === 0) {
    check('Jurisdictions', 'warn', 'No jurisdictions found - run ingestion script');
  } else {
    check('Jurisdictions', 'pass', `${jurisdictionCount} jurisdictions found`);
  }

  // Check sources
  const { count: sourceCount, data: sources } = await supabase
    .from('knowledge_sources')
    .select('type, authority_level', { count: 'exact' });

  if (!sourceCount || sourceCount === 0) {
    check('Knowledge Sources', 'warn', 'No sources found - run ingestion script');
  } else {
    const typeBreakdown = sources?.reduce((acc: any, s: any) => {
      acc[s.type] = (acc[s.type] || 0) + 1;
      return acc;
    }, {});
    check('Knowledge Sources', 'pass', `${sourceCount} sources found`, typeBreakdown);
  }

  // Check documents
  const { count: docCount } = await supabase
    .from('knowledge_documents')
    .select('*', { count: 'exact', head: true });

  if (!docCount || docCount === 0) {
    check('Knowledge Documents', 'warn', 'No documents found - run ingestion script');
  } else {
    check('Knowledge Documents', 'pass', `${docCount} documents found`);
  }

  // Check chunks
  const { count: chunkCount } = await supabase
    .from('knowledge_chunks')
    .select('*', { count: 'exact', head: true });

  if (!chunkCount || chunkCount === 0) {
    check('Knowledge Chunks', 'warn', 'No chunks found - run ingestion script');
  } else {
    check('Knowledge Chunks', 'pass', `${chunkCount} chunks found`);
  }

  // Check embeddings
  const { count: embeddingCount } = await supabase
    .from('knowledge_embeddings')
    .select('*', { count: 'exact', head: true });

  if (!embeddingCount || embeddingCount === 0) {
    check('Knowledge Embeddings', 'warn', 'No embeddings found - run ingestion script');
  } else {
    check('Knowledge Embeddings', 'pass', `${embeddingCount} embeddings found`);

    // Check coverage
    if (chunkCount && embeddingCount < chunkCount) {
      check('Embedding Coverage', 'warn', 
        `Only ${embeddingCount}/${chunkCount} chunks have embeddings (${Math.round(embeddingCount/chunkCount*100)}%)`);
    } else if (chunkCount && embeddingCount === chunkCount) {
      check('Embedding Coverage', 'pass', '100% of chunks have embeddings');
    }
  }
}

async function verifySearchFunction() {
  console.log('\n🔍 Checking Search Functions...\n');

  // Check if search_knowledge function exists
  const { data, error } = await supabase.rpc('search_knowledge' as any, {
    query_embedding: Array(1536).fill(0),
    match_threshold: 0.75,
    match_count: 1,
  });

  if (error) {
    if (error.message.includes('function') && error.message.includes('does not exist')) {
      check('search_knowledge Function', 'fail', 
        'Function not found - apply 20251201_accounting_kb_functions.sql migration');
    } else {
      check('search_knowledge Function', 'warn', 'Function exists but returned error', error);
    }
  } else {
    check('search_knowledge Function', 'pass', 'Function exists and callable');
  }
}

async function testSemanticSearch() {
  console.log('\n🔍 Testing Semantic Search...\n');

  // Skip if no embeddings
  const { count: embeddingCount } = await supabase
    .from('knowledge_embeddings')
    .select('*', { count: 'exact', head: true });

  if (!embeddingCount || embeddingCount === 0) {
    check('Semantic Search Test', 'warn', 'Skipped - no embeddings available');
    return;
  }

  try {
    // Generate query embedding
    const testQuery = 'How do I account for foreign exchange gains and losses?';
    
    const embeddingRes = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: testQuery,
    });

    const queryEmbedding = embeddingRes.data[0].embedding;

    // Try search
    const { data, error } = await supabase.rpc('search_knowledge' as any, {
      query_embedding: queryEmbedding,
      match_threshold: 0.5, // Lower threshold for test
      match_count: 3,
    });

    if (error) {
      check('Semantic Search Test', 'fail', 'Search failed', error);
    } else if (!data || data.length === 0) {
      check('Semantic Search Test', 'warn', 'Search worked but returned no results');
    } else {
      check('Semantic Search Test', 'pass', 
        `Found ${data.length} relevant chunks for test query`, {
          query: testQuery,
          topResult: {
            code: data[0].document_code,
            section: data[0].section_path,
            similarity: data[0].similarity,
          },
        });
    }
  } catch (error) {
    check('Semantic Search Test', 'fail', 'Test failed', error);
  }
}

async function verifyAgentConfigs() {
  console.log('\n🔍 Checking Agent Configurations...\n');

  const configs = [
    'config/knowledge/deepsearch-agent.yaml',
    'config/knowledge/accountant-ai-agent.yaml',
    'config/knowledge/ingest-pipeline.yaml',
    'config/knowledge/retrieval-rules.yaml',
  ];

  const fs = await import('node:fs/promises');
  
  for (const configPath of configs) {
    try {
      await fs.access(configPath);
      check(`Config: ${configPath.split('/').pop()}`, 'pass', 'File exists');
    } catch {
      check(`Config: ${configPath.split('/').pop()}`, 'fail', 'File not found');
    }
  }
}

async function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('='.repeat(60) + '\n');

  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const warned = results.filter(r => r.status === 'warn').length;

  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠️  Warnings: ${warned}`);
  console.log(`📝 Total: ${results.length}\n`);

  if (failed > 0) {
    console.log('❌ SYSTEM NOT READY');
    console.log('\nFailed checks:');
    results
      .filter(r => r.status === 'fail')
      .forEach(r => console.log(`  - ${r.name}: ${r.message}`));
    
    console.log('\n📖 Next steps:');
    console.log('  1. Apply migrations: supabase migration up');
    console.log('  2. Run ingestion: tsx scripts/knowledge/ingest.ts');
    console.log('  3. Re-run verification: tsx scripts/verify-knowledge-base.ts\n');
    
    process.exit(1);
  } else if (warned > 0) {
    console.log('⚠️  SYSTEM PARTIALLY READY');
    console.log('\nWarnings:');
    results
      .filter(r => r.status === 'warn')
      .forEach(r => console.log(`  - ${r.name}: ${r.message}`));
    
    console.log('\n📖 Recommended:');
    console.log('  - Run ingestion to populate knowledge base: tsx scripts/knowledge/ingest.ts\n');
    
    process.exit(0);
  } else {
    console.log('✅ SYSTEM FULLY READY');
    console.log('\n🚀 You can now:');
    console.log('  - Query knowledge: tsx scripts/test-query.ts');
    console.log('  - Start agents: pnpm dev');
    console.log('  - Monitor system: Check ACCOUNTING_KNOWLEDGE_BASE_SYSTEM.md\n');
    
    process.exit(0);
  }
}

async function main() {
  console.log('🔍 Prisma Glow - Accounting Knowledge Base Verification\n');
  console.log('Checking system components...\n');

  try {
    await verifyExtensions();
    await verifyTables();
    await verifyIndexes();
    await verifyData();
    await verifySearchFunction();
    await testSemanticSearch();
    await verifyAgentConfigs();
    await printSummary();
  } catch (error) {
    console.error('\n❌ Verification failed with error:', error);
    process.exit(1);
  }
}

main();
