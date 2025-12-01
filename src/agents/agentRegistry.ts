/**
 * Agent Registry Loader & Runtime
 * 
 * Loads agent configurations from config/agent_registry.yaml
 * and provides runtime execution via OpenAI Agents SDK
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { agent } from '@openai/agents';
import { deepSearchTool } from './tools/deepSearchTool';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type ToolRef = 'deep_search_kb';

export type ToolDef = {
  id: string;
  kind: string;
  description: string;
  implementation: {
    openai?: { tool_name: string };
    gemini?: { function_name: string };
  };
  default_params?: Record<string, any>;
};

export type KbScope = {
  tool: ToolRef;
  category?: string;
  jurisdictions?: string[];
  tags_any?: string[];
  max_results?: number;
  min_similarity?: number;
};

export type AgentRuntimeOpenAI = {
  model: string;
  temperature?: number;
  tools: ToolRef[];
};

export type AgentRuntimeGemini = {
  model: string;
  temperature?: number;
  tools: ToolRef[];
};

export type AgentDef = {
  id: string;
  label: string;
  group: string;
  file?: string;
  runtime: {
    openai?: AgentRuntimeOpenAI;
    gemini?: AgentRuntimeGemini;
  };
  persona: string;
  kb_scopes?: KbScope[];
};

export type AgentRegistryFile = {
  version: number;
  tools: ToolDef[];
  agents: AgentDef[];
};

export type RunAgentOptions = {
  history?: { role: 'user' | 'assistant' | 'system'; content: string }[];
  platform?: 'openai' | 'gemini';
};

export type RunAgentResult = {
  text: string;
  raw: any;
  agent_id: string;
  model: string;
  sources?: {
    source_name: string;
    page_url: string;
    similarity: number;
  }[];
};

// ============================================================================
// REGISTRY LOADING
// ============================================================================

let REGISTRY: AgentRegistryFile | null = null;

/**
 * Load agent registry from YAML file
 * Cached after first load for performance
 */
function loadRegistry(): AgentRegistryFile {
  if (REGISTRY) return REGISTRY;

  const yamlPath = path.resolve('config/agent_registry.yaml');
  
  if (!fs.existsSync(yamlPath)) {
    throw new Error(`Agent registry not found at: ${yamlPath}`);
  }

  const raw = fs.readFileSync(yamlPath, 'utf8');
  const parsed = yaml.load(raw) as AgentRegistryFile;

  if (!parsed || !parsed.agents || !parsed.tools) {
    throw new Error('Invalid agent_registry.yaml structure: missing agents or tools');
  }

  REGISTRY = parsed;
  return parsed;
}

/**
 * Force reload of agent registry (useful for hot reload in dev)
 */
