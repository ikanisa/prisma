import { authorizedFetch } from '@/lib/api';
import type { TaskRecord } from '@/lib/tasks';

export interface OnboardingChecklistItem {
  id: string;
  category: string;
  label: string;
  status: 'PENDING' | 'REVIEW' | 'COMPLETE';
  document_id: string | null;
  notes?: string | null;
  updated_at?: string;
}

export interface OnboardingChecklist {
  id: string;
  org_id: string;
  temp_entity_id: string;
  industry: string;
  country: string;
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  items: OnboardingChecklistItem[];
}

export interface OnboardingTaskSeed {
  title: string;
  category?: string;
  source?: string;
  documentId?: string;
}

export interface OnboardingCommitResult {
  checklist: OnboardingChecklist;
  draft: Record<string, unknown> | null;
  profile?: Record<string, unknown> | null;
  provenance?: Record<string, unknown> | null;
  taskSeeds: OnboardingTaskSeed[];
  tasks: TaskRecord[];
}

export async function startOnboarding(orgSlug: string, industry: string, country: string): Promise<{
  checklist: OnboardingChecklist;
  draft: Record<string, unknown> | null;
}> {
  const response = await authorizedFetch('/v1/onboarding/start', {
    method: 'POST',
    body: JSON.stringify({ orgSlug, industry, country }),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.detail ?? 'Failed to start onboarding');
  }
  return payload as { checklist: OnboardingChecklist; draft: Record<string, unknown> | null };
}

export async function linkChecklistDocument(params: {
  checklistId: string;
  itemId: string;
  documentId: string;
}): Promise<{ checklist: OnboardingChecklist }> {
  const response = await authorizedFetch('/v1/onboarding/link-doc', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.detail ?? 'Failed to link document');
  }
  return payload as { checklist: OnboardingChecklist };
}

export async function commitOnboarding(params: {
  checklistId: string;
  profile: Record<string, unknown>;
}): Promise<OnboardingCommitResult> {
  const response = await authorizedFetch('/v1/onboarding/commit', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.detail ?? 'Failed to commit onboarding');
  }
  const taskSeeds = Array.isArray(payload?.taskSeeds)
    ? (payload.taskSeeds as OnboardingTaskSeed[])
    : [];
  const tasks = Array.isArray(payload?.tasks) ? (payload.tasks as TaskRecord[]) : [];
  return {
    checklist: payload.checklist as OnboardingChecklist,
    draft: (payload?.draft ?? null) as Record<string, unknown> | null,
    profile: payload?.profile ?? null,
    provenance: payload?.provenance ?? null,
    taskSeeds,
    tasks,
  };
}
