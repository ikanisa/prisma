import {
  type CreateSessionPayload,
  OrchestrationTaskStatus,
  type OrchestrationPlan,
} from '@prisma-glow/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { agentsApi } from '../api';
import { convertPlanTaskToPayload } from '../utils';
import { useOrchestratorStore } from './store';

const orchestratorKeys = {
  root: ['agents-orchestrator'] as const,
  agents: ['agents-orchestrator', 'agents'] as const,
  sessions: (orgSlug: string) => ['agents-orchestrator', 'sessions', orgSlug] as const,
  session: (sessionId: string) => ['agents-orchestrator', 'session', sessionId] as const,
};

export function useDomainAgentsQuery() {
  return useQuery({
    queryKey: orchestratorKeys.agents,
    queryFn: () => agentsApi.listAgents(),
  });
}

export function useSessionsQuery(orgSlug: string) {
  const trimmed = orgSlug.trim();
  return useQuery({
    queryKey: orchestratorKeys.sessions(trimmed || 'unknown'),
    queryFn: () => agentsApi.listSessions(trimmed, 20),
    enabled: Boolean(trimmed),
  });
}

export function useSessionBoardQuery(sessionId: string | null) {
  const store = useOrchestratorStore();
  return useQuery({
    queryKey: sessionId ? orchestratorKeys.session(sessionId) : ['agents-orchestrator', 'session', 'empty'],
    queryFn: () => agentsApi.getSession(sessionId!),
    enabled: Boolean(sessionId),
    onSuccess: (board) => {
      if (!board) return;
      const updates: Record<string, OrchestrationTaskStatus> = {};
      for (const task of board.tasks ?? []) {
        updates[task.id] = task.status;
      }
      store.setTaskUpdates(updates);
    },
  });
}

export function useGeneratePlanMutation() {
  const setPlanPreview = useOrchestratorStore((state) => state.setPlanPreview);
  return useMutation({
    mutationFn: agentsApi.generatePlan,
    onSuccess: (response) => {
      setPlanPreview(response.plan);
    },
  });
}

export function useCreateSessionMutation() {
  const queryClient = useQueryClient();
  const { setSelectedSessionId, setTaskUpdates } = useOrchestratorStore.getState();

  return useMutation({
    mutationFn: agentsApi.createSession,
    onSuccess: (board, variables) => {
      const sessionId = board.session?.id ?? null;
      setSelectedSessionId(sessionId);
      const updates: Record<string, OrchestrationTaskStatus> = {};
      for (const task of board.tasks ?? []) {
        updates[task.id] = task.status;
      }
      setTaskUpdates(updates);
      if (sessionId) {
        queryClient.setQueryData(orchestratorKeys.session(sessionId), board);
      }
      void queryClient.invalidateQueries({ queryKey: orchestratorKeys.sessions(variables.orgSlug.trim()) });
    },
  });
}

export function useCompleteTaskMutation(sessionId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taskId,
      status,
    }: {
      taskId: string;
      status: OrchestrationTaskStatus;
    }) => agentsApi.completeTask(taskId, { status }),
    onMutate: ({ taskId }) => {
      useOrchestratorStore.getState().setTaskUpdateInFlight(taskId);
    },
    onSuccess: (board) => {
      if (sessionId) {
        queryClient.setQueryData(orchestratorKeys.session(sessionId), board);
        void queryClient.invalidateQueries({ queryKey: orchestratorKeys.session(sessionId) });
      }
      const state = useOrchestratorStore.getState();
      const updates: Record<string, OrchestrationTaskStatus> = {};
      for (const task of board.tasks ?? []) {
        updates[task.id] = task.status;
      }
      state.setTaskUpdates(updates);
      state.setTaskUpdateInFlight(null);
    },
    onError: () => {
      useOrchestratorStore.getState().setTaskUpdateInFlight(null);
    },
  });
}

export function buildCreateSessionPayload(orgSlug: string, options: {
  objective: string;
  engagementId: string;
  directorAgentKey: string;
  safetyAgentKey: string;
  metadataJson: string;
  includePlanTasks: boolean;
  planPreview: OrchestrationPlan | null;
}): CreateSessionPayload {
  const payload: Record<string, unknown> = {
    orgSlug: orgSlug.trim(),
    objective: options.objective.trim(),
  };
  if (options.engagementId.trim()) {
    payload.engagementId = options.engagementId.trim();
  }
  if (options.directorAgentKey.trim()) {
    payload.directorAgentKey = options.directorAgentKey.trim();
  }
  if (options.safetyAgentKey.trim()) {
    payload.safetyAgentKey = options.safetyAgentKey.trim();
  }
  if (options.metadataJson.trim()) {
    try {
      const parsed = JSON.parse(options.metadataJson) as Record<string, unknown>;
      if (Object.keys(parsed).length) {
        payload.metadata = parsed;
      }
    } catch {
      throw new Error('Session metadata JSON is invalid');
    }
  }
  if (options.includePlanTasks && options.planPreview) {
    payload.tasks = options.planPreview.tasks.map(convertPlanTaskToPayload);
  }
  return payload as CreateSessionPayload;
}

export function constraintsFromInput(input: string): string[] {
  return input
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}
