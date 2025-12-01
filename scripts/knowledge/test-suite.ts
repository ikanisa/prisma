/**
 * Comprehensive Test Suite for Accounting Knowledge Base
 * Tests all components of the system
 * 
 * Usage:
 *   tsx scripts/knowledge/test-suite.ts
 *   tsx scripts/knowledge/test-suite.ts --component search
 *   tsx scripts/knowledge/test-suite.ts --component agent
 */

import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { DeepSearchAgent } from "./deepsearch-agent";

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
  duration: number;
}

const results: TestResult[] = [];

function test(name: string, fn: () => Promise<boolean>): void {
  const testFn = async () => {
    const start = Date.now();
    try {
      const passed = await fn();
      const duration = Date.now() - start;
      results.push({ name, passed, message: passed ? "✓ Passed" : "✗ Failed", duration });
      console.log(`${passed ? "✓" : "✗"} ${name} (${duration}ms)`);
    } catch (error) {
      const duration = Date.now() - start;
      results.push({
        name,
        passed: false,
        message: `✗ Error: ${error instanceof Error ? error.message : String(error)}`,
        duration,
      });
      console.log(`✗ ${name} - Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  testFn();
}

async function testDatabaseConnection() {
  console.log("\n📊 Database Connection Tests\n");

  test("Database connection", async () => {
    const { error } = await supabase.from("jurisdictions").select("count").limit(1);
    return !error;
  });

  test("Jurisdictions table exists", async () => {
    const { data, error } = await supabase.from("jurisdictions").select("*").limit(1);
    return !error && data !== null;
  });

  test("Knowledge sources table exists", async () => {
    const { data, error } = await supabase.from("knowledge_sources").select("*").limit(1);
    return !error && data !== null;
  });

  test("Knowledge documents table exists", async () => {
    const { data, error } = await supabase.from("knowledge_documents").select("*").limit(1);
    return !error && data !== null;
  });

  test("Knowledge chunks table exists", async () => {
    const { data, error } = await supabase.from("knowledge_chunks").select("*").limit(1);
    return !error && data !== null;
  });

  test("Knowledge embeddings table exists", async () => {
    const { data, error } = await supabase.from("knowledge_embeddings").select("*").limit(1);
    return !error && data !== null;
  });

  test("pgvector extension enabled", async () => {
    const { data, error } = await supabase.rpc("search_knowledge_semantic", {
      query_embedding: JSON.stringify(Array(1536).fill(0.1)),
      match_threshold: 0.9,
      match_count: 1,
    });
    return !error;
  });

  await new Promise((resolve) => setTimeout(resolve, 100));
}

async function testDataIngestion() {
  console.log("\n📥 Data Ingestion Tests\n");

  test("Has jurisdictions data", async () => {
    const { count } = await supabase
      .from("jurisdictions")
      .select("*", { count: "exact", head: true });
    return count !== null && count > 0;
  });

  test("Has knowledge sources", async () => {
    const { count } = await supabase
      .from("knowledge_sources")
      .select("*", { count: "exact", head: true });
    return count !== null && count > 0;
  });

  test("Has knowledge documents", async () => {
    const { count } = await supabase
      .from("knowledge_documents")
      .select("*", { count: "exact", head: true });
    return count !== null && count > 0;
  });

  test("Has knowledge chunks", async () => {
    const { count } = await supabase
      .from("knowledge_chunks")
      .select("*", { count: "exact", head: true });
    return count !== null && count > 0;
  });

  test("Has embeddings", async () => {
    const { count } = await supabase
      .from("knowledge_embeddings")
      .select("*", { count: "exact", head: true });
    return count !== null && count > 0;
  });

  test("Chunks have content", async () => {
    const { data } = await supabase
      .from("knowledge_chunks")
      .select("content")
      .limit(1)
      .single();
    return data?.content && data.content.length > 0;
  });

  await new Promise((resolve) => setTimeout(resolve, 100));
}

async function testSearch() {
  console.log("\n🔍 Search Functionality Tests\n");

  test("Generate OpenAI embedding", async () => {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: "test query",
    });
    return response.data[0].embedding.length === 1536;
  });

  test("Semantic search returns results", async () => {
    const embedding = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: "foreign exchange",
    });

    const { data, error } = await supabase.rpc("search_knowledge_semantic", {
      query_embedding: JSON.stringify(embedding.data[0].embedding),
      match_threshold: 0.5,
      match_count: 5,
    });

    return !error && data && data.length > 0;
  });

  test("Search with filters works", async () => {
    const embedding = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: "revenue recognition",
    });

    const { data, error } = await supabase.rpc("search_knowledge_semantic", {
      query_embedding: JSON.stringify(embedding.data[0].embedding),
      match_threshold: 0.5,
      match_count: 5,
      filter_types: ["IFRS", "IAS"],
      filter_authority_levels: ["PRIMARY"],
    });

    return !error && data !== null;
  });

  test("Search returns similarity scores", async () => {
    const embedding = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: "leases",
    });

    const { data } = await supabase.rpc("search_knowledge_semantic", {
      query_embedding: JSON.stringify(embedding.data[0].embedding),
      match_threshold: 0.5,
      match_count: 1,
    });

    return data && data.length > 0 && typeof data[0].similarity === "number";
  });

  await new Promise((resolve) => setTimeout(resolve, 100));
}

async function testAgent() {
  console.log("\n🤖 Agent Tests\n");

  const agent = new DeepSearchAgent({ supabase, openai });

  test("Agent initialization", async () => {
    return agent !== null;
  });

  test("Agent search basic query", async () => {
    const response = await agent.search({
      query: "How do I account for foreign exchange?",
      topK: 3,
    });
    return (
      response.answer.length > 0 &&
      response.sources.length > 0 &&
      response.confidence > 0
    );
  });

  test("Agent search with filters", async () => {
    const response = await agent.search({
      query: "revenue recognition",
      types: ["IFRS"],
      topK: 2,
    });
    return response.sources.length > 0;
  });

  test("Agent confidence scoring", async () => {
    const response = await agent.search({
      query: "lease modifications",
      topK: 5,
    });
    return response.confidence >= 0 && response.confidence <= 1;
  });

  test("Agent query logging", async () => {
    const beforeCount = await supabase
      .from("agent_queries_log")
      .select("*", { count: "exact", head: true });

    await agent.search({ query: "test logging", topK: 1 });

    const afterCount = await supabase
      .from("agent_queries_log")
      .select("*", { count: "exact", head: true });

    return afterCount.count! > beforeCount.count!;
  });

  await new Promise((resolve) => setTimeout(resolve, 100));
}

async function testPerformance() {
  console.log("\n⚡ Performance Tests\n");

  const agent = new DeepSearchAgent({ supabase, openai });

  test("Search completes under 5 seconds", async () => {
    const start = Date.now();
    await agent.search({ query: "test performance", topK: 3 });
    const duration = Date.now() - start;
    return duration < 5000;
  });

  test("Batch queries efficient", async () => {
    const start = Date.now();
    await Promise.all([
      agent.search({ query: "foreign exchange", topK: 2 }),
      agent.search({ query: "revenue", topK: 2 }),
      agent.search({ query: "leases", topK: 2 }),
    ]);
    const duration = Date.now() - start;
    return duration < 10000;
  });

  await new Promise((resolve) => setTimeout(resolve, 100));
}

async function testEdgeCases() {
  console.log("\n🔧 Edge Case Tests\n");

  const agent = new DeepSearchAgent({ supabase, openai });

  test("Empty query handling", async () => {
    try {
      await agent.search({ query: "", topK: 1 });
      return false; // Should have thrown
    } catch {
      return true; // Expected to fail
    }
  });

  test("Very long query handling", async () => {
    const longQuery = "accounting ".repeat(100);
    const response = await agent.search({ query: longQuery, topK: 1 });
    return response !== null;
  });

  test("No results handling", async () => {
    const response = await agent.search({
      query: "xyzabc123impossible",
      topK: 1,
      minSimilarity: 0.99,
    });
    return response.sources.length === 0 && response.answer.length > 0;
  });

  test("Invalid jurisdiction code", async () => {
    const response = await agent.search({
      query: "test",
      jurisdiction: "INVALID",
      topK: 1,
    });
    return response !== null; // Should handle gracefully
  });

  await new Promise((resolve) => setTimeout(resolve, 100));
}

async function runAllTests() {
  console.log("╔══════════════════════════════════════════════════════════════════╗");
  console.log("║      ACCOUNTING KNOWLEDGE BASE - COMPREHENSIVE TEST SUITE        ║");
  console.log("╚══════════════════════════════════════════════════════════════════╝");

  const startTime = Date.now();

  await testDatabaseConnection();
  await testDataIngestion();
  await testSearch();
  await testAgent();
  await testPerformance();
  await testEdgeCases();

  const totalDuration = Date.now() - startTime;

  console.log("\n╔══════════════════════════════════════════════════════════════════╗");
  console.log("║                         TEST SUMMARY                             ║");
  console.log("╚══════════════════════════════════════════════════════════════════╝");
  console.log("");

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const total = results.length;

  console.log(`Total Tests:     ${total}`);
  console.log(`Passed:          ${passed} ✓`);
  console.log(`Failed:          ${failed} ✗`);
  console.log(`Success Rate:    ${((passed / total) * 100).toFixed(1)}%`);
  console.log(`Total Duration:  ${totalDuration}ms`);
  console.log("");

  if (failed > 0) {
    console.log("Failed Tests:");
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.log(`  ✗ ${r.name}: ${r.message}`);
      });
    console.log("");
  }

  if (passed === total) {
    console.log("🎉 All tests passed!");
  } else {
    console.log("⚠️  Some tests failed. Please review the output above.");
    process.exit(1);
  }
}

// Run tests
runAllTests().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
