/**
 * AgentService - Business logic for AI Agent operations
 * 
 * Provides CRUD operations for agents including creation, updates,
 * duplication, publishing, and test execution.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Agent,
  CreateAgentInput,
  UpdateAgentInput,
  AgentFilters,
  PaginatedResult,
  TestInput,
  ExecutionResult,
} from '../schemas/agent.schema.js';

export class AgentService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Create a new agent
   */
  async create(data: CreateAgentInput, userId: string): Promise<Agent> {
    const slug = this.generateSlug(data.name);
    
    const { data: agent, error } = await this.supabase
      .from('agents')
      .insert({
        ...data,
        slug,
        created_by: userId,
        version: '1.0.0',
        status: 'draft',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create agent: ${error.message}`);
    }

    return agent as Agent;
  }

  /**
   * List agents with filters and pagination
   */
  async list(filters: AgentFilters): Promise<PaginatedResult<Agent>> {
    const {
      page = 1,
      page_size = 20,
      type,
      status,
      search,
      organization_id,
    } = filters;

    let query = this.supabase
      .from('agents')
      .select('*', { count: 'exact' });

    if (organization_id) {
      query = query.eq('organization_id', organization_id);
    }

    if (type) {
      query = query.eq('type', type);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const from = (page - 1) * page_size;
    const to = from + page_size - 1;

    const { data, error, count } = await query
      .order('updated_at', { ascending: false })
      .range(from, to);

    if (error) {
      throw new Error(`Failed to list agents: ${error.message}`);
    }

    return {
      items: (data || []) as Agent[],
      total: count || 0,
      page,
      page_size,
    };
  }

  /**
   * Get a single agent by ID
   */
  async getById(id: string): Promise<Agent | null> {
    const { data, error } = await this.supabase
      .from('agents')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to get agent: ${error.message}`);
    }

    return data as Agent;
  }

  /**
   * Update an existing agent
   */
  async update(id: string, data: UpdateAgentInput): Promise<Agent> {
    const { data: agent, error } = await this.supabase
      .from('agents')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update agent: ${error.message}`);
    }

    return agent as Agent;
  }

  /**
   * Delete an agent (soft delete - archive)
   */
  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('agents')
      .update({
        status: 'archived',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete agent: ${error.message}`);
    }
  }

  /**
   * Duplicate an existing agent
   */
  async duplicate(id: string, userId: string): Promise<Agent> {
    const original = await this.getById(id);
    if (!original) {
      throw new Error('Agent not found');
    }

    const newSlug = `${original.slug}-copy-${Date.now()}`;
    const newName = `${original.name} (Copy)`;

    const { data: agent, error } = await this.supabase
      .from('agents')
      .insert({
        organization_id: original.organization_id,
        slug: newSlug,
        name: newName,
        description: original.description,
        avatar_url: original.avatar_url,
        type: original.type,
        category: original.category,
        status: 'draft',
        is_public: false,
        version: '1.0.0',
        parent_version_id: original.id,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to duplicate agent: ${error.message}`);
    }

    // Also duplicate personas
    await this.duplicatePersonas(id, agent.id);

    return agent as Agent;
  }

  /**
   * Publish an agent (set status to active)
   */
  async publish(id: string, version: string): Promise<Agent> {
    const { data: agent, error } = await this.supabase
      .from('agents')
      .update({
        status: 'active',
        version,
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to publish agent: ${error.message}`);
    }

    return agent as Agent;
  }

  /**
   * Test agent execution
   */
  async test(id: string, input: TestInput): Promise<ExecutionResult> {
    const agent = await this.getById(id);
    if (!agent) {
      throw new Error('Agent not found');
    }

    // Get the active persona
    const { data: persona } = await this.supabase
      .from('agent_personas')
      .select('*')
      .eq('agent_id', id)
      .eq('is_active', true)
      .single();

    const startTime = Date.now();

    // TODO: Integrate with actual AI execution engine
    // This is a placeholder response
    const mockResponse = {
      id: crypto.randomUUID(),
      output_text: `[Test Mode] Agent "${agent.name}" received input: "${input.input_text.substring(0, 50)}..."`,
      latency_ms: Date.now() - startTime + 100,
      tokens_used: {
        input: input.input_text.split(' ').length * 2,
        output: 50,
      },
      model_used: 'gpt-4',
      created_at: new Date().toISOString(),
    };

    // Log the execution
    await this.logExecution(id, input, mockResponse);

    return mockResponse;
  }

  /**
   * Get agent execution statistics
   */
  async getStats(agentId: string, days: number = 30): Promise<{
    total_executions: number;
    avg_latency_ms: number;
    success_rate: number;
    total_cost: number;
  }> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data, error } = await this.supabase
      .from('agent_executions')
      .select('latency_ms, estimated_cost, output_text')
      .eq('agent_id', agentId)
      .gte('created_at', since.toISOString());

    if (error) {
      throw new Error(`Failed to get agent stats: ${error.message}`);
    }

    const executions = data || [];
    const total = executions.length;
    const successful = executions.filter((e) => e.output_text).length;

    return {
      total_executions: total,
      avg_latency_ms: total > 0
        ? executions.reduce((sum, e) => sum + (e.latency_ms || 0), 0) / total
        : 0,
      success_rate: total > 0 ? (successful / total) * 100 : 0,
      total_cost: executions.reduce((sum, e) => sum + (e.estimated_cost || 0), 0),
    };
  }

  // Private helper methods

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private async duplicatePersonas(sourceAgentId: string, targetAgentId: string): Promise<void> {
    const { data: personas } = await this.supabase
      .from('agent_personas')
      .select('*')
      .eq('agent_id', sourceAgentId);

    if (!personas || personas.length === 0) return;

    const newPersonas = personas.map(({ id, agent_id, created_at, updated_at, ...rest }) => ({
      ...rest,
      agent_id: targetAgentId,
    }));

    await this.supabase.from('agent_personas').insert(newPersonas);
  }

  private async logExecution(
    agentId: string,
    input: TestInput,
    result: ExecutionResult
  ): Promise<void> {
    await this.supabase.from('agent_executions').insert({
      agent_id: agentId,
      persona_id: input.persona_id,
      input_text: input.input_text,
      input_tokens: result.tokens_used?.input,
      output_text: result.output_text,
      output_tokens: result.tokens_used?.output,
      latency_ms: result.latency_ms,
      model_used: result.model_used,
      estimated_cost: 0.001, // Placeholder cost
    });
  }
}
