/**
 * Agent Feedback Loop Engine
 * 
 * Self-learning system that improves agents over time by:
 * - Detecting knowledge gaps
 * - Suggesting new sources
 * - Improving classifications
 * - Optimizing RAG parameters
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface LearningEvent {
  executionLogId: number;
  eventType: 'low_similarity' | 'user_correction' | 'high_rating' | 'knowledge_gap';
  triggerCondition: string;
  suggestedAction: string;
  actionParams: Record<string, any>;
  confidenceScore: number;
}

export interface KnowledgeGap {
  queryPattern: string;
  category: string;
  jurisdiction: string;
  queryCount: number;
  avgSimilarity: number;
}

export interface ClassificationSuggestion {
  query: string;
  currentCategory: string;
  suggestedCategory: string;
  confidence: number;
  reason: string;
}

export interface RAGOptimization {
  agentId: string;
  currentChunkLimit: number;
  optimizedChunkLimit: number;
  currentSimilarityThreshold: number;
  optimizedSimilarityThreshold: number;
  expectedImprovement: number;
}

/**
 * Feedback Loop Engine
 */
export class FeedbackLoopEngine {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Analyze recent agent executions and create learning events
   */
  async analyzeAndLearn(): Promise<{
    learningEventsCreated: number;
    knowledgeGapsDetected: number;
    classificationsImproved: number;
    ragOptimizations: number;
  }> {
    const stats = {
      learningEventsCreated: 0,
      knowledgeGapsDetected: 0,
      classificationsImproved: 0,
      ragOptimizations: 0,
    };

    // 1. Detect knowledge gaps
    const gaps = await this.detectKnowledgeGaps();
    stats.knowledgeGapsDetected = gaps.length;

    for (const gap of gaps) {
      const eventId = await this.createLearningEvent({
        executionLogId: 0, // Not tied to specific execution
        eventType: 'knowledge_gap',
        triggerCondition: `Low similarity (${gap.avgSimilarity.toFixed(2)}) for ${gap.queryCount} queries`,
        suggestedAction: 'add_knowledge_source',
        actionParams: {
          category: gap.category,
          jurisdiction: gap.jurisdiction,
          queryPattern: gap.queryPattern,
          reason: `Knowledge gap detected for ${gap.category}/${gap.jurisdiction}`,
        },
        confidenceScore: 0.8,
      });

      stats.learningEventsCreated++;
    }

    // 2. Suggest classification improvements
    const suggestions = await this.suggestClassifications();
    stats.classificationsImproved = suggestions.length;

    for (const suggestion of suggestions) {
      await this.createLearningEvent({
        executionLogId: 0,
        eventType: 'user_correction',
        triggerCondition: suggestion.reason,
        suggestedAction: 'reclassify_query',
        actionParams: {
          query: suggestion.query,
          currentCategory: suggestion.currentCategory,
          suggestedCategory: suggestion.suggestedCategory,
          confidence: suggestion.confidence,
          reason: suggestion.reason,
        },
        confidenceScore: suggestion.confidence,
      });

      stats.learningEventsCreated++;
    }

    // 3. Optimize RAG parameters
    const optimizations = await this.optimizeRAGParameters();
    stats.ragOptimizations = optimizations.length;

    for (const opt of optimizations) {
      await this.recordRAGOptimization(opt);
    }

    return stats;
  }

