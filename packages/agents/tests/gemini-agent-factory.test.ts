import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeminiAgentFactory } from '../src/gemini-agent-factory';
import { AgentRegistryLoader } from '../src/registry-loader';
import { DeepSearchWrapper } from '../src/deep-search-wrapper';
import { join } from 'path';

describe('GeminiAgentFactory', () => {
  let registry: AgentRegistryLoader;
  let deepSearch: DeepSearchWrapper;
  let factory: GeminiAgentFactory;

  beforeEach(() => {
    const registryPath = join(process.cwd(), 'config', 'agent_registry.yaml');
    registry = new AgentRegistryLoader(registryPath);
    
    const mockSearchFn = vi.fn().mockResolvedValue([
      {
        id: 'result-1',
        content: 'Test content',
        metadata: {
          source: 'Test Source',
          category: 'TAX',
          jurisdiction: 'RW',
          tags: ['test'],
          similarity: 0.85,
        },
      },
    ]);
    
    deepSearch = new DeepSearchWrapper(mockSearchFn);
    
    factory = new GeminiAgentFactory(
      registry,
      deepSearch,
      { apiKey: 'test-key' }
    );
  });

  describe('createAgent', () => {
    it('should create agent with correct config', () => {
      const agent = factory.createAgent('tax-corp-rw-027');

      expect(agent).toBeDefined();
      expect(agent.id).toBe('tax-corp-rw-027');
      expect(agent.model).toBe('gemini-1.5-pro');
      expect(agent.temperature).toBe(0.05);
      expect(agent.instructions).toContain('Rwanda corporate income tax specialist');
      expect(agent.tools).toHaveLength(1);
    });

    it('should create tools with correct Gemini format', () => {
      const agent = factory.createAgent('acct-revenue-001');

      expect(agent.tools[0]).toEqual({
        name: 'deep_search_kb',
        description: expect.stringContaining('knowledge base'),
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
    });

    it('should use gemini-1.5-flash for research agents', () => {
      const agent = factory.createAgent('tax-research-033');
      expect(agent.model).toBe('gemini-1.5-flash');
    });

    it('should use gemini-1.5-flash for analytics agents', () => {
      const agent = factory.createAgent('audit-analytics');
      expect(agent.model).toBe('gemini-1.5-flash');
    });

    it('should throw for non-existent agent', () => {
      expect(() => factory.createAgent('non-existent')).toThrow('Agent non-existent not found');
    });

    it('should fallback to OpenAI temperature if Gemini not set', () => {
      const agent = factory.createAgent('tax-corp-eu-022');
      expect(agent.temperature).toBe(0.1);
    });
  });

  describe('handleFunctionCall', () => {
    it('should handle deep_search_kb function call', async () => {
      const response = await factory.handleFunctionCall(
        'tax-corp-rw-027',
        'deep_search_kb',
        { query: 'What are the corporate tax rates in Rwanda?' }
      );

      expect(response).toContain('## Knowledge Base Results');
      expect(response).toContain('Test content');
    });

    it('should use agent-specific KB scopes', async () => {
      const mockSearchFn = vi.fn().mockResolvedValue([]);
      const customDeepSearch = new DeepSearchWrapper(mockSearchFn);
      
      const customFactory = new GeminiAgentFactory(
        registry,
        customDeepSearch,
        { apiKey: 'test-key' }
      );

      await customFactory.handleFunctionCall(
        'tax-corp-rw-027',
        'deep_search_kb',
        { query: 'test query' }
      );

      expect(mockSearchFn).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'test query',
          category: 'TAX',
          jurisdictions: expect.arrayContaining(['RW', 'GLOBAL']),
        })
      );
    });

    it('should throw for unknown function', async () => {
      await expect(
        factory.handleFunctionCall('tax-corp-rw-027', 'unknown_function', {})
      ).rejects.toThrow('Unknown function: unknown_function');
    });
  });

  describe('listAvailableAgents', () => {
    it('should list all agents', () => {
      const agents = factory.listAvailableAgents();

      expect(agents).toHaveLength(36);
      expect(agents[0]).toHaveProperty('id');
      expect(agents[0]).toHaveProperty('label');
      expect(agents[0]).toHaveProperty('group');
    });
  });

  describe('getAgentsByGroup', () => {
    it('should get agents by group', () => {
      const taxAgents = factory.getAgentsByGroup('tax');
      expect(taxAgents).toHaveLength(12);

      const auditAgents = factory.getAgentsByGroup('audit');
      expect(auditAgents).toHaveLength(10);

      const accountingAgents = factory.getAgentsByGroup('accounting');
      expect(accountingAgents).toHaveLength(8);

      const corpAgents = factory.getAgentsByGroup('corporate-services');
      expect(corpAgents).toHaveLength(6);
    });
  });

  describe('model selection', () => {
    it('should use gemini-1.5-pro for most agents', () => {
      const taxAgent = factory.createAgent('tax-corp-rw-027');
      const auditAgent = factory.createAgent('audit-planning');
      const acctAgent = factory.createAgent('acct-revenue-001');

      expect(taxAgent.model).toBe('gemini-1.5-pro');
      expect(auditAgent.model).toBe('gemini-1.5-pro');
      expect(acctAgent.model).toBe('gemini-1.5-pro');
    });

    it('should use gemini-1.5-flash for specific agents', () => {
      const researchAgent = factory.createAgent('tax-research-033');
      const analyticsAgent = factory.createAgent('audit-analytics');
      const calendarAgent = factory.createAgent('corp-cal-038');

      expect(researchAgent.model).toBe('gemini-1.5-flash');
      expect(analyticsAgent.model).toBe('gemini-1.5-flash');
      expect(calendarAgent.model).toBe('gemini-1.5-flash');
    });
  });
});
