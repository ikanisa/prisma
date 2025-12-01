import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import type { AgentRegistryEntry, RegistryFile } from "./types.js";

let cachedRegistry: AgentRegistryEntry[] | null = null;

export function loadAgentsRegistry(): AgentRegistryEntry[] {
  if (cachedRegistry) {
    return cachedRegistry;
  }

  const registryPath = path.resolve(process.cwd(), "agents.registry.yaml");
  
  if (!fs.existsSync(registryPath)) {
    throw new Error(`Agent registry not found at: ${registryPath}`);
  }

  const registryYaml = fs.readFileSync(registryPath, "utf8");
  const registry = yaml.load(registryYaml) as RegistryFile;

  if (!registry.agents || !Array.isArray(registry.agents)) {
    throw new Error("Invalid registry format: missing agents array");
  }

  cachedRegistry = registry.agents;
  return cachedRegistry;
}

export function getAgentById(agentId: string): AgentRegistryEntry | undefined {
  const registry = loadAgentsRegistry();
  return registry.find((agent) => agent.id === agentId);
}

export function getAgentsByCategory(category: string): AgentRegistryEntry[] {
  const registry = loadAgentsRegistry();
  return registry.filter((agent) => agent.category === category);
}

export function getAgentsByJurisdiction(jurisdiction: string): AgentRegistryEntry[] {
  const registry = loadAgentsRegistry();
  return registry.filter((agent) =>
    agent.jurisdictions.includes(jurisdiction) ||
    agent.jurisdictions.includes("GLOBAL")
  );
}

export function getAgentsByTag(tag: string): AgentRegistryEntry[] {
  const registry = loadAgentsRegistry();
  return registry.filter((agent) => agent.routing_tags.includes(tag));
}

export function searchAgents(query: {
  category?: string;
  jurisdiction?: string;
  tags?: string[];
}): AgentRegistryEntry[] {
  let agents = loadAgentsRegistry();

  if (query.category) {
    agents = agents.filter((a) => a.category === query.category);
  }

  if (query.jurisdiction) {
    agents = agents.filter(
      (a) =>
        a.jurisdictions.includes(query.jurisdiction!) ||
        a.jurisdictions.includes("GLOBAL")
    );
  }

  if (query.tags && query.tags.length > 0) {
    agents = agents.filter((a) =>
      query.tags!.some((tag) => a.routing_tags.includes(tag))
    );
  }

  return agents;
}

export * from "./types.js";
