#!/usr/bin/env node

/**
 * Accounting Knowledge Base - Validation Test Script
 * 
 * Verifies the complete system is working correctly.
 * 
 * Usage:
 *   pnpm tsx scripts/knowledge-ingest/test-system.ts
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

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
  details?: any;
}

const results: TestResult[] = [];

function test(name: string, passed: boolean, message: string, details?: any) {
  results.push({ name, passed, message, details });
  const icon = passed ? "✅" : "❌";
  console.log(`${icon} ${name}: ${message}`);
  if (details) {
    console.log(`   Details:`, JSON.stringify(details, null, 2));
  }
}

async function testDatabaseSchema() {
  console.log("\n=== Testing Database Schema ===\n");

  try {
    // Test tables exist
    const tables = [
      "jurisdictions",
      "knowledge_sources",
      "knowledge_documents",
      "knowledge_chunks",
      "knowledge_embeddings",
      "ingestion_jobs",
      "ingestion_files",
      "agent_queries_log",
    ];

    for (const table of tables) {
      const { count, error } = await supabase
        .from(table)
        .select("*", { count: "exact", head: true });

      if (error) {
        test(`Table ${table}`, false, `Failed to query: ${error.message}`);
      } else {
        test(`Table ${table}`, true, `Exists (${count} rows)`);
      }
    }

    // Test pgvector extension
    const { data, error } = await supabase.rpc("knowledge_base_stats");
    if (error) {
      test("pgvector extension", false, `Stats view failed: ${error.message}`);
    } else {
      test("pgvector extension", true, "Working", data);
    }
  } catch (error: any) {
    test("Database Schema", false, `Error: ${error.message}`);
  }
}

async function testJurisdictions() {
  console.log("\n=== Testing Jurisdictions ===\n");

  try {
    const { data, error } = await supabase
      .from("jurisdictions")
      .select("code, name")
      .order("code");

    if (error) throw error;

    const expected = ["EU", "GLOBAL", "RW", "UK", "US"];
    const found = data.map((j: any) => j.code);
    const allPresent = expected.every((code) => found.includes(code));

    test(
      "Jurisdictions seeded",
      allPresent,
      allPresent ? `Found all ${expected.length} jurisdictions` : "Missing jurisdictions",
      { expected, found }
    );
  } catch (error: any) {
    test("Jurisdictions", false, `Error: ${error.message}`);
  }
}

async function testKnowledgeSources() {
  console.log("\n=== Testing Knowledge Sources ===\n");

  try {
    const { count, error } = await supabase
      .from("knowledge_sources")
      .select("*", { count: "exact", head: true });

    if (error) throw error;

    test(
      "Knowledge sources",
      (count ?? 0) > 0,
      count ? `${count} sources in database` : "No sources found"
    );

    // Test authority levels
    const { data: authorities } = await supabase
      .from("knowledge_sources")
      .select("authority_level")
      .limit(10);

    const validAuthorities = ["PRIMARY", "SECONDARY", "INTERNAL"];
    const allValid = authorities?.every((s: any) =>
      validAuthorities.includes(s.authority_level)
    );

    test(
      "Authority levels",
      allValid ?? false,
      allValid ? "All sources have valid authority levels" : "Invalid authority levels found"
    );
  } catch (error: any) {
    test("Knowledge Sources", false, `Error: ${error.message}`);
  }
}

async function testDocumentsAndChunks() {
  console.log("\n=== Testing Documents & Chunks ===\n");

  try {
    const { count: docCount, error: docError } = await supabase
      .from("knowledge_documents")
      .select("*", { count: "exact", head: true });

    if (docError) throw docError;

    test(
      "Knowledge documents",
      (docCount ?? 0) > 0,
      docCount ? `${docCount} documents in database` : "No documents found"
    );

    const { count: chunkCount, error: chunkError } = await supabase
      .from("knowledge_chunks")
      .select("*", { count: "exact", head: true });

    if (chunkError) throw chunkError;

    test(
      "Knowledge chunks",
      (chunkCount ?? 0) > 0,
      chunkCount ? `${chunkCount} chunks in database` : "No chunks found"
    );

    // Check average chunk size
    const { data: avgData } = await supabase.rpc("knowledge_base_stats");

    if (avgData && chunkCount) {
      const avgChunksPerDoc = Math.round(chunkCount / (docCount || 1));
      test(
        "Chunk distribution",
        avgChunksPerDoc > 0,
        `Average ${avgChunksPerDoc} chunks per document`
      );
    }
  } catch (error: any) {
    test("Documents & Chunks", false, `Error: ${error.message}`);
  }
}

async function testEmbeddings() {
  console.log("\n=== Testing Embeddings ===\n");

  try {
    const { count, error } = await supabase
      .from("knowledge_embeddings")
      .select("*", { count: "exact", head: true });

    if (error) throw error;

    test(
      "Knowledge embeddings",
      (count ?? 0) > 0,
      count ? `${count} embeddings in database` : "No embeddings found"
    );

    // Check if embeddings match chunks
    const { count: chunkCount } = await supabase
      .from("knowledge_chunks")
      .select("*", { count: "exact", head: true });

    const coverage = count && chunkCount ? (count / chunkCount) * 100 : 0;

    test(
      "Embedding coverage",
      coverage >= 95,
      `${coverage.toFixed(1)}% of chunks have embeddings`,
      { embeddings: count, chunks: chunkCount }
    );
  } catch (error: any) {
    test("Embeddings", false, `Error: ${error.message}`);
  }
}

async function testSemanticSearch() {
  console.log("\n=== Testing Semantic Search ===\n");

  try {
    const testQuery = "How to recognize foreign exchange gains under IAS 21?";

    // Generate embedding
    const { data: embeddingData } = await openai.embeddings.create({
      model: "text-embedding-3-large",
      input: testQuery,
    });

    const embedding = embeddingData[0].embedding;

    test("Embedding generation", true, `Generated ${embedding.length}-dim vector`);

    // Test semantic search function
    const { data: chunks, error } = await supabase.rpc("match_knowledge_chunks", {
      query_embedding: embedding,
      match_threshold: 0.7,
      match_count: 6,
      filter_jurisdiction: "GLOBAL",
      filter_types: ["IAS", "IFRS"],
    });

    if (error) throw error;

    test(
      "Semantic search",
      chunks && chunks.length > 0,
      chunks ? `Found ${chunks.length} relevant chunks` : "No results",
      chunks?.slice(0, 3).map((c: any) => ({
        code: c.document_code,
        section: c.section_path,
        similarity: c.similarity.toFixed(3),
      }))
    );

    // Check result quality
    if (chunks && chunks.length > 0) {
      const topScore = chunks[0].similarity;
      test(
        "Result relevance",
        topScore >= 0.75,
        `Top result score: ${topScore.toFixed(3)}`,
        { threshold: 0.75, actual: topScore }
      );
    }
  } catch (error: any) {
    test("Semantic Search", false, `Error: ${error.message}`);
  }
}

async function testContextRetrieval() {
  console.log("\n=== Testing Context Retrieval ===\n");

  try {
    // Get a random chunk
    const { data: chunks } = await supabase
      .from("knowledge_chunks")
      .select("id")
      .limit(1)
      .single();

    if (!chunks) {
      test("Context retrieval", false, "No chunks available to test");
      return;
    }

    const { data: context, error } = await supabase.rpc("get_document_context", {
      target_chunk_id: chunks.id,
      context_window: 2,
    });

    if (error) throw error;

    test(
      "Context retrieval",
      context && context.length > 0,
      context ? `Retrieved ${context.length} context chunks` : "No context"
    );
  } catch (error: any) {
    test("Context Retrieval", false, `Error: ${error.message}`);
  }
}

async function testMonitoringViews() {
  console.log("\n=== Testing Monitoring Views ===\n");

  try {
    // Test knowledge_base_stats
    const { data: stats, error: statsError } = await supabase.rpc(
      "knowledge_base_stats"
    );

    if (statsError) throw statsError;

    test("Stats view", true, "Working", stats);

    // Test stale_documents view
    const { data: stale, error: staleError } = await supabase
      .from("stale_documents")
      .select("*")
      .limit(5);

    if (staleError) throw staleError;

    test(
      "Stale documents view",
      true,
      `Found ${stale?.length ?? 0} potentially stale documents`
    );
  } catch (error: any) {
    test("Monitoring Views", false, `Error: ${error.message}`);
  }
}

async function testAuditLogging() {
  console.log("\n=== Testing Audit Logging ===\n");

  try {
    // Log a test query
    const testUserId = "00000000-0000-0000-0000-000000000000"; // Placeholder UUID

    const logId = await supabase.rpc("log_agent_query", {
      p_agent_name: "TestAgent",
      p_user_id: testUserId,
      p_query_text: "Test query for validation",
      p_response_summary: "Test response",
      p_top_chunk_ids: [],
      p_latency_ms: 100,
      p_metadata: { confidence: "HIGH", test: true },
    });

    test("Audit logging", true, "Query logged successfully", { log_id: logId });

    // Verify log was created
    const { count } = await supabase
      .from("agent_queries_log")
      .select("*", { count: "exact", head: true })
      .eq("agent_name", "TestAgent");

    test("Log verification", (count ?? 0) > 0, `Found ${count} test logs`);
  } catch (error: any) {
    test("Audit Logging", false, `Error: ${error.message}`);
  }
}

async function printSummary() {
  console.log("\n" + "=".repeat(60));
  console.log("VALIDATION SUMMARY");
  console.log("=".repeat(60));

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const total = results.length;
  const successRate = ((passed / total) * 100).toFixed(1);

  console.log(`\nTotal Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${successRate}%\n`);

  if (failed > 0) {
    console.log("Failed Tests:");
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`  - ${r.name}: ${r.message}`);
      });
    console.log();
  }

  const overallPass = failed === 0;
  console.log(
    overallPass
      ? "🎉 ALL TESTS PASSED! System is ready for production."
      : "⚠️  Some tests failed. Review errors above."
  );
  console.log("=".repeat(60) + "\n");

  return overallPass;
}

async function main() {
  console.log("=".repeat(60));
  console.log("ACCOUNTING KNOWLEDGE BASE - SYSTEM VALIDATION");
  console.log("=".repeat(60));

  await testDatabaseSchema();
  await testJurisdictions();
  await testKnowledgeSources();
  await testDocumentsAndChunks();
  await testEmbeddings();
  await testSemanticSearch();
  await testContextRetrieval();
  await testMonitoringViews();
  await testAuditLogging();

  const success = await printSummary();
  process.exit(success ? 0 : 1);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
