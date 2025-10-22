import { create } from 'zustand';
import type { OrchestrationPlan, OrchestrationTaskStatus } from '@prisma-glow/api-client';

export type OrchestratorPriority = 'LOW' | 'MEDIUM' | 'HIGH';

interface OrchestratorState {
  orgSlug: string;
  objective: string;
  engagementId: string;
  priority: OrchestratorPriority;
  constraintsInput: string;
  metadataJson: string;
  directorAgentKey: string;
  safetyAgentKey: string;
  includePlanTasks: boolean;
  planPreview: OrchestrationPlan | null;
  selectedSessionId: string | null;
  taskUpdates: Record<string, OrchestrationTaskStatus>;
  taskUpdateInFlight: string | null;
  setOrgSlug(value: string): void;
  setObjective(value: string): void;
  setEngagementId(value: string): void;
  setPriority(value: OrchestratorPriority): void;
  setConstraintsInput(value: string): void;
  setMetadataJson(value: string): void;
  setDirectorAgentKey(value: string): void;
  setSafetyAgentKey(value: string): void;
  setIncludePlanTasks(value: boolean): void;
  setPlanPreview(plan: OrchestrationPlan | null): void;
  setSelectedSessionId(id: string | null): void;
  setTaskUpdates(updates: Record<string, OrchestrationTaskStatus>): void;
  setTaskUpdate(taskId: string, status: OrchestrationTaskStatus): void;
  setTaskUpdateInFlight(taskId: string | null): void;
  resetTaskUpdates(): void;
}

export const useOrchestratorStore = create<OrchestratorState>((set) => ({
  orgSlug: 'demo',
  objective: 'Coordinate FY24 audit automation',
  engagementId: '',
  priority: 'MEDIUM',
  constraintsInput: '',
  metadataJson: '{}',
  directorAgentKey: '',
  safetyAgentKey: '',
  includePlanTasks: true,
  planPreview: null,
  selectedSessionId: null,
  taskUpdates: {},
  taskUpdateInFlight: null,
  setOrgSlug: (value) => set({ orgSlug: value }),
  setObjective: (value) => set({ objective: value }),
  setEngagementId: (value) => set({ engagementId: value }),
  setPriority: (value) => set({ priority: value }),
  setConstraintsInput: (value) => set({ constraintsInput: value }),
  setMetadataJson: (value) => set({ metadataJson: value }),
  setDirectorAgentKey: (value) => set({ directorAgentKey: value }),
  setSafetyAgentKey: (value) => set({ safetyAgentKey: value }),
  setIncludePlanTasks: (value) => set({ includePlanTasks: value }),
  setPlanPreview: (plan) => set({ planPreview: plan }),
  setSelectedSessionId: (id) => set({ selectedSessionId: id }),
  setTaskUpdates: (updates) => set({ taskUpdates: updates }),
  setTaskUpdate: (taskId, status) =>
    set((state) => ({ taskUpdates: { ...state.taskUpdates, [taskId]: status } })),
  setTaskUpdateInFlight: (taskId) => set({ taskUpdateInFlight: taskId }),
  resetTaskUpdates: () => set({ taskUpdates: {} }),
}));
