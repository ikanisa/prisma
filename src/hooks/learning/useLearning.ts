import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

interface SubmitFeedbackParams {
  executionId: string;
  agentId: string;
  feedbackType: string;
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

export function useSubmitFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SubmitFeedbackParams) => {
      const response = await apiClient.post('/api/learning/feedback', params);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning', 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['agent', 'feedback'] });
    },
  });
}

export function useAnnotationQueue(filters: {
  domain?: string;
  agent?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: ['learning', 'annotation-queue', filters],
    queryFn: async () => {
      const response = await apiClient.get('/api/learning/annotation/queue', {
        params: filters,
      });
      return response.data;
    },
  });
}

export function useSubmitAnnotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      exampleId: string;
      annotation: {
        technicalAccuracy: number;
        professionalQuality: number;
        completeness: number;
        clarity: number;
        correctedOutput: string;
        notes: string;
        improvementSuggestions: string;
        approved: boolean;
      };
    }) => {
      const response = await apiClient.post('/api/learning/annotation', params);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning', 'annotation-queue'] });
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

export function useTrainingRuns(agentId?: string) {
  return useQuery({
    queryKey: ['learning', 'training-runs', agentId],
    queryFn: async () => {
      const response = await apiClient.get('/api/learning/training-runs', {
        params: { agentId },
      });
      return response.data;
    },
  });
}

export function useStartTraining() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      agentId: string;
      datasetId: string;
      trainingType: string;
      config: Record<string, unknown>;
    }) => {
      const response = await apiClient.post('/api/learning/training/start', params);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning', 'training-runs'] });
    },
  });
}

export function useLearningExperiments(agentId?: string) {
  return useQuery({
    queryKey: ['learning', 'experiments', agentId],
    queryFn: async () => {
      const response = await apiClient.get('/api/learning/experiments', {
        params: { agentId },
      });
      return response.data;
    },
  });
}

export function useCreateExperiment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      agentId: string;
      name: string;
      description: string;
      hypothesis: string;
      controlConfig: Record<string, unknown>;
      treatmentConfig: Record<string, unknown>;
    }) => {
      const response = await apiClient.post('/api/learning/experiments', params);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning', 'experiments'] });
    },
  });
}
