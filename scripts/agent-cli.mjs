#!/usr/bin/env node
/**
 * CLI tool for managing agent registry
 * 
 * Usage:
 *   node scripts/agent-cli.mjs list
 *   node scripts/agent-cli.mjs search --category=tax
 *   node scripts/agent-cli.mjs validate
 *   node scripts/agent-cli.mjs stats
 */

import fs from "node:fs";
import yaml from "js-yaml";
import { program } from "commander";

program
  .name("agent-cli")
  .description("CLI tool for managing the agent registry")
  .version("1.0.0");

program
  .command("list")
  .description("List all agents")
  .option("-c, --category <category>", "Filter by category")
  .option("-j, --jurisdiction <code>", "Filter by jurisdiction")
  .action((options) => {
    const registry = loadRegistry();
    let agents = registry.agents;

    if (options.category) {
      agents = agents.filter((a) => a.category === options.category);
    }

    if (options.jurisdiction) {
      agents = agents.filter(
        (a) =>
          a.jurisdictions.includes(options.jurisdiction) ||
          a.jurisdictions.includes("GLOBAL")
      );
    }

    console.log(`\n📋 Found ${agents.length} agents:\n`);
    agents.forEach((agent) => {
      console.log(`  ${agent.id}`);
      console.log(`    Name: ${agent.name}`);
      console.log(`    Category: ${agent.category}`);
      console.log(`    Jurisdictions: ${agent.jurisdictions.join(", ")}`);
      console.log(`    Engine: ${agent.engine_preferences.primary}`);
      console.log("");
    });
  });

program
  .command("search")
  .description("Search agents by tags")
  .option("-t, --tags <tags>", "Comma-separated tags")
  .action((options) => {
    const registry = loadRegistry();
    const tags = options.tags ? options.tags.split(",") : [];

    const agents = registry.agents.filter((agent) =>
      tags.some((tag) => agent.routing_tags.includes(tag))
    );

    console.log(`\n🔍 Found ${agents.length} agents matching tags [${tags.join(", ")}]:\n`);
    agents.forEach((agent) => {
      console.log(`  ${agent.id} - ${agent.name}`);
      console.log(`    Tags: ${agent.routing_tags.join(", ")}`);
      console.log("");
    });
  });

program
  .command("validate")
  .description("Validate registry structure")
  .action(() => {
    try {
      const registry = loadRegistry();
      const errors = [];

      // Validate version
      if (registry.version !== 1) {
        errors.push(`Invalid version: ${registry.version}`);
      }

      // Validate each agent
      const ids = new Set();
      registry.agents.forEach((agent, index) => {
        // Check required fields
        if (!agent.id) errors.push(`Agent ${index}: Missing id`);
        if (!agent.category) errors.push(`Agent ${agent.id}: Missing category`);
        if (!agent.name) errors.push(`Agent ${agent.id}: Missing name`);

        // Check for duplicate IDs
        if (ids.has(agent.id)) {
          errors.push(`Duplicate agent ID: ${agent.id}`);
        }
        ids.add(agent.id);

        // Validate category
        const validCategories = ["tax", "audit", "accounting", "corporate"];
        if (!validCategories.includes(agent.category)) {
          errors.push(`Agent ${agent.id}: Invalid category ${agent.category}`);
        }

        // Validate engine preferences
        const validEngines = ["openai", "gemini"];
        if (!validEngines.includes(agent.engine_preferences?.primary)) {
          errors.push(`Agent ${agent.id}: Invalid primary engine`);
        }
      });

      if (errors.length === 0) {
        console.log("✅ Registry validation passed!");
        console.log(`   ${registry.agents.length} agents validated`);
      } else {
        console.log("❌ Registry validation failed:");
        errors.forEach((err) => console.log(`   - ${err}`));
        process.exit(1);
      }
    } catch (error) {
      console.error("❌ Validation error:", error.message);
      process.exit(1);
    }
  });

program
  .command("stats")
  .description("Show registry statistics")
  .action(() => {
    const registry = loadRegistry();
    const agents = registry.agents;

    const categories = {};
    const jurisdictions = {};
    const engines = { openai: 0, gemini: 0 };

    agents.forEach((agent) => {
      // Count categories
      categories[agent.category] = (categories[agent.category] || 0) + 1;

      // Count jurisdictions
      agent.jurisdictions.forEach((j) => {
        jurisdictions[j] = (jurisdictions[j] || 0) + 1;
      });

      // Count engines
      engines[agent.engine_preferences.primary]++;
    });

    console.log("\n📊 Agent Registry Statistics\n");
    console.log(`Total Agents: ${agents.length}`);
    console.log("\nBy Category:");
    Object.entries(categories)
      .sort(([, a], [, b]) => b - a)
      .forEach(([cat, count]) => {
        console.log(`  ${cat}: ${count}`);
      });

    console.log("\nBy Jurisdiction:");
    Object.entries(jurisdictions)
      .sort(([, a], [, b]) => b - a)
      .forEach(([jur, count]) => {
        console.log(`  ${jur}: ${count}`);
      });

    console.log("\nBy Primary Engine:");
    Object.entries(engines).forEach(([engine, count]) => {
      console.log(`  ${engine}: ${count}`);
    });

    console.log("");
  });

program
  .command("export-json")
  .description("Export registry to JSON format")
  .option("-o, --output <file>", "Output file", "agents.registry.json")
  .action((options) => {
    const registry = loadRegistry();
    fs.writeFileSync(
      options.output,
      JSON.stringify(registry, null, 2),
      "utf8"
    );
    console.log(`✅ Registry exported to ${options.output}`);
  });

function loadRegistry() {
  try {
    const registryYaml = fs.readFileSync("agents.registry.yaml", "utf8");
    return yaml.load(registryYaml);
  } catch (error) {
    console.error("Failed to load registry:", error.message);
    process.exit(1);
  }
}

program.parse();
