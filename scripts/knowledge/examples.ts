/**
 * Example: Using the Accounting Knowledge Base
 * Demonstrates how to integrate DeepSearch into your application
 */

import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { DeepSearchAgent } from "./deepsearch-agent";

// Initialize clients
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Example 1: Basic Question Answering
async function basicExample() {
  console.log("\n📝 Example 1: Basic Question Answering\n");

  const agent = new DeepSearchAgent({ supabase, openai });

  const response = await agent.search({
    query: "How do I account for foreign exchange gains and losses?",
    types: ["IFRS", "IAS"],
    authorityLevels: ["PRIMARY"],
  });

  console.log("Question:", response.answer);
  console.log("\nReasoning:", response.reasoning);
  console.log("\nSources:");
  response.sources.forEach((source, idx) => {
    console.log(
      `  ${idx + 1}. ${source.code}${source.section ? " " + source.section : ""} (${(source.similarity * 100).toFixed(1)}%)`
    );
  });
  console.log("\nConfidence:", (response.confidence * 100).toFixed(1) + "%");
}

// Example 2: Jurisdiction-Specific Query
async function jurisdictionExample() {
  console.log("\n🌍 Example 2: Jurisdiction-Specific Query\n");

  const agent = new DeepSearchAgent({ supabase, openai });

  const response = await agent.search({
    query: "What is the corporate income tax rate and how do I compute taxable income?",
    jurisdiction: "RW", // Rwanda
    types: ["TAX_LAW"],
  });

  console.log("Answer:", response.answer);
  console.log("\nSources:");
  response.sources.forEach((source) => {
    console.log(`  - ${source.code}: ${source.title}`);
  });
}

// Example 3: Multi-Source Comparison
async function comparisonExample() {
  console.log("\n🔍 Example 3: Multi-Source Comparison\n");

  const agent = new DeepSearchAgent({ supabase, openai });

  const queries = [
    "How do I recognize revenue from contracts with customers?",
    "What are the disclosure requirements for income taxes?",
    "How do I assess risks of material misstatement in an audit?",
  ];

  for (const query of queries) {
    const response = await agent.search({
      query,
      topK: 3,
    });

    console.log(`\nQ: ${query}`);
    console.log(`A: ${response.answer.substring(0, 150)}...`);
    console.log(
      `   Sources: ${response.sources.map((s) => s.code).join(", ")}`
    );
    console.log(`   Confidence: ${(response.confidence * 100).toFixed(1)}%`);
  }
}

// Example 4: Freshness Check
async function freshnessExample() {
  console.log("\n🕐 Example 4: Freshness Check\n");

  const agent = new DeepSearchAgent({ supabase, openai });

  // Get a document ID (in real use, this comes from search results)
  const { data: docs } = await supabase
    .from("knowledge_documents")
    .select("id, code, title, updated_at")
    .limit(1)
    .single();

  if (docs) {
    const freshness = await agent.checkFreshness(docs.id);
    console.log(`Document: ${docs.code} - ${docs.title}`);
    console.log(`Age: ${freshness.days_old} days`);
    console.log(`Fresh: ${freshness.is_fresh ? "Yes" : "No"}`);
    console.log(`Recommendation: ${freshness.recommendation}`);
  }
}

// Example 5: Load Agent from Config File
async function configExample() {
  console.log("\n⚙️  Example 5: Load Agent from Config File\n");

  const agent = await DeepSearchAgent.fromConfigFile(
    supabase,
    openai,
    "config/knowledge/deepsearch-agent.yaml"
  );

  const response = await agent.search({
    query: "What is the treatment of lease modifications under IFRS 16?",
  });

  console.log("Using config from YAML file:");
  console.log("Answer:", response.answer.substring(0, 200) + "...");
  console.log(
    "Confidence:",
    (response.confidence * 100).toFixed(1) + "%"
  );
}

// Example 6: Building a Chat Interface
async function chatExample() {
  console.log("\n💬 Example 6: Chat Interface Pattern\n");

  const agent = new DeepSearchAgent({ supabase, openai });

  const conversation = [
    "How do I account for leases?",
    "What about lease modifications?",
    "Can you show me an example journal entry?",
  ];

  for (const userMessage of conversation) {
    console.log(`\nUser: ${userMessage}`);

    const response = await agent.search({
      query: userMessage,
      types: ["IFRS"],
    });

    console.log(`Agent: ${response.answer.substring(0, 150)}...`);
    console.log(
      `       (Sources: ${response.sources.map((s) => s.code).join(", ")})`
    );
  }
}

// Example 7: Error Handling
async function errorHandlingExample() {
  console.log("\n⚠️  Example 7: Error Handling\n");

  const agent = new DeepSearchAgent({ supabase, openai });

  try {
    // Query with very high threshold - likely no results
    const response = await agent.search({
      query: "Some obscure accounting question",
      minSimilarity: 0.95,
    });

    if (response.confidence < 0.5) {
      console.log(
        "⚠️  Low confidence answer. Consider asking a human expert."
      );
    }

    console.log("Answer:", response.answer);
    console.log("Confidence:", (response.confidence * 100).toFixed(1) + "%");
  } catch (error) {
    console.error("Error:", error);
  }
}

// Example 8: Batch Processing
async function batchExample() {
  console.log("\n📦 Example 8: Batch Processing\n");

  const agent = new DeepSearchAgent({ supabase, openai });

  const questions = [
    "How do I account for foreign exchange?",
    "What is the treatment of leases?",
    "How do I recognize revenue?",
  ];

  const results = await Promise.all(
    questions.map((q) =>
      agent.search({
        query: q,
        topK: 2,
      })
    )
  );

  console.log("Batch Results:");
  results.forEach((result, idx) => {
    console.log(`\n${idx + 1}. ${questions[idx]}`);
    console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    console.log(
      `   Sources: ${result.sources.map((s) => s.code).join(", ")}`
    );
  });
}

// Run all examples
async function main() {
  const examples = [
    basicExample,
    jurisdictionExample,
    comparisonExample,
    freshnessExample,
    configExample,
    chatExample,
    errorHandlingExample,
    batchExample,
  ];

  const exampleName = process.argv[2];

  if (exampleName) {
    const example = examples.find(
      (ex) => ex.name === `${exampleName}Example`
    );
    if (example) {
      await example();
    } else {
      console.log("Available examples:");
      examples.forEach((ex) => {
        console.log(
          `  - ${ex.name.replace("Example", "")}`
        );
      });
    }
  } else {
    // Run all examples
    for (const example of examples) {
      try {
        await example();
      } catch (error) {
        console.error(`Error in ${example.name}:`, error);
      }
    }
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

/**
 * Run specific example:
 *   tsx scripts/knowledge/examples.ts basic
 *   tsx scripts/knowledge/examples.ts jurisdiction
 *   tsx scripts/knowledge/examples.ts comparison
 *   tsx scripts/knowledge/examples.ts freshness
 *   tsx scripts/knowledge/examples.ts config
 *   tsx scripts/knowledge/examples.ts chat
 *   tsx scripts/knowledge/examples.ts errorHandling
 *   tsx scripts/knowledge/examples.ts batch
 *
 * Run all examples:
 *   tsx scripts/knowledge/examples.ts
 */
