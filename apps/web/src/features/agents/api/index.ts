import type {
  CompleteTaskPayload,
  CreateSessionPayload,
  DomainAgentsResponse,
  GeneratePlanPayload,
  OrchestratorPlanResponse,
  OrchestrationSessionsResponse,
  SessionBoard,
} from '@prisma-glow/api-client';
import { getApiClient } from '@/src/lib/api-client';

export const agentsApi = {
  listAgents: (): Promise<DomainAgentsResponse> => getApiClient().listDomainAgents(),
  generatePlan: (payload: GeneratePlanPayload): Promise<OrchestratorPlanResponse> =>
    getApiClient().generateOrchestratorPlan(payload),
  listSessions: (orgSlug: string, limit?: number): Promise<OrchestrationSessionsResponse> =>
    getApiClient().listOrchestrationSessions({ orgSlug, limit }),
  getSession: (sessionId: string): Promise<SessionBoard> => getApiClient().getOrchestrationSession(sessionId),
  createSession: (payload: CreateSessionPayload): Promise<SessionBoard> =>
    getApiClient().createOrchestrationSession(payload),
  completeTask: (taskId: string, payload: CompleteTaskPayload): Promise<SessionBoard> =>
    getApiClient().completeOrchestrationTask(taskId, payload),
};

export type { SessionBoard };
