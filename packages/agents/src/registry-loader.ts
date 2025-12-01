import { readFileSync } from 'fs';
import { join } from 'path';
import { parse } from 'yaml';

export interface ToolDefinition {
  id: string;
  kind: string;
  description: string;
  implementation: {
    openai: { tool_name: string };
    gemini: { function_name: string };
  };
  default_params: {
    matchCount: number;
    min_similarity: number;
  };
}

export interface KBScope {
  tool: string;
  category: string;
  jurisdictions: string[];
  tags_any: string[];
  max_results: number;
  min_similarity: number;
}

export interface RuntimeConfig {
  openai: {
    model: string;
    temperature: number;
    tools: string[];
  };
  gemini: {
    model: string;
    temperature?: number;
    tools: string[];
  };
}

export interface AgentDefinition {
  id: string;
  label: string;
  group: string;
  file?: string;
  runtime: RuntimeConfig;
  persona: string;
  kb_scopes: KBScope[];
}

export interface AgentRegistry {
  version: number;
  tools: ToolDefinition[];
  agents: AgentDefinition[];
}

export class AgentRegistryLoader {
  private registry: AgentRegistry;
  private agentMap: Map<string, AgentDefinition>;
  private toolMap: Map<string, ToolDefinition>;

  constructor(registryPath: string) {
    const content = readFileSync(registryPath, 'utf-8');
    this.registry = parse(content) as AgentRegistry;
    
    this.agentMap = new Map(
      this.registry.agents.map(agent => [agent.id, agent])
    );
    
    this.toolMap = new Map(
      this.registry.tools.map(tool => [tool.id, tool])
    );
  }

  static fromDefault(): AgentRegistryLoader {
    const registryPath = join(process.cwd(), 'config', 'agent_registry.yaml');
    return new AgentRegistryLoader(registryPath);
  }

  getAgent(agentId: string): AgentDefinition | undefined {
    return this.agentMap.get(agentId);
  }

  getAgentsByGroup(group: string): AgentDefinition[] {
    return this.registry.agents.filter(agent => agent.group === group);
  }

  getAllAgents(): AgentDefinition[] {
    return this.registry.agents;
  }

  getTool(toolId: string): ToolDefinition | undefined {
    return this.toolMap.get(toolId);
  }

  getAllTools(): ToolDefinition[] {
    return this.registry.tools;
  }

  getAgentKBScopes(agentId: string): KBScope[] {
    const agent = this.getAgent(agentId);
    return agent?.kb_scopes || [];
  }

  buildOpenAIInstructions(agentId: string): string {
    const agent = this.getAgent(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }
    return agent.persona.trim();
  }

  buildGeminiInstructions(agentId: string): string {
    return this.buildOpenAIInstructions(agentId);
  }

  getOpenAIConfig(agentId: string) {
    const agent = this.getAgent(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }
    return {
      model: agent.runtime.openai.model,
      temperature: agent.runtime.openai.temperature,
      instructions: this.buildOpenAIInstructions(agentId),
      tools: agent.runtime.openai.tools,
    };
  }

  getGeminiConfig(agentId: string) {
    const agent = this.getAgent(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }
    return {
      model: agent.runtime.gemini.model,
      temperature: agent.runtime.gemini.temperature ?? agent.runtime.openai.temperature,
      instructions: this.buildGeminiInstructions(agentId),
      tools: agent.runtime.gemini.tools,
    };
  }

  listAgentIds(): string[] {
    return Array.from(this.agentMap.keys());
  }

  listGroups(): string[] {
    return Array.from(new Set(this.registry.agents.map(a => a.group)));
  }

  getAgentCount(): number {
    return this.registry.agents.length;
  }

  getToolCount(): number {
    return this.registry.tools.length;
  }

  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const agent of this.registry.agents) {
      if (!agent.id || !agent.label || !agent.group) {
        errors.push(`Agent missing required fields: ${JSON.stringify(agent)}`);
      }

      if (!agent.runtime?.openai || !agent.runtime?.gemini) {
        errors.push(`Agent ${agent.id} missing runtime config`);
      }

      if (!agent.persona || agent.persona.trim().length === 0) {
        errors.push(`Agent ${agent.id} missing persona`);
      }

      for (const scope of agent.kb_scopes || []) {
        if (!this.toolMap.has(scope.tool)) {
          errors.push(`Agent ${agent.id} references unknown tool: ${scope.tool}`);
        }
      }

      for (const toolId of agent.runtime.openai.tools) {
        if (!this.toolMap.has(toolId)) {
          errors.push(`Agent ${agent.id} openai runtime references unknown tool: ${toolId}`);
        }
      }

      for (const toolId of agent.runtime.gemini.tools) {
        if (!this.toolMap.has(toolId)) {
          errors.push(`Agent ${agent.id} gemini runtime references unknown tool: ${toolId}`);
        }
      }
    }

    const duplicateIds = this.findDuplicates(this.registry.agents.map(a => a.id));
    if (duplicateIds.length > 0) {
      errors.push(`Duplicate agent IDs: ${duplicateIds.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private findDuplicates(arr: string[]): string[] {
    const seen = new Set<string>();
    const duplicates = new Set<string>();
    for (const item of arr) {
      if (seen.has(item)) {
        duplicates.add(item);
      }
      seen.add(item);
    }
    return Array.from(duplicates);
  }
}
