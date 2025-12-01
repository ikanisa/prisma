/**
 * Agent Analytics Logger
 * 
 * Tracks agent execution, RAG usage, and performance metrics.
 * Integrates with Supabase analytics schema.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface AgentExecutionContext {
  agentId: string;
  agentName: string;
  agentVersion: string;
  agentCategory: string;
  userQuery: string;
  organizationId?: string;
  userId?: string;
  sessionId?: string;
}

export interface AgentExecutionResult {
  status: 'success' | 'error' | 'timeout';
  durationMs: number;
  
  // RAG metrics
  ragEnabled?: boolean;
  ragChunksUsed?: number;
  ragAvgSimilarity?: number;
  ragTopSimilarity?: number;
  
  // LLM metrics
  llmModel?: string;
  llmTokensTotal?: number;
  llmCostUsd?: number;
  
  // Response metrics
  hasCitations?: boolean;
  citationCount?: number;
  confidenceScore?: number;
  
  errorMessage?: string;
}

export interface RAGUsageMetrics {
  executionLogId: number;
  agentId: string;
  userQuery: string;
  queryEmbedding?: number[];
  
  searchCategory?: string;
  searchJurisdiction?: string;
  searchTags?: string[];
  searchLimit?: number;
  
  chunksReturned: number;
  chunksUsed: number;
  avgSimilarity: number;
  topSimilarity: number;
  searchTimeMs: number;
  
  categoriesFound?: string[];
  jurisdictionsFound?: string[];
  sourcesUsed?: string[];
}

export interface AgentFeedback {
  executionLogId: number;
  rating: number; // 1-5
  feedbackType?: string;
  feedbackText?: string;
  wasHelpful?: boolean;
  wasAccurate?: boolean;
  citationsHelpful?: boolean;
  userId?: string;
}

/**
 * Agent Analytics Logger
 */
export class AgentAnalyticsLogger {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Start tracking an agent execution
   * Returns log ID to use for completion
   */
  async startExecution(context: AgentExecutionContext): Promise<number> {
    const { data, error } = await this.supabase.rpc('log_agent_execution', {
      p_agent_id: context.agentId,
      p_agent_name: context.agentName,
      p_agent_version: context.agentVersion,
      p_agent_category: context.agentCategory,
      p_user_query: context.userQuery,
      p_organization_id: context.organizationId || null,
      p_user_id: context.userId || null,
      p_session_id: context.sessionId || null,
    });

    if (error) {
      console.error('Failed to log agent execution start:', error);
      throw error;
    }

    return data as number;
  }

  /**
   * Complete an agent execution with results
   */
  async completeExecution(logId: number, result: AgentExecutionResult): Promise<void> {
    const { error } = await this.supabase.rpc('complete_agent_execution', {
      p_log_id: logId,
      p_status: result.status,
      p_duration_ms: result.durationMs,
      p_response_data: {
        rag_enabled: result.ragEnabled,
        rag_chunks_used: result.ragChunksUsed,
        rag_avg_similarity: result.ragAvgSimilarity,
        rag_top_similarity: result.ragTopSimilarity,
        llm_model: result.llmModel,
        llm_tokens_total: result.llmTokensTotal,
        llm_cost_usd: result.llmCostUsd,
        has_citations: result.hasCitations,
        citation_count: result.citationCount,
        confidence_score: result.confidenceScore,
        error_message: result.errorMessage,
      },
    });

    if (error) {
      console.error('Failed to complete agent execution:', error);
      throw error;
    }
  }

  /**
   * Log RAG usage details
   */
  async logRAGUsage(metrics: RAGUsageMetrics): Promise<void> {
    const { error } = await this.supabase.from('agent_rag_usage').insert({
      execution_log_id: metrics.executionLogId,
      agent_id: metrics.agentId,
      user_query: metrics.userQuery,
      query_embedding: metrics.queryEmbedding || null,
      search_category: metrics.searchCategory || null,
      search_jurisdiction: metrics.searchJurisdiction || null,
      search_tags: metrics.searchTags || null,
      search_limit: metrics.searchLimit || null,
      chunks_returned: metrics.chunksReturned,
      chunks_used: metrics.chunksUsed,
      avg_similarity: metrics.avgSimilarity,
      top_similarity: metrics.topSimilarity,
      search_time_ms: metrics.searchTimeMs,
      categories_found: metrics.categoriesFound || null,
      jurisdictions_found: metrics.jurisdictionsFound || null,
      sources_used: metrics.sourcesUsed || null,
    });

    if (error) {
      console.error('Failed to log RAG usage:', error);
      throw error;
    }
  }

