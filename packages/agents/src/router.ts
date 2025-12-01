import {
  loadAgentsRegistry,
  getAgentById,
  type AgentRegistryEntry,
} from "./registry/index.js";
import {
  createOpenAIAgentFromRegistry,
  runOpenAIAgent,
  type Agent as OpenAIAgent,
} from "./openai/index.js";
import {
  createGeminiAgentFromRegistry,
  runGeminiAgent,
  type GeminiAgentConfig,
} from "./gemini/index.js";

export type UnifiedRunOptions = {
  agentId: string;
  input: string;
  metadata?: {
    jurisdictionCode?: string;
    userId?: string;
    sessionId?: string;
  };
  forceEngine?: "openai" | "gemini";
};

export type UnifiedRunResult = {
  agentId: string;
  engine: "openai" | "gemini";
  output: string;
  toolCalls?: Array<{
    tool: string;
    input: unknown;
    output: unknown;
  }>;
  metadata?: Record<string, unknown>;
};

export class AgentRouter {
  private openaiAgents: Map<string, OpenAIAgent> = new Map();
  private geminiAgents: Map<string, GeminiAgentConfig> = new Map();
  private registry: AgentRegistryEntry[];

  constructor() {
    this.registry = loadAgentsRegistry();
    this.initializeAgents();
  }

  private initializeAgents() {
    for (const entry of this.registry) {
      this.openaiAgents.set(entry.id, createOpenAIAgentFromRegistry(entry));
      this.geminiAgents.set(entry.id, createGeminiAgentFromRegistry(entry));
    }
  }

  async run(options: UnifiedRunOptions): Promise<UnifiedRunResult> {
    const entry = getAgentById(options.agentId);
    if (!entry) {
      throw new Error(`Unknown agent: ${options.agentId}`);
    }

    const engine = options.forceEngine ?? entry.engine_preferences.primary;

    if (engine === "openai") {
      return this.runWithOpenAI(entry, options);
    } else {
      return this.runWithGemini(entry, options);
    }
  }

  private async runWithOpenAI(
    entry: AgentRegistryEntry,
    options: UnifiedRunOptions
  ): Promise<UnifiedRunResult> {
    const agent = this.openaiAgents.get(entry.id);
    if (!agent) {
      throw new Error(`OpenAI agent not initialized: ${entry.id}`);
    }

    const result = await runOpenAIAgent(agent, {
      input: options.input,
      metadata: options.metadata,
    });

    return {
      ...result,
      engine: "openai",
    };
  }

  private async runWithGemini(
    entry: AgentRegistryEntry,
    options: UnifiedRunOptions
  ): Promise<UnifiedRunResult> {
    const config = this.geminiAgents.get(entry.id);
    if (!config) {
      throw new Error(`Gemini agent not initialized: ${entry.id}`);
    }

    const result = await runGeminiAgent(config, {
      input: options.input,
      metadata: options.metadata,
    });

    return {
      ...result,
      engine: "gemini",
    };
  }

  getAgent(agentId: string): AgentRegistryEntry | undefined {
    return getAgentById(agentId);
  }

  listAgents(): AgentRegistryEntry[] {
    return this.registry;
  }

  searchAgents(query: {
    category?: string;
    jurisdiction?: string;
    tags?: string[];
  }): AgentRegistryEntry[] {
    let agents = this.registry;

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
}

export const agentRouter = new AgentRouter();
