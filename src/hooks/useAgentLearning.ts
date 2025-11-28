/**
 * React Hooks for Agent Learning System
 * 
 * Provides data fetching and mutations for:
 * - Performance metrics
 * - Learning examples
 * - User feedback
 * - Prompt optimization
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

// ============================================
// TYPES
// ============================================

export interface PerformanceMetrics {
  agent_id: string;
  period_days: number;
  total_executions: number;
  avg_rating: number;
  rating_distribution: Record<number, number>;
  avg_latency_ms: number;
  total_cost: number;
  most_used_tools: Array<{ name: string; count: number }>;
  common_failure_patterns: string[];
  improvement_suggestions: string[];
}

export interface LearningExample {
  id: string;
  agent_id: string;
  example_type: 'positive' | 'negative' | 'correction' | 'demonstration';
  input_text: string;
  expected_output: string;
  actual_output?: string;
  tags: string[];
  importance: number;
  is_approved: boolean;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
}

export interface FeedbackData {
  execution_id: string;
  rating: number;
  feedback_text?: string;
  is_correction?: boolean;
  corrected_output?: string;
}

export interface PromptOptimization {
  current_prompt: string;
  suggested_prompt: string;
  reasoning: string;
  expected_improvement: string;
  confidence_score: number;
}

// ============================================
// PERFORMANCE METRICS
// ============================================

export function useAgentPerformance(agentId: string, periodDays: number = 30) {
  return useQuery({
    queryKey: ['agent-performance', agentId, periodDays],
    queryFn: async () => {
      const response = await apiClient.get<PerformanceMetrics>(
        `/api/v1/agent/learning/performance/${agentId}?period_days=${periodDays}`
      );
      return response.data;
    },
    enabled: !!agentId,
  });
}

export function useAgentTrends(agentId: string, periodDays: number = 30) {
  return useQuery({
    queryKey: ['agent-trends', agentId, periodDays],
    queryFn: async () => {
      const response = await apiClient.get(
        `/api/v1/agent/learning/analytics/trends/${agentId}?period_days=${periodDays}`
      );
      return response.data;
    },
    enabled: !!agentId,
  });
}

// ============================================
// LEARNING EXAMPLES
// ============================================

export function useLearningExamples(
  agentId: string,
  options?: {
    exampleType?: string;
    approvedOnly?: boolean;
    limit?: number;
  }
) {
  return useQuery({
    queryKey: ['learning-examples', agentId, options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.exampleType) params.append('example_type', options.exampleType);
      if (options?.approvedOnly) params.append('approved_only', 'true');
      if (options?.limit) params.append('limit', options.limit.toString());

      const response = await apiClient.get<LearningExample[]>(
        `/api/v1/agent/learning/examples/${agentId}?${params.toString()}`
      );
      return response.data;
    },
    enabled: !!agentId,
  });
}

export function useCreateLearningExample() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      agent_id: string;
      example_type: string;
      input_text: string;
      expected_output: string;
      actual_output?: string;
      tags?: string[];
      importance?: number;
    }) => {
      const response = await apiClient.post<LearningExample>(
        '/api/v1/agent/learning/examples',
        data
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['learning-examples', variables.agent_id],
      });
    },
  });
}

export function useApproveLearningExample() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { exampleId: string; userId: string }) => {
      const response = await apiClient.patch(
        `/api/v1/agent/learning/examples/${data.exampleId}/approve`,
        { user_id: data.userId }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning-examples'] });
    },
  });
}

// ============================================
// FEEDBACK
// ============================================

export function useSubmitFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: FeedbackData) => {
      const response = await apiClient.post('/api/v1/agent/learning/feedback', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-performance'] });
      queryClient.invalidateQueries({ queryKey: ['agent-trends'] });
      queryClient.invalidateQueries({ queryKey: ['learning-examples'] });
    },
  });
}

// ============================================
// PROMPT OPTIMIZATION
// ============================================

export function useOptimizePrompt() {
  return useMutation({
    mutationFn: async (data: { agentId: string; personaId?: string }) => {
      const params = data.personaId ? `?persona_id=${data.personaId}` : '';
      const response = await apiClient.post<PromptOptimization>(
        `/api/v1/agent/learning/optimize-prompt/${data.agentId}${params}`
      );
      return response.data;
    },
  });
}

// ============================================
// EXECUTION HISTORY (with feedback)
// ============================================

export interface ExecutionWithFeedback {
  id: string;
  agent_id: string;
  input_text: string;
  output_text?: string;
  user_rating?: number;
  user_feedback?: string;
  latency_ms?: number;
  estimated_cost?: number;
  created_at: string;
}

export function useExecutionHistory(agentId: string, limit: number = 50) {
  return useQuery({
    queryKey: ['execution-history', agentId, limit],
    queryFn: async () => {
      const response = await apiClient.get<ExecutionWithFeedback[]>(
        `/api/v1/agent/executions/${agentId}?limit=${limit}`
      );
      return response.data;
    },
    enabled: !!agentId,
  });
}
