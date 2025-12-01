import { describe, it, expect, beforeEach } from 'vitest';
import { AgentRegistryLoader } from '../src/registry-loader';
import { join } from 'path';

describe('AgentRegistryLoader', () => {
  let registry: AgentRegistryLoader;

  beforeEach(() => {
    const registryPath = join(process.cwd(), 'config', 'agent_registry.yaml');
    registry = new AgentRegistryLoader(registryPath);
  });

  describe('initialization', () => {
    it('should load registry from default path', () => {
      const defaultRegistry = AgentRegistryLoader.fromDefault();
      expect(defaultRegistry).toBeDefined();
      expect(defaultRegistry.getAgentCount()).toBeGreaterThan(0);
    });

    it('should have correct agent count', () => {
      expect(registry.getAgentCount()).toBe(36);
    });

    it('should have correct tool count', () => {
      expect(registry.getToolCount()).toBe(1);
    });

    it('should have all expected groups', () => {
      const groups = registry.listGroups();
      expect(groups).toContain('tax');
      expect(groups).toContain('audit');
      expect(groups).toContain('accounting');
      expect(groups).toContain('corporate-services');
      expect(groups).toHaveLength(4);
    });
  });

  describe('validation', () => {
    it('should pass validation', () => {
      const validation = registry.validate();
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const invalidRegistry = {
        version: 1,
        tools: [
          {
            id: 'deep_search_kb',
            kind: 'rag_search',
            description: 'Test',
            implementation: {
              openai: { tool_name: 'deep_search_kb' },
              gemini: { function_name: 'deep_search_kb' },
            },
            default_params: { matchCount: 15, min_similarity: 0.72 },
          },
        ],
        agents: [
          {
            id: '',
            label: '',
            group: '',
            runtime: {
              openai: { model: 'gpt-4o-mini', temperature: 0.1, tools: [] },
              gemini: { model: 'gemini-1.5-pro', tools: [] },
            },
            persona: '',
            kb_scopes: [],
          },
        ],
      };

      const loader = new AgentRegistryLoader.__proto__.constructor;
      const testRegistry = Object.create(loader.prototype);
      testRegistry.registry = invalidRegistry;
      testRegistry.agentMap = new Map([[invalidRegistry.agents[0].id, invalidRegistry.agents[0]]]);
      testRegistry.toolMap = new Map([[invalidRegistry.tools[0].id, invalidRegistry.tools[0]]]);

      const validation = testRegistry.validate();
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('agent retrieval', () => {
    it('should get agent by id', () => {
      const agent = registry.getAgent('tax-corp-rw-027');
      expect(agent).toBeDefined();
      expect(agent?.id).toBe('tax-corp-rw-027');
      expect(agent?.label).toBe('Rwanda Corporate Tax Specialist');
      expect(agent?.group).toBe('tax');
    });

    it('should return undefined for non-existent agent', () => {
      const agent = registry.getAgent('non-existent');
      expect(agent).toBeUndefined();
    });

    it('should get agents by group', () => {
      const taxAgents = registry.getAgentsByGroup('tax');
      expect(taxAgents).toHaveLength(12);
      expect(taxAgents.every(a => a.group === 'tax')).toBe(true);

      const auditAgents = registry.getAgentsByGroup('audit');
      expect(auditAgents).toHaveLength(10);

      const accountingAgents = registry.getAgentsByGroup('accounting');
      expect(accountingAgents).toHaveLength(8);

      const corpAgents = registry.getAgentsByGroup('corporate-services');
      expect(corpAgents).toHaveLength(6);
    });

    it('should get all agents', () => {
      const allAgents = registry.getAllAgents();
      expect(allAgents).toHaveLength(36);
    });

    it('should list all agent IDs', () => {
      const ids = registry.listAgentIds();
      expect(ids).toHaveLength(36);
      expect(ids).toContain('tax-corp-rw-027');
      expect(ids).toContain('audit-planning');
      expect(ids).toContain('acct-revenue-001');
      expect(ids).toContain('corp-form-034');
    });
  });

  describe('tool retrieval', () => {
    it('should get tool by id', () => {
      const tool = registry.getTool('deep_search_kb');
      expect(tool).toBeDefined();
      expect(tool?.id).toBe('deep_search_kb');
      expect(tool?.kind).toBe('rag_search');
      expect(tool?.implementation.openai.tool_name).toBe('deep_search_kb');
      expect(tool?.implementation.gemini.function_name).toBe('deep_search_kb');
    });

    it('should get all tools', () => {
      const tools = registry.getAllTools();
      expect(tools).toHaveLength(1);
      expect(tools[0].id).toBe('deep_search_kb');
    });
  });

  describe('KB scopes', () => {
    it('should get KB scopes for agent', () => {
      const scopes = registry.getAgentKBScopes('tax-corp-rw-027');
      expect(scopes).toBeDefined();
      expect(scopes.length).toBeGreaterThan(0);
      
      const scope = scopes[0];
      expect(scope.tool).toBe('deep_search_kb');
      expect(scope.category).toBe('TAX');
      expect(scope.jurisdictions).toContain('RW');
      expect(scope.max_results).toBe(25);
      expect(scope.min_similarity).toBe(0.72);
    });

    it('should return empty array for agent without scopes', () => {
      const scopes = registry.getAgentKBScopes('non-existent');
      expect(scopes).toEqual([]);
    });

    it('should have multi-category scopes for tax provision agent', () => {
      const scopes = registry.getAgentKBScopes('tax-provision-031');
      expect(scopes.length).toBeGreaterThan(1);
      
      const categories = scopes.map(s => s.category);
      expect(categories).toContain('TAX');
      expect(categories).toContain('IFRS');
      expect(categories).toContain('US_GAAP');
    });
  });

  describe('OpenAI config', () => {
    it('should get OpenAI config for agent', () => {
      const config = registry.getOpenAIConfig('tax-corp-rw-027');
      expect(config).toBeDefined();
      expect(config.model).toBe('gpt-4o-mini');
      expect(config.temperature).toBe(0.05);
      expect(config.tools).toContain('deep_search_kb');
      expect(config.instructions).toContain('Rwanda corporate income tax specialist');
    });

    it('should throw for non-existent agent', () => {
      expect(() => registry.getOpenAIConfig('non-existent')).toThrow();
    });

    it('should build instructions correctly', () => {
      const instructions = registry.buildOpenAIInstructions('acct-revenue-001');
      expect(instructions).toContain('revenue recognition specialist');
      expect(instructions).toContain('IFRS 15');
      expect(instructions).toContain('ASC 606');
    });
  });

  describe('Gemini config', () => {
    it('should get Gemini config for agent', () => {
      const config = registry.getGeminiConfig('tax-corp-rw-027');
      expect(config).toBeDefined();
      expect(config.model).toBe('gemini-1.5-pro');
      expect(config.temperature).toBe(0.05);
      expect(config.tools).toContain('deep_search_kb');
      expect(config.instructions).toContain('Rwanda corporate income tax specialist');
    });

    it('should use OpenAI temperature if Gemini temperature not set', () => {
      const config = registry.getGeminiConfig('tax-corp-eu-022');
      expect(config.temperature).toBe(0.1);
    });

    it('should use flash model for research agents', () => {
      const config = registry.getGeminiConfig('tax-research-033');
      expect(config.model).toBe('gemini-1.5-flash');
    });
  });

  describe('specific agent configurations', () => {
    it('should have correct config for EU tax agent', () => {
      const agent = registry.getAgent('tax-corp-eu-022');
      expect(agent?.runtime.openai.temperature).toBe(0.1);
      expect(agent?.kb_scopes[0].jurisdictions).toContain('EU');
      expect(agent?.kb_scopes[0].jurisdictions).toContain('GLOBAL');
    });

    it('should have correct config for audit planning agent', () => {
      const agent = registry.getAgent('audit-planning');
      expect(agent?.group).toBe('audit');
      expect(agent?.file).toBe('planning.ts');
      expect(agent?.kb_scopes[0].category).toBe('ISA');
      expect(agent?.kb_scopes[0].tags_any).toContain('isa-300');
    });

    it('should have correct config for revenue agent', () => {
      const agent = registry.getAgent('acct-revenue-001');
      expect(agent?.group).toBe('accounting');
      expect(agent?.runtime.openai.temperature).toBe(0.05);
      
      const categories = agent?.kb_scopes.map(s => s.category) || [];
      expect(categories).toContain('IFRS');
      expect(categories).toContain('US_GAAP');
    });

    it('should have correct config for corporate formation agent', () => {
      const agent = registry.getAgent('corp-form-034');
      expect(agent?.group).toBe('corporate-services');
      expect(agent?.kb_scopes.length).toBe(2);
      
      const categories = agent?.kb_scopes.map(s => s.category) || [];
      expect(categories).toContain('CORP');
      expect(categories).toContain('REG');
    });
  });
});
