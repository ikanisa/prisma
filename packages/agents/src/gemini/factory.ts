import type { AgentRegistryEntry } from "../registry/types.js";
import { buildGeminiSystemPrompt } from "./instructions.js";
import { getToolDeclarations } from "./tools.js";

export type GeminiAgentConfig = {
  entry: AgentRegistryEntry;
  systemPrompt: string;
  tools: unknown[];
  model: string;
};

export function createGeminiAgentFromRegistry(
  entry: AgentRegistryEntry,
  options?: {
    model?: string;
  }
): GeminiAgentConfig {
  return {
    entry,
    systemPrompt: buildGeminiSystemPrompt(entry),
    tools: getToolDeclarations(entry.tools),
    model: options?.model ?? "gemini-2.0-flash-exp",
  };
}

export function createAllGeminiAgents(
  entries: AgentRegistryEntry[],
  options?: {
    model?: string;
  }
): Record<string, GeminiAgentConfig> {
  return Object.fromEntries(
    entries.map((entry) => [entry.id, createGeminiAgentFromRegistry(entry, options)])
  );
}
