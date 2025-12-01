/**
 * Test Search Script
 * Tests the accounting knowledge base search functionality
 * 
 * Usage:
 *   tsx scripts/knowledge/test-search.ts "How do I account for foreign exchange gains?"
 */

import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

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
  source_name: string;
  source_type: string;
  authority_level: string;
  jurisdiction_code: string;
  section_path: string;
  heading: string;
  content: string;
  similarity: number;
}

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
    encoding_format: "float",
  });

  return response.data[0].embedding;
}

async function searchKnowledge(
  query: string,
  options: {
    threshold?: number;
    count?: number;
    jurisdictionId?: string;
    types?: string[];
    authorityLevels?: string[];
  } = {}
): Promise<SearchResult[]> {
  console.log(`\n🔍 Searching for: "${query}"\n`);

  const embedding = await generateEmbedding(query);

  const { data, error } = await supabase.rpc("search_knowledge_semantic", {
    query_embedding: JSON.stringify(embedding),
    match_threshold: options.threshold || 0.75,
    match_count: options.count || 10,
    filter_jurisdiction_id: options.jurisdictionId || null,
    filter_types: options.types || null,
    filter_authority_levels: options.authorityLevels || null,
  });

  if (error) {
    console.error("Search error:", error);
    throw error;
  }

  return data || [];
}

async function logQuery(
  agentName: string,
  query: string,
  results: SearchResult[],
  latencyMs: number
) {
  await supabase.from("agent_queries_log").insert({
    agent_name: agentName,
    query_text: query,
    top_chunk_ids: results.slice(0, 6).map((r) => r.chunk_id),
    latency_ms: latencyMs,
    metadata: {
      result_count: results.length,
      avg_similarity: results.reduce((sum, r) => sum + r.similarity, 0) / results.length,
    },
  });
}

function displayResults(results: SearchResult[]) {
  if (results.length === 0) {
    console.log("❌ No results found\n");
    return;
  }

  console.log(`✅ Found ${results.length} results:\n`);

  results.forEach((result, idx) => {
    console.log(`${idx + 1}. ${result.document_code} - ${result.document_title}`);
    console.log(`   Authority: ${result.authority_level}`);
    console.log(`   Jurisdiction: ${result.jurisdiction_code}`);
    console.log(`   Similarity: ${(result.similarity * 100).toFixed(1)}%`);
    
    if (result.section_path) {
      console.log(`   Section: ${result.section_path}`);
    }
    if (result.heading) {
      console.log(`   Heading: ${result.heading}`);
    }
    
    const preview = result.content.substring(0, 200).replace(/\s+/g, " ");
    console.log(`   Preview: ${preview}...`);
    console.log();
  });
}

async function testSearch() {
  const query = process.argv[2] || "How do I account for foreign exchange gains and losses?";

  const startTime = Date.now();
  const results = await searchKnowledge(query, {
    threshold: 0.7,
    count: 5,
    types: ["IFRS", "IAS"],
    authorityLevels: ["PRIMARY"],
  });
  const latencyMs = Date.now() - startTime;

  displayResults(results);

  console.log(`⏱️  Query time: ${latencyMs}ms\n`);

  await logQuery("TestScript", query, results, latencyMs);
  console.log("✓ Query logged to agent_queries_log\n");
}

async function testMultipleQueries() {
  const queries = [
    "How do I account for foreign exchange gains and losses?",
    "What is the treatment of lease modifications under IFRS 16?",
    "How do I recognize revenue from contracts with customers?",
    "What are the disclosure requirements for income taxes?",
    "How do I assess risks of material misstatement in an audit?",
  ];

  console.log("🧪 Running multiple test queries...\n");

  for (const query of queries) {
    const startTime = Date.now();
    const results = await searchKnowledge(query, {
      threshold: 0.75,
      count: 3,
    });
    const latencyMs = Date.now() - startTime;

    console.log(`Query: "${query}"`);
    console.log(`Results: ${results.length}, Latency: ${latencyMs}ms`);
    
    if (results.length > 0) {
      console.log(`Top result: ${results[0].document_code} (${(results[0].similarity * 100).toFixed(1)}%)`);
    }
    
    console.log();

    await logQuery("TestScript", query, results, latencyMs);
  }

  console.log("✅ All test queries completed\n");
}

async function showStats() {
  console.log("📊 Knowledge Base Statistics\n");

  const { data: sources } = await supabase
    .from("knowledge_sources")
    .select("type, count:id.count()")
    .group("type");

  console.log("Sources by type:");
  sources?.forEach((s) => {
    console.log(`  ${s.type}: ${s.count}`);
  });

  const { data: documents } = await supabase
    .from("knowledge_documents")
    .select("count:id.count()");

  console.log(`\nTotal documents: ${documents?.[0]?.count || 0}`);

  const { data: chunks } = await supabase
    .from("knowledge_chunks")
    .select("count:id.count()");

  console.log(`Total chunks: ${chunks?.[0]?.count || 0}`);

  const { data: embeddings } = await supabase
    .from("knowledge_embeddings")
    .select("count:id.count()");

  console.log(`Total embeddings: ${embeddings?.[0]?.count || 0}\n`);
}

async function main() {
  const command = process.argv[2];

  if (command === "--stats") {
    await showStats();
  } else if (command === "--test-all") {
    await testMultipleQueries();
  } else {
    await testSearch();
  }
}

main().catch((err) => {
  console.error("\n❌ Error:", err);
  process.exit(1);
});
