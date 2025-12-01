import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OpenAIAgentFactory } from '../src/openai-agent-factory';
import { AgentRegistryLoader } from '../src/registry-loader';
import { DeepSearchWrapper } from '../src/deep-search-wrapper';
import { join } from 'path';

describe('OpenAIAgentFactory', () => {
  let registry: AgentRegistryLoader;
  let deepSearch: DeepSearchWrapper;
  let factory: OpenAIAgentFactory;

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
    
    factory = new OpenAIAgentFactory(
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
      expect(agent.model).toBe('gpt-4o-mini');
      expect(agent.temperature).toBe(0.05);
      expect(agent.instructions).toContain('Rwanda corporate income tax specialist');
      expect(agent.tools).toHaveLength(1);
    });

    it('should create tools with correct OpenAI format', () => {
      const agent = factory.createAgent('acct-revenue-001');

      expect(agent.tools[0]).toEqual({
        type: 'function',
        function: {
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
        },
      });
    });

    it('should throw for non-existent agent', () => {
      expect(() => factory.createAgent('non-existent')).toThrow('Agent non-existent not found');
    });

    it('should create different configs for different agents', () => {
      const taxAgent = factory.createAgent('tax-corp-rw-027');
      const auditAgent = factory.createAgent('audit-planning');

      expect(taxAgent.temperature).toBe(0.05);
      expect(auditAgent.temperature).toBe(0.1);
      expect(taxAgent.instructions).not.toBe(auditAgent.instructions);
    });
  });

  describe('handleToolCall', () => {
    it('should handle deep_search_kb tool call', async () => {
      const response = await factory.handleToolCall(
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
      
      const customFactory = new OpenAIAgentFactory(
        registry,
        customDeepSearch,
        { apiKey: 'test-key' }
      );

      await customFactory.handleToolCall(
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

    it('should throw for unknown tool', async () => {
      await expect(
        factory.handleToolCall('tax-corp-rw-027', 'unknown_tool', {})
      ).rejects.toThrow('Unknown tool: unknown_tool');
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

    it('should include all agent groups', () => {
      const agents = factory.listAvailableAgents();
      const groups = new Set(agents.map(a => a.group));

      expect(groups).toContain('tax');
      expect(groups).toContain('audit');
      expect(groups).toContain('accounting');
      expect(groups).toContain('corporate-services');
    });
  });

  describe('getAgentsByGroup', () => {
    it('should get tax agents', () => {
      const taxAgents = factory.getAgentsByGroup('tax');
      expect(taxAgents).toHaveLength(12);
      expect(taxAgents).toContain('tax-corp-rw-027');
    });

    it('should get audit agents', () => {
      const auditAgents = factory.getAgentsByGroup('audit');
      expect(auditAgents).toHaveLength(10);
      expect(auditAgents).toContain('audit-planning');
    });

    it('should get accounting agents', () => {
      const accountingAgents = factory.getAgentsByGroup('accounting');
      expect(accountingAgents).toHaveLength(8);
      expect(accountingAgents).toContain('acct-revenue-001');
    });

    it('should get corporate services agents', () => {
      const corpAgents = factory.getAgentsByGroup('corporate-services');
      expect(corpAgents).toHaveLength(6);
      expect(corpAgents).toContain('corp-form-034');
    });

    it('should return empty array for non-existent group', () => {
      const agents = factory.getAgentsByGroup('non-existent');
      expect(agents).toHaveLength(0);
    });
  });
});
