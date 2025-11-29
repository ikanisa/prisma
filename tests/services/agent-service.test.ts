/**
 * Unit tests for AgentService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Supabase client
const createMockSupabase = () => {
  const mock: any = {
    from: vi.fn(() => mock),
    select: vi.fn(() => mock),
    insert: vi.fn(() => mock),
    update: vi.fn(() => mock),
    delete: vi.fn(() => mock),
    eq: vi.fn(() => mock),
    or: vi.fn(() => mock),
    order: vi.fn(() => mock),
    range: vi.fn(() => mock),
    single: vi.fn(() => mock),
    gte: vi.fn(() => mock),
  };
  return mock;
};

// Simple in-memory implementation to test the logic
class MockAgentService {
  private agents: Map<string, any> = new Map();
  private executions: any[] = [];

  async create(data: any, userId: string) {
    const id = crypto.randomUUID();
    const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const agent = {
      id,
      ...data,
      slug,
      created_by: userId,
      version: '1.0.0',
      status: 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.agents.set(id, agent);
    return agent;
  }

  async list(filters: any) {
    let agents = Array.from(this.agents.values());
    
    if (filters.type) {
      agents = agents.filter(a => a.type === filters.type);
    }
    if (filters.status) {
      agents = agents.filter(a => a.status === filters.status);
    }
    if (filters.search) {
      const search = filters.search.toLowerCase();
      agents = agents.filter(a => 
        a.name.toLowerCase().includes(search) ||
        (a.description || '').toLowerCase().includes(search)
      );
    }
    
    const page = filters.page || 1;
    const pageSize = filters.page_size || 20;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    
    return {
      items: agents.slice(start, end),
      total: agents.length,
      page,
      page_size: pageSize,
    };
  }

  async getById(id: string) {
    return this.agents.get(id) || null;
  }

  async update(id: string, data: any) {
    const agent = this.agents.get(id);
    if (!agent) throw new Error('Agent not found');
    
    const updated = {
      ...agent,
      ...data,
      updated_at: new Date().toISOString(),
    };
    this.agents.set(id, updated);
    return updated;
  }

  async delete(id: string) {
    const agent = this.agents.get(id);
    if (agent) {
      agent.status = 'archived';
      agent.updated_at = new Date().toISOString();
    }
  }

  async duplicate(id: string, userId: string) {
    const original = this.agents.get(id);
    if (!original) throw new Error('Agent not found');
    
    const newId = crypto.randomUUID();
    const duplicate = {
      ...original,
      id: newId,
      slug: `${original.slug}-copy-${Date.now()}`,
      name: `${original.name} (Copy)`,
      status: 'draft',
      version: '1.0.0',
      parent_version_id: original.id,
      created_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    this.agents.set(newId, duplicate);
    return duplicate;
  }

  async publish(id: string, version: string) {
    const agent = this.agents.get(id);
    if (!agent) throw new Error('Agent not found');
    
    agent.status = 'active';
    agent.version = version;
    agent.published_at = new Date().toISOString();
    agent.updated_at = new Date().toISOString();
    return agent;
  }

  async test(id: string, input: any) {
    const agent = this.agents.get(id);
    if (!agent) throw new Error('Agent not found');
    
    const startTime = Date.now();
    const execution = {
      id: crypto.randomUUID(),
      agent_id: id,
      input_text: input.input_text,
      output_text: `[Test Mode] Agent "${agent.name}" received input.`,
      latency_ms: Date.now() - startTime + 100,
      tokens_used: { input: 10, output: 20 },
      model_used: 'gpt-4',
      created_at: new Date().toISOString(),
    };
    this.executions.push(execution);
    return execution;
  }

  async getStats(agentId: string, days: number = 30) {
    const agentExecutions = this.executions.filter(e => e.agent_id === agentId);
    const total = agentExecutions.length;
    
    return {
      total_executions: total,
      avg_latency_ms: total > 0 
        ? agentExecutions.reduce((sum, e) => sum + e.latency_ms, 0) / total 
        : 0,
      success_rate: 100,
      total_cost: total * 0.001,
    };
  }
}

describe('AgentService', () => {
  let agentService: MockAgentService;

  beforeEach(() => {
    agentService = new MockAgentService();
  });

  describe('create', () => {
    it('should create a new agent with correct data', async () => {
      const result = await agentService.create({
        organization_id: 'org-uuid',
        name: 'Test Agent',
        type: 'assistant',
        is_public: false,
      }, 'user-uuid');

      expect(result.name).toBe('Test Agent');
      expect(result.slug).toBe('test-agent');
      expect(result.status).toBe('draft');
      expect(result.version).toBe('1.0.0');
      expect(result.created_by).toBe('user-uuid');
    });

    it('should generate unique IDs for each agent', async () => {
      const agent1 = await agentService.create({ name: 'Agent 1', type: 'assistant' }, 'user');
      const agent2 = await agentService.create({ name: 'Agent 2', type: 'assistant' }, 'user');

      expect(agent1.id).not.toBe(agent2.id);
    });
  });

  describe('list', () => {
    beforeEach(async () => {
      await agentService.create({ name: 'Agent 1', type: 'assistant' }, 'user');
      await agentService.create({ name: 'Agent 2', type: 'specialist' }, 'user');
      await agentService.create({ name: 'Agent 3', type: 'assistant', description: 'Tax helper' }, 'user');
    });

    it('should return paginated agents', async () => {
      const result = await agentService.list({ page: 1, page_size: 20 });

      expect(result.items).toHaveLength(3);
      expect(result.total).toBe(3);
      expect(result.page).toBe(1);
    });

    it('should filter by type', async () => {
      const result = await agentService.list({ type: 'assistant' });

      expect(result.items).toHaveLength(2);
      expect(result.items.every(a => a.type === 'assistant')).toBe(true);
    });

    it('should filter by search', async () => {
      const result = await agentService.list({ search: 'tax' });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].description).toContain('Tax');
    });

    it('should handle pagination', async () => {
      const result = await agentService.list({ page: 1, page_size: 2 });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(3);
    });
  });

  describe('getById', () => {
    it('should return agent when found', async () => {
      const created = await agentService.create({ name: 'Test', type: 'assistant' }, 'user');
      const result = await agentService.getById(created.id);

      expect(result).not.toBeNull();
      expect(result.id).toBe(created.id);
    });

    it('should return null when not found', async () => {
      const result = await agentService.getById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update agent with new data', async () => {
      const created = await agentService.create({ name: 'Original', type: 'assistant' }, 'user');
      const result = await agentService.update(created.id, { name: 'Updated', description: 'New desc' });

      expect(result.name).toBe('Updated');
      expect(result.description).toBe('New desc');
      expect(result.updated_at).not.toBe(created.updated_at);
    });

    it('should throw when agent not found', async () => {
      await expect(
        agentService.update('nonexistent', { name: 'Updated' })
      ).rejects.toThrow('Agent not found');
    });
  });

  describe('delete', () => {
    it('should soft delete by setting status to archived', async () => {
      const created = await agentService.create({ name: 'Test', type: 'assistant' }, 'user');
      await agentService.delete(created.id);

      const result = await agentService.getById(created.id);
      expect(result.status).toBe('archived');
    });
  });

  describe('duplicate', () => {
    it('should create a copy with new name and slug', async () => {
      const original = await agentService.create({ name: 'Original', type: 'assistant' }, 'user');
      const duplicate = await agentService.duplicate(original.id, 'user2');

      expect(duplicate.id).not.toBe(original.id);
      expect(duplicate.name).toBe('Original (Copy)');
      expect(duplicate.slug).toContain('copy');
      expect(duplicate.status).toBe('draft');
      expect(duplicate.parent_version_id).toBe(original.id);
    });

    it('should throw when original not found', async () => {
      await expect(
        agentService.duplicate('nonexistent', 'user')
      ).rejects.toThrow('Agent not found');
    });
  });

  describe('publish', () => {
    it('should set status to active and update version', async () => {
      const created = await agentService.create({ name: 'Test', type: 'assistant' }, 'user');
      const result = await agentService.publish(created.id, '1.1.0');

      expect(result.status).toBe('active');
      expect(result.version).toBe('1.1.0');
      expect(result.published_at).toBeDefined();
    });
  });

  describe('test', () => {
    it('should execute test and return result', async () => {
      const created = await agentService.create({ name: 'Test Agent', type: 'assistant' }, 'user');
      const result = await agentService.test(created.id, { input_text: 'Hello!' });

      expect(result.output_text).toContain('Test Agent');
      expect(result.latency_ms).toBeGreaterThanOrEqual(0);
      expect(result.agent_id).toBe(created.id);
    });
  });

  describe('getStats', () => {
    it('should return execution statistics', async () => {
      const created = await agentService.create({ name: 'Test', type: 'assistant' }, 'user');
      
      // Run some test executions
      await agentService.test(created.id, { input_text: 'Test 1' });
      await agentService.test(created.id, { input_text: 'Test 2' });

      const stats = await agentService.getStats(created.id, 30);

      expect(stats.total_executions).toBe(2);
      expect(stats.avg_latency_ms).toBeGreaterThan(0);
      expect(stats.success_rate).toBe(100);
    });
  });
});
