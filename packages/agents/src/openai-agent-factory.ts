import type { AgentRegistryLoader } from './registry-loader';
import type { DeepSearchWrapper } from './deep-search-wrapper';

export interface OpenAIAgentConfig {
  apiKey: string;
  organization?: string;
}

export interface OpenAIAgent {
  id: string;
  model: string;
  instructions: string;
  temperature: number;
  tools: unknown[];
}

export class OpenAIAgentFactory {
  private registry: AgentRegistryLoader;
  private deepSearch: DeepSearchWrapper;
  private config: OpenAIAgentConfig;

  constructor(
    registry: AgentRegistryLoader,
    deepSearch: DeepSearchWrapper,
    config: OpenAIAgentConfig
  ) {
    this.registry = registry;
    this.deepSearch = deepSearch;
    this.config = config;
  }

  createAgent(agentId: string): OpenAIAgent {
    const agentConfig = this.registry.getOpenAIConfig(agentId);
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
    const scopes = agent.kb_scopes;

    if (agent.runtime.openai.tools.includes('deep_search_kb')) {
      const toolDef = this.registry.getTool('deep_search_kb');
      if (toolDef) {
        tools.push({
          type: 'function',
          function: {
            name: toolDef.implementation.openai.tool_name,
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
          },
        });
      }
    }

    return tools;
  }

  async handleToolCall(
    agentId: string,
    toolName: string,
    args: Record<string, unknown>
  ): Promise<string> {
    if (toolName === 'deep_search_kb') {
      const query = args.query as string;
      const scopes = this.registry.getAgentKBScopes(agentId);
      
      const results = await this.deepSearch.search(query, scopes);
      
      return DeepSearchWrapper.formatResultsForPrompt(results);
    }

    throw new Error(`Unknown tool: ${toolName}`);
  }

  listAvailableAgents(): Array<{ id: string; label: string; group: string }> {
    return this.registry.getAllAgents().map(agent => ({
      id: agent.id,
      label: agent.label,
      group: agent.group,
    }));
  }

  getAgentsByGroup(group: string): string[] {
    return this.registry.getAgentsByGroup(group).map(a => a.id);
  }
}
