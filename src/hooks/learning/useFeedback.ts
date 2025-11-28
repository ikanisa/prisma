import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

interface SubmitFeedbackParams {
  executionId: string;
  agentId: string;
  feedbackType: string;
  rating?: number | null;
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
      const response = await apiClient.post('/api/learning/feedback', {
        execution_id: params.executionId,
        agent_id: params.agentId,
        feedback_type: params.feedbackType,
        rating: params.rating,
        feedback_text: params.feedbackText,
        correction_text: params.correctionText,
        issue_categories: params.issueCategories,
        accuracy_rating: params.dimensions?.accuracy,
        helpfulness_rating: params.dimensions?.helpfulness,
        clarity_rating: params.dimensions?.clarity,
        completeness_rating: params.dimensions?.completeness,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-feedback'] });
      queryClient.invalidateQueries({ queryKey: ['learning-stats'] });
    },
  });
}

export function useAnnotationQueue(filters?: {
  domain?: string;
  agent?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: ['annotation-queue', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.domain && filters.domain !== 'all') {
        params.append('domain', filters.domain);
      }
      if (filters?.agent && filters.agent !== 'all') {
        params.append('agent', filters.agent);
      }
      if (filters?.status) {
        params.append('status', filters.status);
      }

      const response = await apiClient.get(`/api/learning/annotation-queue?${params}`);
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
      const response = await apiClient.post('/api/learning/annotations', {
        example_id: params.exampleId,
        technical_accuracy: params.annotation.technicalAccuracy,
        professional_quality: params.annotation.professionalQuality,
        completeness: params.annotation.completeness,
        clarity: params.annotation.clarity,
        corrected_output: params.annotation.correctedOutput,
        notes: params.annotation.notes,
        improvement_suggestions: params.annotation.improvementSuggestions,
        approved: params.annotation.approved,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['annotation-queue'] });
      queryClient.invalidateQueries({ queryKey: ['learning-stats'] });
    },
  });
}

export function useLearningStats() {
  return useQuery({
    queryKey: ['learning-stats'],
    queryFn: async () => {
      const response = await apiClient.get('/api/learning/stats');
      return response.data;
    },
  });
}

export function useTrainingDatasets(orgId?: string) {
  return useQuery({
    queryKey: ['training-datasets', orgId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (orgId) {
        params.append('org_id', orgId);
      }
      const response = await apiClient.get(`/api/learning/datasets?${params}`);
      return response.data;
    },
  });
}

export function useCreateTrainingRun() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      name: string;
      agentId: string;
      datasetId: string;
      trainingType: string;
      config: Record<string, any>;
    }) => {
      const response = await apiClient.post('/api/learning/training-runs', params);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-runs'] });
    },
  });
}

export function useTrainingRuns(agentId?: string) {
  return useQuery({
    queryKey: ['training-runs', agentId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (agentId) {
        params.append('agent_id', agentId);
      }
      const response = await apiClient.get(`/api/learning/training-runs?${params}`);
      return response.data;
    },
  });
}

export function useLearningExperiments(agentId?: string) {
  return useQuery({
    queryKey: ['learning-experiments', agentId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (agentId) {
        params.append('agent_id', agentId);
      }
      const response = await apiClient.get(`/api/learning/experiments?${params}`);
      return response.data;
    },
  });
}

export function useCreateExperiment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      name: string;
      description: string;
      hypothesis: string;
      agentId: string;
      controlConfig: Record<string, any>;
      treatmentConfig: Record<string, any>;
    }) => {
      const response = await apiClient.post('/api/learning/experiments', params);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning-experiments'] });
    },
  });
}
