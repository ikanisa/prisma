import { authorizedFetch } from '@/lib/api';

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
}): Promise<{ checklist: OnboardingChecklist; draft: Record<string, unknown> | null }> {
  const response = await authorizedFetch('/v1/onboarding/commit', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.detail ?? 'Failed to commit onboarding');
  }
  return payload as { checklist: OnboardingChecklist; draft: Record<string, unknown> | null };
}
