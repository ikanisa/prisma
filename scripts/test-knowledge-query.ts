#!/usr/bin/env tsx
/**
 * Test Knowledge Base Query
 * 
 * Demonstrates how to query the accounting knowledge base
 * 
 * Usage:
 *   tsx scripts/test-knowledge-query.ts "How do I account for foreign exchange gains?"
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

interface SearchResult {
  chunk_id: string;
  document_id: string;
  document_code: string;
  document_title: string;
  section_path: string;
  content: string;
  similarity: number;
  authority_level: string;
  jurisdiction_code: string;
  source_url: string;
}

async function queryKnowledge(
  question: string,
  options: {
    jurisdiction?: string;
    types?: string[];
    authorityLevels?: string[];
    topK?: number;
    minSimilarity?: number;
  } = {}
): Promise<SearchResult[]> {
  console.log(`\n🔍 Query: "${question}"\n`);

  // 1. Generate query embedding
  console.log('→ Generating query embedding...');
  const embeddingRes = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: question,
    encoding_format: 'float',
  });

  const queryEmbedding = embeddingRes.data[0].embedding;
  console.log(`✓ Embedding generated (${queryEmbedding.length} dimensions)\n`);

  // 2. Semantic search
  console.log('→ Searching knowledge base...');
  const { data, error } = await supabase.rpc('search_knowledge', {
    query_embedding: queryEmbedding,
    match_threshold: options.minSimilarity ?? 0.75,
    match_count: options.topK ?? 6,
    filter_jurisdiction: options.jurisdiction ?? null,
    filter_types: options.types ?? null,
    filter_authority: options.authorityLevels ?? null,
  });

  if (error) {
    console.error('✗ Search failed:', error);
    throw error;
  }

  console.log(`✓ Found ${data.length} relevant chunks\n`);

  return data as SearchResult[];
}

function formatResults(results: SearchResult[]) {
  console.log('=' .repeat(80));
  console.log('📚 SEARCH RESULTS');
  console.log('='.repeat(80) + '\n');

  if (results.length === 0) {
    console.log('No results found.\n');
    return;
  }

  results.forEach((result, idx) => {
    console.log(`${idx + 1}. ${result.document_code || 'Unnamed'} - ${result.document_title}`);
    console.log(`   Section: ${result.section_path || 'N/A'}`);
    console.log(`   Similarity: ${(result.similarity * 100).toFixed(1)}%`);
    console.log(`   Authority: ${result.authority_level}`);
    console.log(`   Jurisdiction: ${result.jurisdiction_code}`);
    console.log(`   URL: ${result.source_url || 'N/A'}`);
    console.log(`   Content Preview: ${result.content.substring(0, 200)}...`);
    console.log('');
  });

  console.log('='.repeat(80) + '\n');
}

function generateAnswer(question: string, results: SearchResult[]): string {
  if (results.length === 0) {
    return 'I could not find any authoritative sources to answer this question. Please rephrase or provide more context.';
  }

  // Group by document
  const byDocument = results.reduce((acc, r) => {
    const key = r.document_code || r.document_title;
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  let answer = `Based on the knowledge base, here's what I found:\n\n`;

  // Primary sources first
  const primarySources = results.filter(r => r.authority_level === 'PRIMARY');
  if (primarySources.length > 0) {
    answer += `**Primary Sources:**\n\n`;
    
    Object.entries(byDocument).forEach(([doc, chunks]) => {
      if (chunks[0].authority_level !== 'PRIMARY') return;
      
      answer += `**${doc}** (${chunks[0].jurisdiction_code})\n`;
      answer += `${chunks[0].content.substring(0, 300)}...\n\n`;
      answer += `Citation: ${doc}${chunks[0].section_path ? '.' + chunks[0].section_path : ''}\n`;
      answer += `Source: ${chunks[0].source_url || 'Internal'}\n\n`;
    });
  }

  // Secondary sources
  const secondarySources = results.filter(r => r.authority_level === 'SECONDARY');
  if (secondarySources.length > 0) {
    answer += `**Additional Commentary:**\n\n`;
    
    Object.entries(byDocument).forEach(([doc, chunks]) => {
      if (chunks[0].authority_level !== 'SECONDARY') return;
      
      answer += `**${doc}**\n`;
      answer += `${chunks[0].content.substring(0, 200)}...\n\n`;
    });
  }

  // Confidence
  const avgSimilarity = results.reduce((sum, r) => sum + r.similarity, 0) / results.length;
  const confidence = avgSimilarity > 0.85 ? 'High' : avgSimilarity > 0.75 ? 'Medium' : 'Low';
  
  answer += `\n**Confidence Level:** ${confidence} (${(avgSimilarity * 100).toFixed(1)}%)\n`;
  answer += `**Sources Used:** ${results.length} chunks from ${Object.keys(byDocument).length} documents\n`;

  return answer;
}

async function main() {
  console.log('🚀 Prisma Glow - Knowledge Base Query Test\n');

  const question = process.argv[2] || 'How do I account for foreign exchange gains and losses?';

  try {
    // Test semantic search
    const results = await queryKnowledge(question, {
      types: ['IFRS', 'IAS', 'ISA'],
      authorityLevels: ['PRIMARY', 'SECONDARY'],
      topK: 6,
      minSimilarity: 0.7,
    });

    // Format and display results
    formatResults(results);

    // Generate answer
    console.log('💡 GENERATED ANSWER');
    console.log('='.repeat(80));
    const answer = generateAnswer(question, results);
    console.log(answer);
    console.log('='.repeat(80) + '\n');

    // Log query for audit
    await supabase.from('agent_queries_log').insert({
      agent_name: 'TestQuery',
      query_text: question,
      response_summary: answer.substring(0, 500),
      top_chunk_ids: results.map(r => r.chunk_id),
      latency_ms: 0,
      metadata: {
        test: true,
        results_count: results.length,
        avg_similarity: results.reduce((sum, r) => sum + r.similarity, 0) / results.length,
      },
    });

    console.log('✅ Query logged to agent_queries_log\n');

  } catch (error) {
    console.error('❌ Query failed:', error);
    process.exit(1);
  }
}

main();
