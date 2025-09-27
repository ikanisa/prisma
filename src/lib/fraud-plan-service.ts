import { supabase } from '@/integrations/supabase/client';

const FUNCTIONS_BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/audit-fraud`;

async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated');

  const response = await fetch(`${FUNCTIONS_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

  const text = await response.text();
  const json = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(json?.error ?? 'Request failed');
  }
  return json as T;
}

export interface FraudPlanRecord {
  id: string;
  status: 'DRAFT' | 'READY_FOR_APPROVAL' | 'LOCKED';
  brainstormingNotes: string | null;
  inherentFraudRisks: unknown[];
  fraudResponses: unknown[];
  analyticsStrategy: Record<string, unknown>;
  overrideAssessment: Record<string, unknown>;
  submittedAt: string | null;
  lockedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FraudPlanActionRecord {
  id: string;
  action: string;
  notes: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface JournalEntryStrategyRecord {
  id: string;
  scope: Record<string, unknown>;
  filters: Record<string, unknown>;
  thresholds: Record<string, unknown>;
  schedule: Record<string, unknown>;
  analyticsLink: Record<string, unknown>;
  ownerUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

function mapPlan(raw: any): FraudPlanRecord {
  return {
    id: raw.id,
    status: raw.status,
    brainstormingNotes: raw.brainstorming_notes ?? null,
    inherentFraudRisks: raw.inherent_fraud_risks ?? [],
    fraudResponses: raw.fraud_responses ?? [],
    analyticsStrategy: raw.analytics_strategy ?? {},
    overrideAssessment: raw.override_assessment ?? {},
    submittedAt: raw.submitted_at ?? null,
    lockedAt: raw.locked_at ?? null,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  } satisfies FraudPlanRecord;
}

function mapAction(raw: any): FraudPlanActionRecord {
  return {
    id: raw.id,
    action: raw.action,
    notes: raw.notes ?? null,
    metadata: raw.metadata ?? {},
    createdAt: raw.created_at,
  } satisfies FraudPlanActionRecord;
}

function mapJeStrategy(raw: any): JournalEntryStrategyRecord {
  return {
    id: raw.id,
    scope: raw.scope ?? {},
    filters: raw.filters ?? {},
    thresholds: raw.thresholds ?? {},
    schedule: raw.schedule ?? {},
    analyticsLink: raw.analytics_link ?? {},
    ownerUserId: raw.owner_user_id ?? null,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  } satisfies JournalEntryStrategyRecord;
}

export async function fetchFraudPlan(params: { orgSlug: string; engagementId: string }) {
  const query = new URLSearchParams(params as Record<string, string>);
  const raw = await request<any>(`/?${query.toString()}`);
  return {
    plan: raw.plan ? mapPlan(raw.plan) : null,
    actions: Array.isArray(raw.actions) ? raw.actions.map(mapAction) : [],
    journalEntryStrategy: raw.journalEntryStrategy ? mapJeStrategy(raw.journalEntryStrategy) : null,
  };
}

export async function upsertFraudPlan(payload: {
  orgSlug: string;
  engagementId: string;
  brainstormingNotes?: string | null;
  inherentFraudRisks?: unknown[];
  fraudResponses?: unknown[];
  analyticsStrategy?: Record<string, unknown>;
  overrideAssessment?: Record<string, unknown>;
}) {
  const { orgSlug, engagementId, ...rest } = payload;
  return request<{ id: string }>(
    `/fraud-plan/upsert?${new URLSearchParams({ orgSlug, engagementId }).toString()}`,
    {
      method: 'POST',
      body: JSON.stringify(rest),
    },
  );
}

export async function submitFraudPlan(payload: { orgSlug: string; engagementId: string }) {
  const { orgSlug, engagementId } = payload;
  return request<{ approvalId: string }>(
    `/fraud-plan/submit?${new URLSearchParams({ orgSlug, engagementId }).toString()}`,
    { method: 'POST', body: JSON.stringify({}) },
  );
}

export async function decideFraudPlan(payload: {
  orgSlug: string;
  engagementId: string;
  approvalId: string;
  decision?: 'APPROVED' | 'REJECTED';
  note?: string;
}) {
  const { orgSlug, engagementId, ...rest } = payload;
  return request<{ status: string }>(
    `/fraud-plan/approve?${new URLSearchParams({ orgSlug, engagementId }).toString()}`,
    { method: 'POST', body: JSON.stringify(rest) },
  );
}

export async function recordFraudPlanAction(payload: {
  orgSlug: string;
  engagementId: string;
  action?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}) {
  const { orgSlug, engagementId, ...rest } = payload;
  return request<{ id: string }>(
    `/fraud-plan/action?${new URLSearchParams({ orgSlug, engagementId }).toString()}`,
    { method: 'POST', body: JSON.stringify(rest) },
  );
}

export async function upsertJournalEntryStrategy(payload: {
  orgSlug: string;
  engagementId: string;
  scope?: Record<string, unknown>;
  filters?: Record<string, unknown>;
  thresholds?: Record<string, unknown>;
  schedule?: Record<string, unknown>;
  analyticsLink?: Record<string, unknown>;
  ownerUserId?: string | null;
}) {
  const { orgSlug, engagementId, ...rest } = payload;
  return request<{ id: string }>(
    `/je-strategy/upsert?${new URLSearchParams({ orgSlug, engagementId }).toString()}`,
    { method: 'POST', body: JSON.stringify(rest) },
  );
}