  /**
   * Record user feedback
   */
  async recordFeedback(feedback: AgentFeedback): Promise<void> {
    const { error } = await this.supabase.from('agent_feedback').insert({
      execution_log_id: feedback.executionLogId,
      rating: feedback.rating,
      feedback_type: feedback.feedbackType || null,
      feedback_text: feedback.feedbackText || null,
      was_helpful: feedback.wasHelpful,
      was_accurate: feedback.wasAccurate,
      citations_helpful: feedback.citationsHelpful,
      user_id: feedback.userId || null,
    });

    if (error) {
      console.error('Failed to record feedback:', error);
      throw error;
    }
  }

  /**
   * Get agent performance metrics
   */
  async getPerformanceMetrics(agentId?: string): Promise<any[]> {
    let query = this.supabase
      .from('agent_performance_metrics')
      .select('*')
      .order('total_executions', { ascending: false });

    if (agentId) {
      query = query.eq('agent_id', agentId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to get performance metrics:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get real-time activity
   */
  async getRealtimeActivity(limit = 50): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('agent_activity_realtime')
      .select('*')
      .limit(limit);

    if (error) {
      console.error('Failed to get realtime activity:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get error analysis
   */
  async getErrorAnalysis(): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('agent_error_analysis')
      .select('*');

    if (error) {
      console.error('Failed to get error analysis:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get RAG coverage analysis
   */
  async getRAGCoverage(): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('rag_coverage_analysis')
      .select('*');

    if (error) {
      console.error('Failed to get RAG coverage:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get daily stats for date range
   */
  async getDailyStats(
    agentId: string,
    startDate: string,
    endDate: string
  ): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('agent_daily_stats')
      .select('*')
      .eq('agent_id', agentId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (error) {
      console.error('Failed to get daily stats:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Refresh performance metrics materialized view
   */
  async refreshMetrics(): Promise<void> {
    const { error } = await this.supabase.rpc('refresh_agent_performance_metrics');

    if (error) {
      console.error('Failed to refresh metrics:', error);
      throw error;
    }
  }
}

/**
 * Singleton instance
 */
let analyticsLoggerInstance: AgentAnalyticsLogger | null = null;

export function getAgentAnalyticsLogger(): AgentAnalyticsLogger {
  if (!analyticsLoggerInstance) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        'Missing environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY'
      );
    }

    analyticsLoggerInstance = new AgentAnalyticsLogger(supabaseUrl, supabaseKey);
  }

  return analyticsLoggerInstance;
}

/**
 * Helper decorator for automatic logging
 */
export function withAnalytics(
  agentId: string,
  agentName: string,
  agentVersion: string,
  agentCategory: string
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const logger = getAgentAnalyticsLogger();
      const startTime = Date.now();

      const userQuery = args[0]; // Assume first arg is the query
      const context = args[1] || {}; // Optional context

      // Start tracking
      const logId = await logger.startExecution({
        agentId,
        agentName,
        agentVersion,
        agentCategory,
        userQuery,
        organizationId: context.organizationId,
        userId: context.userId,
        sessionId: context.sessionId,
      });

      try {
        // Execute original method
        const result = await originalMethod.apply(this, args);

        // Complete tracking
        await logger.completeExecution(logId, {
          status: 'success',
          durationMs: Date.now() - startTime,
          ragEnabled: result.ragStats?.chunksUsed > 0,
          ragChunksUsed: result.ragStats?.chunksUsed,
          ragAvgSimilarity: result.ragStats?.avgSimilarity,
          ragTopSimilarity: result.ragStats?.topSimilarity,
          hasCitations: result.citations?.length > 0,
          citationCount: result.sources?.length || 0,
        });

        return result;
      } catch (error: any) {
        // Log error
        await logger.completeExecution(logId, {
          status: 'error',
          durationMs: Date.now() - startTime,
          errorMessage: error.message,
        });

        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Example usage:
 * 
 * class RwandaTaxAgent {
 *   @withAnalytics('tax-rw-035', 'Rwanda Tax Agent', '2.0.0', 'TAX')
 *   async answerQuery(query: string, context?: any): Promise<any> {
 *     // Agent logic...
 *   }
 * }
 * 
 * // Or manual logging:
 * const logger = getAgentAnalyticsLogger();
 * const logId = await logger.startExecution({...});
 * try {
 *   // ... agent logic
 *   await logger.completeExecution(logId, {...});
 * } catch (error) {
 *   await logger.completeExecution(logId, { status: 'error', ...});
 * }
 */
