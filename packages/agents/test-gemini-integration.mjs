#!/usr/bin/env node
/**
 * Smoke test for Gemini integration
 * Usage: GEMINI_API_KEY=xxx node test-gemini-integration.mjs
 */

import { loadAgentsRegistry } from "./src/registry/loader.js";
import { createGeminiConfigFromRegistry } from "./src/gemini/factory.js";
import { runGeminiAgent } from "./src/gemini/runner.js";

async function main() {
  console.log("🧪 Gemini Integration Smoke Test\n");

  // Test 1: Load registry
  console.log("1️⃣  Loading agent registry...");
  const agents = loadAgentsRegistry();
  console.log(`✅ Loaded ${agents.length} agents\n`);

  // Test 2: Find audit agent (uses Gemini as fallback)
  console.log("2️⃣  Finding audit materiality agent...");
  const auditEntry = agents.find((a) => a.id === "audit-materiality-050");
  if (!auditEntry) {
    throw new Error("Audit agent not found!");
  }
  console.log(`✅ Found: ${auditEntry.name}`);
  console.log(`   Primary: ${auditEntry.engine_preferences.primary}`);
  console.log(`   Fallback: ${auditEntry.engine_preferences.fallback}\n`);

  // Test 3: Create Gemini config
  console.log("3️⃣  Creating Gemini config...");
  const config = createGeminiConfigFromRegistry(auditEntry);
  console.log(`✅ Config created for: ${config.entry.id}`);
  console.log(`   Model: ${config.model}`);
  console.log(`   Tools: ${config.tools.join(", ")}\n`);

  // Test 4: Run agent (only if API key is set)
  if (!process.env.GEMINI_API_KEY) {
    console.log("⚠️  Skipping API test (GEMINI_API_KEY not set)");
    console.log("\n✅ All offline tests passed!");
    return;
  }

  console.log("4️⃣  Running agent with Gemini API...");
  console.log("   Question: What is materiality in financial audits?");

  try {
    const result = await runGeminiAgent(config, {
      input: "What is materiality in financial audits and how is it determined under ISA 320?",
      metadata: { jurisdictionCode: "GLOBAL" },
    });

    console.log(`\n✅ Gemini Response:`);
    console.log(`   Agent ID: ${result.agentId}`);
    console.log(`   Output: ${result.output.substring(0, 250)}...`);
    if (result.metadata) {
      console.log(`   Model: ${result.metadata.model}`);
      console.log(`   Candidates: ${result.metadata.candidates}`);
      if (result.metadata.usageMetadata) {
        console.log(`   Usage: ${JSON.stringify(result.metadata.usageMetadata)}`);
      }
    }

    console.log("\n🎉 All tests passed!");
  } catch (error) {
    console.error(`\n❌ Agent execution failed:`, error.message);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("❌ Test failed:", error);
  process.exit(1);
});
