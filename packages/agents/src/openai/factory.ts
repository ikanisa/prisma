import type { AgentRegistryEntry } from "../registry/types.js";
import { buildInstructionsFromEntry } from "./instructions.js";

export type Agent = {
  id: string;
  name: string;
  instructions: string;
  tools: string[];
  model: string;
  entry: AgentRegistryEntry;
};

export function createOpenAIAgentFromRegistry(
  entry: AgentRegistryEntry,
  options?: {
    model?: string;
  }
): Agent {
  const agent: Agent = {
    id: entry.id,
    name: entry.name,
    instructions: buildInstructionsFromEntry(entry),
    tools: entry.tools,
    model: options?.model ?? "gpt-4o-mini",
    entry,
  };

  return agent;
}

export function createAllOpenAIAgents(
  entries: AgentRegistryEntry[],
  options?: {
    model?: string;
  }
): Record<string, Agent> {
  return Object.fromEntries(
    entries.map((entry) => [entry.id, createOpenAIAgentFromRegistry(entry, options)])
  );
}