export function reloadRegistry(): AgentRegistryFile {
  REGISTRY = null;
  return loadRegistry();
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Get agent configuration by ID
 * @param id - Agent ID (e.g., "tax-corp-rw-027")
 * @returns Agent configuration or undefined if not found
 */
export function getAgentConfig(id: string): AgentDef | undefined {
  const registry = loadRegistry();
  return registry.agents.find((a) => a.id === id);
}

/**
 * Get all agents in the registry
 * @returns Array of all agent configurations
 */
export function getAllAgents(): AgentDef[] {
  const registry = loadRegistry();
  return registry.agents;
}

/**
 * Get agents filtered by group
 * @param group - Group name (e.g., "tax", "audit", "accounting")
 * @returns Array of matching agents
 */
export function getAgentsByGroup(group: string): AgentDef[] {
  const registry = loadRegistry();
  return registry.agents.filter((a) => a.group === group);
}

/**
 * Get all tool definitions
 * @returns Array of tool definitions
 */
export function getToolDefinitions(): ToolDef[] {
  const registry = loadRegistry();
  return registry.tools;
}

/**
 * Get tool definition by ID
 * @param id - Tool ID (e.g., "deep_search_kb")
 * @returns Tool definition or undefined if not found
 */
export function getToolDefinition(id: string): ToolDef | undefined {
  const registry = loadRegistry();
  return registry.tools.find((t) => t.id === id);
}

// ============================================================================
// TOOL RESOLUTION
// ============================================================================

/**
 * Map tool reference to actual implementation
 * @param ref - Tool reference from YAML
 * @returns Tool implementation
 */
function getToolImplementation(ref: ToolRef) {
  switch (ref) {
    case 'deep_search_kb':
      return deepSearchTool;
    default:
      throw new Error(`Unknown tool ref: ${ref}`);
  }
}

// ============================================================================
// AGENT RUNTIME
// ============================================================================

/**
 * Build retrieval guidance from KB scopes
 * This gets injected into the agent's system prompt
 */
function buildKbGuidance(kb_scopes?: KbScope[]): string {
  if (!kb_scopes || kb_scopes.length === 0) {
    return `
RETRIEVAL PROFILE:
This agent must use the deep_search_kb tool for external standards and laws.
Always call deep_search_kb instead of browsing the open web.
`.trim();
  }

  const scopeDescriptions = kb_scopes
    .map((s, i) => {
      return `  Scope ${i + 1}:
    - category: ${s.category ?? 'ANY'}
    - jurisdictions: ${s.jurisdictions?.join(', ') ?? 'ANY'}
    - tags_any: ${s.tags_any?.join(', ') ?? '[]'}
    - max_results: ${s.max_results ?? 15}
    - min_similarity: ${s.min_similarity ?? 0.7}`;
    })
    .join('\n');

  return `
RETRIEVAL PROFILE (for deep_search_kb):
${scopeDescriptions}

When you call deep_search_kb:
- Prefer these scopes as defaults.
- If multiple scopes apply, choose the one that best matches the user's question.
- Always use deep_search_kb instead of browsing the open web.
- Always cite the source_name and page_url in your response.
`.trim();
}

/**
 * Run an agent by ID with a user message
 * 
 * @param agentId - Agent ID from registry (e.g., "tax-corp-rw-027")
 * @param userMessage - User's question/message
 * @param options - Optional history and platform selection
 * @returns Agent response with text and metadata
 * 
 * @example
 * ```typescript
 * const result = await runAgent("tax-corp-rw-027", "What is the VAT threshold?");
 * console.log(result.text);
 * ```
 */
export async function runAgent(
  agentId: string,
  userMessage: string,
  options: RunAgentOptions = {}
): Promise<RunAgentResult> {
  const registry = loadRegistry();
  const config = registry.agents.find((a) => a.id === agentId);

  if (!config) {
    throw new Error(`Agent with id "${agentId}" not found in registry`);
  }

  // Default to OpenAI, support Gemini in future
  const platform = options.platform ?? 'openai';
  
  if (platform === 'gemini') {
    throw new Error('Gemini runtime not yet implemented. Use platform: "openai"');
  }

  const openaiRuntime = config.runtime.openai;
  if (!openaiRuntime) {
    throw new Error(`Agent "${agentId}" has no OpenAI runtime configuration`);
  }

  // Build complete system instructions
  const kbGuidance = buildKbGuidance(config.kb_scopes);
  const instructions = `
${config.persona.trim()}

${kbGuidance}
`.trim();

  // Resolve tools
  const tools = (openaiRuntime.tools || []).map((ref) => getToolImplementation(ref));

  // Create agent instance
  const agentInstance = agent({
    name: config.label || config.id,
    instructions,
    tools,
    model: openaiRuntime.model,
    temperature: openaiRuntime.temperature ?? 0.1,
  });

  // Build conversation history
  const messages = [
    ...(options.history ?? []),
    { role: 'user' as const, content: userMessage },
  ];

  // Execute agent
  const result = await agentInstance.run({ messages });

  // Extract sources from tool calls if available
  const sources: RunAgentResult['sources'] = [];
  
  // Parse tool results from raw response if available
  // Note: This depends on the actual response structure from @openai/agents
  // You may need to adjust based on the actual API
  if (result.tool_calls) {
    for (const call of result.tool_calls) {
      if (call.name === 'deep_search_kb' && call.result) {
        const hits = call.result.hits || [];
        for (const hit of hits.slice(0, 3)) {
          sources.push({
            source_name: hit.source_name,
            page_url: hit.page_url,
            similarity: hit.similarity,
          });
        }
      }
    }
  }

  return {
    text: result.output_text || '',
    raw: result,
    agent_id: agentId,
    model: openaiRuntime.model,
    sources,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get agent statistics
 * @returns Stats about agents in the registry
 */
export function getAgentStats() {
  const registry = loadRegistry();
  
  const groups = new Map<string, number>();
  const models = new Map<string, number>();
  
  for (const agent of registry.agents) {
    groups.set(agent.group, (groups.get(agent.group) || 0) + 1);
    
    if (agent.runtime.openai) {
      models.set(agent.runtime.openai.model, (models.get(agent.runtime.openai.model) || 0) + 1);
    }
  }

  return {
    total_agents: registry.agents.length,
    total_tools: registry.tools.length,
    groups: Object.fromEntries(groups),
    models: Object.fromEntries(models),
    version: registry.version,
  };
}

/**
 * Validate that all agents reference valid tools
 * @returns Validation errors, if any
 */
export function validateRegistry(): string[] {
  const registry = loadRegistry();
  const errors: string[] = [];
  const toolIds = new Set(registry.tools.map((t) => t.id));

  for (const agent of registry.agents) {
    // Check OpenAI tools
    if (agent.runtime.openai) {
      for (const toolRef of agent.runtime.openai.tools) {
        if (!toolIds.has(toolRef)) {
          errors.push(`Agent "${agent.id}" references unknown tool: ${toolRef}`);
        }
      }
    }

    // Check Gemini tools
    if (agent.runtime.gemini) {
      for (const toolRef of agent.runtime.gemini.tools) {
        if (!toolIds.has(toolRef)) {
          errors.push(`Agent "${agent.id}" (Gemini) references unknown tool: ${toolRef}`);
        }
      }
    }

    // Check KB scopes reference valid tools
    if (agent.kb_scopes) {
      for (const scope of agent.kb_scopes) {
        if (!toolIds.has(scope.tool)) {
          errors.push(`Agent "${agent.id}" KB scope references unknown tool: ${scope.tool}`);
        }
      }
    }
  }

  return errors;
}