  /**
   * Detect knowledge gaps (low similarity queries)
   */
  async detectKnowledgeGaps(): Promise<KnowledgeGap[]> {
    const { data, error } = await this.supabase.rpc('detect_knowledge_gaps');

    if (error) {
      console.error('Failed to detect knowledge gaps:', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      queryPattern: row.query_pattern,
      category: row.category,
      jurisdiction: row.jurisdiction,
      queryCount: parseInt(row.query_count),
      avgSimilarity: parseFloat(row.avg_similarity),
    }));
  }

  /**
   * Suggest classification improvements
   */
  async suggestClassifications(): Promise<ClassificationSuggestion[]> {
    const { data, error } = await this.supabase.rpc('suggest_classification_improvements');

    if (error) {
      console.error('Failed to suggest classifications:', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      query: row.query,
      currentCategory: row.current_category,
      suggestedCategory: row.suggested_category,
      confidence: parseFloat(row.confidence),
      reason: row.reason,
    }));
  }

  /**
   * Optimize RAG parameters for each agent
   */
  async optimizeRAGParameters(): Promise<RAGOptimization[]> {
    // Get list of active agents
    const { data: agents } = await this.supabase
      .from('agent_performance_metrics')
      .select('agent_id')
      .gte('total_executions', 10); // Only optimize agents with enough data

    if (!agents || agents.length === 0) return [];

    const optimizations: RAGOptimization[] = [];

    for (const agent of agents) {
      const { data, error } = await this.supabase.rpc('optimize_rag_parameters', {
        p_agent_id: agent.agent_id,
      });

      if (error) {
        console.error(`Failed to optimize RAG for ${agent.agent_id}:`, error);
        continue;
      }

      if (data && data.length > 0) {
        const opt = data[0];
        optimizations.push({
          agentId: agent.agent_id,
          currentChunkLimit: opt.current_limit,
          optimizedChunkLimit: opt.optimized_limit,
          currentSimilarityThreshold: parseFloat(opt.current_threshold),
          optimizedSimilarityThreshold: parseFloat(opt.optimized_threshold),
          expectedImprovement: parseFloat(opt.expected_improvement_pct),
        });
      }
    }

    return optimizations;
  }

  /**
   * Create a learning event
   */
  async createLearningEvent(event: LearningEvent): Promise<number | null> {
    const { data, error } = await this.supabase.rpc('create_learning_event', {
      p_execution_log_id: event.executionLogId || null,
      p_event_type: event.eventType,
      p_trigger_condition: event.triggerCondition,
      p_suggested_action: event.suggestedAction,
      p_action_params: event.actionParams,
    });

    if (error) {
      console.error('Failed to create learning event:', error);
      return null;
    }

    return data as number;
  }

  /**
   * Apply a learning event (execute suggested action)
   */
  async applyLearningEvent(eventId: number, appliedBy?: string): Promise<boolean> {
    const { data, error } = await this.supabase.rpc('apply_learning_event', {
      p_event_id: eventId,
      p_applied_by: appliedBy || null,
    });

    if (error) {
      console.error('Failed to apply learning event:', error);
      return false;
    }

    return data as boolean;
  }

  /**
   * Record RAG optimization for A/B testing
   */
  async recordRAGOptimization(optimization: RAGOptimization): Promise<void> {
    const { error } = await this.supabase.from('rag_search_optimizations').insert({
      agent_id: optimization.agentId,
      current_chunk_limit: optimization.currentChunkLimit,
      current_similarity_threshold: optimization.currentSimilarityThreshold,
      optimized_chunk_limit: optimization.optimizedChunkLimit,
      optimized_similarity_threshold: optimization.optimizedSimilarityThreshold,
      expected_improvement_pct: optimization.expectedImprovement,
      status: 'testing',
      ab_test_started_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Failed to record RAG optimization:', error);
    }
  }

  /**
   * Get pending learning events for review
   */
  async getPendingLearningEvents(limit = 50): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('agent_learning_events')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to get pending learning events:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Get knowledge source suggestions for review
   */
  async getKnowledgeSourceSuggestions(status = 'pending'): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('knowledge_source_suggestions')
      .select('*')
      .eq('status', status)
      .order('confidence_score', { ascending: false });

    if (error) {
      console.error('Failed to get source suggestions:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Approve knowledge source suggestion
   */
  async approveKnowledgeSource(suggestionId: number, reviewedBy?: string): Promise<void> {
    // Get suggestion details
    const { data: suggestion } = await this.supabase
      .from('knowledge_source_suggestions')
      .select('*')
      .eq('id', suggestionId)
      .single();

    if (!suggestion) return;

    // Add to knowledge_web_sources
    const { data: newSource } = await this.supabase
      .from('knowledge_web_sources')
      .insert({
        name: `Auto-added: ${suggestion.suggested_url}`,
        url: suggestion.suggested_url,
        category: suggestion.suggested_category,
        jurisdiction_code: suggestion.suggested_jurisdiction,
        tags: suggestion.suggested_tags,
        status: 'ACTIVE',
      })
      .select()
      .single();

    if (newSource) {
      // Update suggestion status
      await this.supabase
        .from('knowledge_source_suggestions')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: reviewedBy || null,
          knowledge_source_id: newSource.id,
        })
        .eq('id', suggestionId);
    }
  }

  /**
   * Get classification improvements
   */
  async getClassificationImprovements(status = 'pending'): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('classification_improvements')
      .select('*')
      .eq('status', status)
      .order('confidence_score', { ascending: false });

    if (error) {
      console.error('Failed to get classification improvements:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Apply classification improvement
   */
  async applyClassificationImprovement(improvementId: number): Promise<void> {
    await this.supabase
      .from('classification_improvements')
      .update({
        status: 'applied',
        applied_at: new Date().toISOString(),
      })
      .eq('id', improvementId);
  }

  /**
   * Get daily feedback loop metrics
   */
  async getFeedbackLoopMetrics(days = 7): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('feedback_loop_metrics')
      .select('*')
      .gte('date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('date', { ascending: false });

    if (error) {
      console.error('Failed to get feedback loop metrics:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Monitor low similarity queries and suggest actions
   */
  async monitorLowSimilarityQueries(): Promise<void> {
    const { data: lowSimQueries } = await this.supabase
      .from('agent_rag_usage')
      .select(`
        *,
        execution:agent_execution_logs(*)
      `)
      .lt('top_similarity', 0.5)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (!lowSimQueries || lowSimQueries.length === 0) return;

    // Group by category/jurisdiction
    const grouped = new Map<string, any[]>();
    for (const query of lowSimQueries) {
      const key = `${query.search_category}:${query.search_jurisdiction}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(query);
    }

    // Create learning events for frequent patterns
    for (const [key, queries] of grouped.entries()) {
      if (queries.length >= 3) {
        const [category, jurisdiction] = key.split(':');
        await this.createLearningEvent({
          executionLogId: queries[0].execution_log_id,
          eventType: 'knowledge_gap',
          triggerCondition: `${queries.length} low similarity queries in ${category}/${jurisdiction}`,
          suggestedAction: 'add_knowledge_source',
          actionParams: {
            category,
            jurisdiction,
            sampleQueries: queries.map((q) => q.user_query).slice(0, 5),
            avgSimilarity: queries.reduce((sum, q) => sum + q.top_similarity, 0) / queries.length,
          },
          confidenceScore: 0.85,
        });
      }
    }
  }
}

/**
 * Singleton instance
 */
let feedbackLoopInstance: FeedbackLoopEngine | null = null;

export function getFeedbackLoopEngine(): FeedbackLoopEngine {
  if (!feedbackLoopInstance) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
    }

    feedbackLoopInstance = new FeedbackLoopEngine(supabaseUrl, supabaseKey);
  }

  return feedbackLoopInstance;
}

/**
 * Run feedback loop analysis (call this on a schedule)
 */
export async function runFeedbackLoopAnalysis(): Promise<void> {
  const engine = getFeedbackLoopEngine();

  console.log('Starting feedback loop analysis...');

  // Analyze and learn
  const stats = await engine.analyzeAndLearn();
  console.log('Analysis complete:', stats);

  // Monitor low similarity queries
  await engine.monitorLowSimilarityQueries();
  console.log('Low similarity monitoring complete');

  // Auto-apply high-confidence improvements
  const pendingEvents = await engine.getPendingLearningEvents(100);
  let autoApplied = 0;

  for (const event of pendingEvents) {
    // Auto-apply if confidence >= 0.9
    if (event.confidence_score >= 0.9) {
      const success = await engine.applyLearningEvent(event.id);
      if (success) autoApplied++;
    }
  }

  console.log(`Auto-applied ${autoApplied} high-confidence learning events`);
}

/**
 * Example usage:
 * 
 * // In a cron job or scheduled task
 * import { runFeedbackLoopAnalysis } from '@prisma-glow/lib';
 * 
 * // Run every hour
 * setInterval(async () => {
 *   await runFeedbackLoopAnalysis();
 * }, 60 * 60 * 1000);
 * 
 * // Or call manually
 * const engine = getFeedbackLoopEngine();
 * const gaps = await engine.detectKnowledgeGaps();
 * console.log('Knowledge gaps detected:', gaps);
 */
