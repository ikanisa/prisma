import { AgentRegistryLoader } from './registry-loader.js';
import { DeepSearchWrapper } from './deep-search-wrapper.js';

export interface GeminiAgentConfig {
  apiKey: string;
  project?: string;
}

export interface GeminiAgent {
  id: string;
  model: string;
  instructions: string;
  temperature: number;
  tools: unknown[];
}

export class GeminiAgentFactory {
  private registry: AgentRegistryLoader;
  private deepSearch: DeepSearchWrapper;
  private config: GeminiAgentConfig;

  constructor(
    registry: AgentRegistryLoader,
    deepSearch: DeepSearchWrapper,
    config: GeminiAgentConfig
  ) {
    this.registry = registry;
    this.deepSearch = deepSearch;
    this.config = config;
  }

  createAgent(agentId: string): GeminiAgent {
    const agentConfig = this.registry.getGeminiConfig(agentId);
    const agent = this.registry.getAgent(agentId);
    
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    const tools = this.buildTools(agentId);

    return {
      id: agentId,
      model: agentConfig.model,
      instructions: agentConfig.instructions,
      temperature: agentConfig.temperature,
      tools,
    };
  }

  private buildTools(agentId: string): unknown[] {
    const agent = this.registry.getAgent(agentId);
    if (!agent) {
      return [];
    }

    const tools: unknown[] = [];

    if (agent.runtime.gemini.tools.includes('deep_search_kb')) {
      const toolDef = this.registry.getTool('deep_search_kb');
      if (toolDef) {
        tools.push({
          name: toolDef.implementation.gemini.function_name,
          description: toolDef.description,
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query for the knowledge base',
              },
            },
            required: ['query'],
          },
        });
      }
    }

    return tools;
  }

  async handleFunctionCall(
    agentId: string,
    functionName: string,
    args: Record<string, unknown>
  ): Promise<string> {
    if (functionName === 'deep_search_kb') {
      const query = args.query as string;
      const scopes = this.registry.getAgentKBScopes(agentId);
      
      const results = await this.deepSearch.search(query, scopes);
      
      return DeepSearchWrapper.formatResultsForPrompt(results);
    }

    throw new Error(`Unknown function: ${functionName}`);
  }

  listAvailableAgents(): Array<{ id: string; label: string; group: string }> {
    return this.registry.getAllAgents().map((agent: any) => ({
      id: agent.id,
      label: agent.label,
      group: agent.group,
    }));
  }

  getAgentsByGroup(group: string): string[] {
    return this.registry.getAgentsByGroup(group).map((a: any) => a.id);
  }
}
