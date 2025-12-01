#!/usr/bin/env node
/**
 * Smoke test for OpenAI integration
 * Usage: node test-openai-integration.mjs
 */

import { loadAgentsRegistry } from "./src/registry/loader.js";
import { createOpenAIAgentFromRegistry } from "./src/openai/factory.js";
import { runOpenAIAgent } from "./src/openai/runner.js";

async function main() {
  console.log("🧪 OpenAI Integration Smoke Test\n");

  // Test 1: Load registry
  console.log("1️⃣  Loading agent registry...");
  const agents = loadAgentsRegistry();
  console.log(`✅ Loaded ${agents.length} agents\n`);

  // Test 2: Find tax agent
  console.log("2️⃣  Finding Malta tax agent...");
  const taxEntry = agents.find((a) => a.id === "tax-compliance-mt-034");
  if (!taxEntry) {
    throw new Error("Malta tax agent not found!");
  }
  console.log(`✅ Found: ${taxEntry.name}\n`);

  // Test 3: Create OpenAI agent
  console.log("3️⃣  Creating OpenAI agent...");
  const agent = createOpenAIAgentFromRegistry(taxEntry);
  console.log(`✅ Agent created with ID: ${agent.id}`);
  console.log(`   Model: ${agent.model}`);
  console.log(`   Tools: ${agent.tools.join(", ")}\n`);

  // Test 4: Run agent (only if API key is set)
  if (!process.env.OPENAI_API_KEY) {
    console.log("⚠️  Skipping API test (OPENAI_API_KEY not set)");
    console.log("\n✅ All offline tests passed!");
    return;
  }

  console.log("4️⃣  Running agent with OpenAI API...");
  console.log("   Question: What is the corporate tax rate in Malta?");

  try {
    const result = await runOpenAIAgent(agent, {
      input: "What is the corporate tax rate in Malta?",
      metadata: { jurisdictionCode: "MT" },
    });

    console.log(`\n✅ Agent Response:`);
    console.log(`   Agent ID: ${result.agentId}`);
    console.log(`   Output: ${result.output.substring(0, 200)}...`);
    if (result.metadata) {
      console.log(`   Model: ${result.metadata.model}`);
      console.log(`   Tokens: ${JSON.stringify(result.metadata.usage)}`);
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
