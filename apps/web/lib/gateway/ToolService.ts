/**
 * ToolService - Business logic for Agent Tool operations
 * 
 * Manages the tool registry, tool assignments to agents,
 * and tool execution.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Tool,
  CreateToolInput,
  UpdateToolInput,
  ToolFilters,
  PaginatedResult,
  ToolTestResult,
} from '../schemas/tool.schema.js';

export class ToolService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Create a new tool in the registry
   */
  async create(data: CreateToolInput): Promise<Tool> {
    const slug = this.generateSlug(data.name);

    const { data: tool, error } = await this.supabase
      .from('agent_tools')
      .insert({
        ...data,
        slug,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create tool: ${error.message}`);
    }

    return tool as Tool;
  }

  /**
   * List tools with filters and pagination
   */
  async list(filters: ToolFilters): Promise<PaginatedResult<Tool>> {
    const {
      page = 1,
      page_size = 20,
      category,
      search,
      organization_id,
    } = filters;

    let query = this.supabase
      .from('agent_tools')
      .select('*', { count: 'exact' });

    if (organization_id) {
      query = query.or(`organization_id.eq.${organization_id},organization_id.is.null`);
    }

    if (category) {
      query = query.eq('category', category);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    const from = (page - 1) * page_size;
    const to = from + page_size - 1;

    const { data, error, count } = await query
      .eq('status', 'active')
      .order('name', { ascending: true })
      .range(from, to);

    if (error) {
      throw new Error(`Failed to list tools: ${error.message}`);
    }

    return {
      items: (data || []) as Tool[],
      total: count || 0,
      page,
      page_size,
    };
  }

  /**
   * Get a single tool by ID
   */
  async getById(id: string): Promise<Tool | null> {
    const { data, error } = await this.supabase
      .from('agent_tools')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to get tool: ${error.message}`);
    }

    return data as Tool;
  }

  /**
   * Update an existing tool
   */
  async update(id: string, data: UpdateToolInput): Promise<Tool> {
    const { data: tool, error } = await this.supabase
      .from('agent_tools')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update tool: ${error.message}`);
    }

    return tool as Tool;
  }

  /**
   * Delete a tool (soft delete)
   */
  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('agent_tools')
      .update({
        status: 'deprecated',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete tool: ${error.message}`);
    }
  }

  /**
   * Test tool execution with sample parameters
   */
  async test(id: string, params: Record<string, unknown>): Promise<ToolTestResult> {
    const tool = await this.getById(id);
    if (!tool) {
      throw new Error('Tool not found');
    }

    const startTime = Date.now();

    // Validate input against schema
    const validationResult = this.validateParams(params, tool.input_schema);
    if (!validationResult.valid) {
      return {
        success: false,
        error: `Validation failed: ${validationResult.errors?.join(', ')}`,
        latency_ms: Date.now() - startTime,
      };
    }

    // TODO: Actually execute the tool based on implementation_type
    // This is a placeholder
    const mockOutput = {
      result: `Tool "${tool.name}" executed successfully`,
      params: params,
    };

    return {
      success: true,
      output: mockOutput,
      latency_ms: Date.now() - startTime + 100,
    };
  }

  /**
   * Assign a tool to an agent
   */
  async assignToAgent(agentId: string, toolId: string, config?: Record<string, unknown>): Promise<void> {
    const { error } = await this.supabase
      .from('agent_tool_assignments')
      .upsert({
        agent_id: agentId,
        tool_id: toolId,
        is_enabled: true,
        custom_config: config || {},
      }, {
        onConflict: 'agent_id,tool_id',
      });

    if (error) {
      throw new Error(`Failed to assign tool: ${error.message}`);
    }
  }

  /**
   * Remove tool assignment from an agent
   */
  async removeFromAgent(agentId: string, toolId: string): Promise<void> {
    const { error } = await this.supabase
      .from('agent_tool_assignments')
      .delete()
      .eq('agent_id', agentId)
      .eq('tool_id', toolId);

    if (error) {
      throw new Error(`Failed to remove tool assignment: ${error.message}`);
    }
  }

  /**
   * Update tool assignment configuration
   */
  async updateAssignment(agentId: string, toolId: string, config: Record<string, unknown>): Promise<void> {
    const { error } = await this.supabase
      .from('agent_tool_assignments')
      .update({
        custom_config: config,
      })
      .eq('agent_id', agentId)
      .eq('tool_id', toolId);

    if (error) {
      throw new Error(`Failed to update tool assignment: ${error.message}`);
    }
  }

  /**
   * Get all tools assigned to an agent
   */
  async getAgentTools(agentId: string): Promise<Array<Tool & { assignment: { is_enabled: boolean; custom_config: Record<string, unknown> } }>> {
    const { data, error } = await this.supabase
      .from('agent_tool_assignments')
      .select(`
        is_enabled,
        custom_config,
        priority,
        agent_tools (*)
      `)
      .eq('agent_id', agentId)
      .order('priority', { ascending: true });

    if (error) {
      throw new Error(`Failed to get agent tools: ${error.message}`);
    }

    return (data || []).map((row: any) => ({
      ...row.agent_tools,
      assignment: {
        is_enabled: row.is_enabled,
        custom_config: row.custom_config,
      },
    }));
  }

  // Private helper methods

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private validateParams(
    params: Record<string, unknown>,
    schema: Record<string, unknown>
  ): { valid: boolean; errors?: string[] } {
    // Basic validation - in production use a proper JSON schema validator
    const errors: string[] = [];
    const properties = (schema as any).properties || {};
    const required = (schema as any).required || [];

    for (const field of required) {
      if (!(field in params)) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}
