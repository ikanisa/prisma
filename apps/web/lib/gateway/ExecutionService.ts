/**
 * ExecutionService - Business logic for Agent Execution operations
 * 
 * Orchestrates agent execution including streaming responses,
 * cost tracking, and logging.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Execution,
  ExecutionFilters,
  PaginatedResult,
  ExecutionFeedback,
} from '../schemas/execution.schema.js';

export class ExecutionService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Execute an agent with input
   */
  async execute(
    agentId: string,
    inputText: string,
    options?: {
      persona_id?: string;
      user_id?: string;
      session_id?: string;
      stream?: boolean;
    }
  ): Promise<Execution> {
    const startTime = Date.now();

    // Get agent and active persona
    const { data: agent } = await this.supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .single();

    if (!agent) {
      throw new Error('Agent not found');
    }

    let persona = null;
    if (options?.persona_id) {
      const { data } = await this.supabase
        .from('agent_personas')
        .select('*')
        .eq('id', options.persona_id)
        .single();
      persona = data;
    } else {
      const { data } = await this.supabase
        .from('agent_personas')
        .select('*')
        .eq('agent_id', agentId)
        .eq('is_active', true)
        .single();
      persona = data;
    }

    // TODO: Integrate with actual AI execution engine (OpenAI, etc.)
    // This is a placeholder implementation
    const outputText = `[Execution Mode] Agent "${agent.name}" processed input.`;
    const inputTokens = Math.ceil(inputText.length / 4);
    const outputTokens = Math.ceil(outputText.length / 4);

    const execution: Partial<Execution> = {
      id: crypto.randomUUID(),
      agent_id: agentId,
      persona_id: persona?.id,
      input_text: inputText,
      input_tokens: inputTokens,
      output_text: outputText,
      output_tokens: outputTokens,
      latency_ms: Date.now() - startTime + 100,
      model_used: 'gpt-4',
      tools_invoked: [],
      knowledge_retrieved: [],
      user_id: options?.user_id,
      session_id: options?.session_id,
      estimated_cost: this.calculateCost(inputTokens, outputTokens),
      created_at: new Date().toISOString(),
    };

    // Store execution log
    const { data: saved, error } = await this.supabase
      .from('agent_executions')
      .insert(execution)
      .select()
      .single();

    if (error) {
      console.error('Failed to log execution:', error);
    }

    return (saved || execution) as Execution;
  }

  /**
   * List executions with filters
   */
  async list(filters: ExecutionFilters): Promise<PaginatedResult<Execution>> {
    const {
      page = 1,
      page_size = 20,
      agent_id,
      user_id,
      session_id,
      since,
    } = filters;

    let query = this.supabase
      .from('agent_executions')
      .select('*', { count: 'exact' });

    if (agent_id) {
      query = query.eq('agent_id', agent_id);
    }

    if (user_id) {
      query = query.eq('user_id', user_id);
    }

    if (session_id) {
      query = query.eq('session_id', session_id);
    }

    if (since) {
      query = query.gte('created_at', since);
    }

    const from = (page - 1) * page_size;
    const to = from + page_size - 1;

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      throw new Error(`Failed to list executions: ${error.message}`);
    }

    return {
      items: (data || []) as Execution[],
      total: count || 0,
      page,
      page_size,
    };
  }

  /**
   * Get a single execution by ID
   */
  async getById(id: string): Promise<Execution | null> {
    const { data, error } = await this.supabase
      .from('agent_executions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to get execution: ${error.message}`);
    }

    return data as Execution;
  }

  /**
   * Submit user feedback for an execution
   */
  async submitFeedback(id: string, feedback: ExecutionFeedback): Promise<Execution> {
    const { data: execution, error } = await this.supabase
      .from('agent_executions')
      .update({
        user_rating: feedback.rating,
        user_feedback: feedback.feedback,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to submit feedback: ${error.message}`);
    }

    // If rating is high, consider creating a learning example
    if (feedback.rating && feedback.rating >= 4) {
      await this.createLearningExample(execution as Execution);
    }

    return execution as Execution;
  }

  /**
   * Get execution analytics for an agent
   */
  async getAnalytics(agentId: string, days: number = 30): Promise<{
    total_executions: number;
    avg_latency_ms: number;
    avg_rating: number;
    total_cost: number;
    tokens: { input: number; output: number };
    daily_counts: Array<{ date: string; count: number }>;
  }> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data, error } = await this.supabase
      .from('agent_executions')
      .select('latency_ms, user_rating, estimated_cost, input_tokens, output_tokens, created_at')
      .eq('agent_id', agentId)
      .gte('created_at', since.toISOString());

    if (error) {
      throw new Error(`Failed to get analytics: ${error.message}`);
    }

    const executions = data || [];
    const total = executions.length;

    // Calculate daily counts
    const dailyCounts: Record<string, number> = {};
    for (const exec of executions) {
      const date = new Date(exec.created_at).toISOString().split('T')[0];
      dailyCounts[date] = (dailyCounts[date] || 0) + 1;
    }

    const ratingsWithValue = executions.filter((e) => e.user_rating !== null);

    return {
      total_executions: total,
      avg_latency_ms: total > 0
        ? executions.reduce((sum, e) => sum + (e.latency_ms || 0), 0) / total
        : 0,
      avg_rating: ratingsWithValue.length > 0
        ? ratingsWithValue.reduce((sum, e) => sum + e.user_rating!, 0) / ratingsWithValue.length
        : 0,
      total_cost: executions.reduce((sum, e) => sum + (e.estimated_cost || 0), 0),
      tokens: {
        input: executions.reduce((sum, e) => sum + (e.input_tokens || 0), 0),
        output: executions.reduce((sum, e) => sum + (e.output_tokens || 0), 0),
      },
      daily_counts: Object.entries(dailyCounts)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    };
  }

  // Private helper methods

  private calculateCost(inputTokens: number, outputTokens: number): number {
    // GPT-4 pricing as of 2024 (approximate)
    const inputCostPer1K = 0.03;
    const outputCostPer1K = 0.06;
    return (inputTokens / 1000) * inputCostPer1K + (outputTokens / 1000) * outputCostPer1K;
  }

  private async createLearningExample(execution: Execution): Promise<void> {
    // Auto-create learning example from highly-rated execution
    await this.supabase.from('agent_learning_examples').insert({
      agent_id: execution.agent_id,
      example_type: 'positive',
      input_text: execution.input_text,
      expected_output: execution.output_text,
      actual_output: execution.output_text,
      importance: execution.user_rating || 3,
      is_approved: false, // Needs review
    });
  }
}
