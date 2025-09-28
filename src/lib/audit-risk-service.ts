import { supabase } from '@/integrations/supabase/client';

const FUNCTIONS_BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/audit-risk`;

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

export interface AuditRiskRecord {
  id: string;
  orgId: string;
  engagementId: string;
  code: string | null;
  title: string;
  description: string | null;
  category: string;
  assertions: string[];
  likelihood: string;
  impact: string;
  inherentRating: string;
  residualRating: string | null;
  status: string;
  source: string;
  analyticsSummary: Record<string, unknown>;
  ownerUserId: string | null;
  createdAt: string;
  updatedAt: string;
  updatedByUserId: string | null;
}

export interface AuditRiskSignalRecord {
  id: string;
  riskId: string | null;
  signalType: string;
  source: string;
  severity: string;
  metric: Record<string, unknown>;
  detectedAt: string;
  createdAt: string;
}

export interface AuditRiskActivityRecord {
  id: string;
  riskId: string;
  action: string;
  notes: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

function mapRisk(raw: any): AuditRiskRecord {
  return {
    id: raw.id,
    orgId: raw.org_id,
    engagementId: raw.engagement_id,
    code: raw.code ?? null,
    title: raw.title,
    description: raw.description ?? null,
    category: raw.category,
    assertions: Array.isArray(raw.assertions) ? raw.assertions : [],
    likelihood: raw.likelihood,
    impact: raw.impact,
    inherentRating: raw.inherent_rating,
    residualRating: raw.residual_rating ?? null,
    status: raw.status,
    source: raw.source,
    analyticsSummary: raw.analytics_summary ?? {},
    ownerUserId: raw.owner_user_id ?? null,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    updatedByUserId: raw.updated_by_user_id ?? null,
  } satisfies AuditRiskRecord;
}

function mapSignal(raw: any): AuditRiskSignalRecord {
  return {
    id: raw.id,
    riskId: raw.risk_id ?? null,
    signalType: raw.signal_type,
    source: raw.source,
    severity: raw.severity,
    metric: raw.metric ?? {},
    detectedAt: raw.detected_at,
    createdAt: raw.created_at,
  } satisfies AuditRiskSignalRecord;
}

function mapActivity(raw: any): AuditRiskActivityRecord {
  return {
    id: raw.id,
    riskId: raw.risk_id,
    action: raw.action,
    notes: raw.notes ?? null,
    metadata: raw.metadata ?? {},
    createdAt: raw.created_at,
  } satisfies AuditRiskActivityRecord;
}

export async function fetchRiskRegister(params: { orgSlug: string; engagementId: string }) {
  const query = new URLSearchParams(params as Record<string, string>);
  const raw = await request<any>(`/?${query.toString()}`);
  return {
    risks: Array.isArray(raw.risks) ? raw.risks.map(mapRisk) : [],
    signals: Array.isArray(raw.signals) ? raw.signals.map(mapSignal) : [],
    activity: Array.isArray(raw.activity) ? raw.activity.map(mapActivity) : [],
  };
}

export async function upsertRisk(payload: {
  orgSlug: string;
  engagementId: string;
  id?: string;
  code?: string | null;
  title: string;
  description?: string | null;
  category: string;
  assertions: string[];
  likelihood: string;
  impact: string;
  inherentRating: string;
  residualRating?: string | null;
  status?: string;
  source?: string;
  analyticsSummary?: Record<string, unknown>;
  ownerUserId?: string | null;
}) {
  const body = { ...payload };
  const { orgSlug, engagementId, ...rest } = body;
  return request<{ id: string }>(`/risk/upsert?${new URLSearchParams({ orgSlug, engagementId }).toString()}`, {
    method: 'POST',
    body: JSON.stringify(rest),
  });
}

export async function updateRiskStatus(payload: {
  orgSlug: string;
  engagementId: string;
  id: string;
  status: string;
  residualRating?: string | null;
  note?: string;
}) {
  const { orgSlug, engagementId, ...rest } = payload;
  return request<{ status: string }>(`/risk/status?${new URLSearchParams({ orgSlug, engagementId }).toString()}`, {
    method: 'POST',
    body: JSON.stringify(rest),
  });
}

export async function recordRiskSignal(payload: {
  orgSlug: string;
  engagementId: string;
  riskId?: string;
  signalType?: string;
  source?: string;
  severity?: string;
  metric?: Record<string, unknown>;
  detectedAt?: string;
}) {
  const { orgSlug, engagementId, ...rest } = payload;
  return request<{ id: string }>(`/signal/record?${new URLSearchParams({ orgSlug, engagementId }).toString()}`, {
    method: 'POST',
    body: JSON.stringify(rest),
  });
}

export async function addRiskActivity(payload: {
  orgSlug: string;
  engagementId: string;
  riskId: string;
  action?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}) {
  const { orgSlug, engagementId, ...rest } = payload;
  return request<{ id: string }>(`/activity/add?${new URLSearchParams({ orgSlug, engagementId }).toString()}`, {
    method: 'POST',
    body: JSON.stringify(rest),
  });
}
