/**
 * React hooks for the learning system
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface FeedbackSubmission {
  executionId: string;
  agentId: string;
  feedbackType: 'thumbs_up' | 'thumbs_down' | 'star_rating' | 'detailed_feedback' | 'correction' | 'report_issue';
  rating?: number;
  feedbackText?: string;
  correctionText?: string;
  issueCategories?: string[];
  dimensions?: {
    accuracy?: number;
    helpfulness?: number;
    clarity?: number;
    completeness?: number;
  };
}

export interface AnnotationSubmission {
  exampleId: string;
  annotation: {
    approved: boolean;
    technicalAccuracy: number;
    professionalQuality: number;
    completeness: number;
    clarity: number;
    correctedOutput?: string;
    notes?: string;
    improvementSuggestions?: string;
  };
}

export function useSubmitFeedback() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (feedback: FeedbackSubmission) => {
      const response = await apiClient.post('/api/learning/feedback', {
        execution_id: feedback.executionId,
        agent_id: feedback.agentId,
        feedback_type: feedback.feedbackType,
        rating: feedback.rating,
        feedback_text: feedback.feedbackText,
        correction_text: feedback.correctionText,
        issue_categories: feedback.issueCategories,
        dimensions: feedback.dimensions,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning', 'stats'] });
    },
  });
}

export function useFeedbackStats(agentId: string) {
  return useQuery({
    queryKey: ['learning', 'feedback', 'stats', agentId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/learning/feedback/stats/${agentId}`);
      return response.data;
    },
    enabled: !!agentId,
  });
}

export function useCommonIssues(agentId: string, limit = 10) {
  return useQuery({
    queryKey: ['learning', 'feedback', 'issues', agentId, limit],
    queryFn: async () => {
      const response = await apiClient.get(`/api/learning/feedback/issues/${agentId}`, {
        params: { limit },
      });
      return response.data.issues;
    },
    enabled: !!agentId,
  });
}

export function useAnnotationQueue(filters?: { domain?: string; agent?: string }) {
  return useQuery({
    queryKey: ['learning', 'annotations', 'queue', filters],
    queryFn: async () => {
      const response = await apiClient.get('/api/learning/annotations/queue', {
        params: filters,
      });
      return response.data.queue;
    },
  });
}

export function useSubmitAnnotation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ exampleId, annotation }: AnnotationSubmission) => {
      const response = await apiClient.post('/api/learning/annotations', {
        example_id: exampleId,
        ...annotation,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning', 'annotations'] });
      queryClient.invalidateQueries({ queryKey: ['learning', 'stats'] });
    },
  });
}

export function useLearningStats() {
  return useQuery({
    queryKey: ['learning', 'stats'],
    queryFn: async () => {
      const response = await apiClient.get('/api/learning/stats');
      return response.data;
    },
  });
}

export function useOptimizePrompt() {
  return useMutation({
    mutationFn: async (params: {
      agentId: string;
      currentPrompt: string;
      optimizationGoals?: string[];
    }) => {
      const response = await apiClient.post('/api/learning/optimize-prompt', {
        agent_id: params.agentId,
        current_prompt: params.currentPrompt,
        optimization_goals: params.optimizationGoals || ['accuracy', 'clarity', 'completeness'],
      });
      return response.data;
    },
  });
}

export function useTrainingDatasets(agentId: string) {
  return useQuery({
    queryKey: ['learning', 'datasets', agentId],
    queryFn: async () => {
      const response = await apiClient.get(`/api/learning/datasets/${agentId}`);
      return response.data.datasets;
    },
    enabled: !!agentId,
  });
}

export function useSubmitDemonstration() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (demonstration: {
      agentId: string;
      taskDescription: string;
      inputState: Record<string, unknown>;
      actions: Array<Record<string, unknown>>;
      finalOutput: string;
      reasoning: string;
    }) => {
      const response = await apiClient.post('/api/learning/demonstrations', {
        agent_id: demonstration.agentId,
        task_description: demonstration.taskDescription,
        input_state: demonstration.inputState,
        actions: demonstration.actions,
        final_output: demonstration.finalOutput,
        reasoning: demonstration.reasoning,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning'] });
    },
  });
}
