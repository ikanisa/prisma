import { supabase } from '@/integrations/supabase/client';
import { getSupabaseFunctionBaseUrl } from '@/lib/supabase-functions';

const FUNCTIONS_BASE_URL = getSupabaseFunctionBaseUrl('audit-responses');

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

export interface AuditResponseRecord {
  id: string;
  riskId: string;
  responseType: string;
  title: string;
  objective: string | null;
  procedure: Record<string, unknown>;
  linkage: Record<string, unknown>;
  ownership: Record<string, unknown>;
  coverageAssertions: string[];
  plannedEffectiveness: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditResponseCheckRecord {
  id: string;
  responseId: string;
  completeness: boolean;
  conclusions: string | null;
  reviewerUserId: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

function mapResponse(raw: any): AuditResponseRecord {
  return {
    id: raw.id,
    riskId: raw.risk_id,
    responseType: raw.response_type,
    title: raw.title,
    objective: raw.objective ?? null,
    procedure: raw.procedure ?? {},
    linkage: raw.linkage ?? {},
    ownership: raw.ownership ?? {},
    coverageAssertions: Array.isArray(raw.coverage_assertions) ? raw.coverage_assertions : [],
    plannedEffectiveness: raw.planned_effectiveness,
    status: raw.status,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  } satisfies AuditResponseRecord;
}

function mapCheck(raw: any): AuditResponseCheckRecord {
  return {
    id: raw.id,
    responseId: raw.response_id,
    completeness: Boolean(raw.completeness),
    conclusions: raw.conclusions ?? null,
    reviewerUserId: raw.reviewer_user_id ?? null,
    reviewedAt: raw.reviewed_at ?? null,
    createdAt: raw.created_at,
  } satisfies AuditResponseCheckRecord;
}

export async function fetchResponses(params: { orgSlug: string; engagementId: string }) {
  const query = new URLSearchParams(params as Record<string, string>);
  const raw = await request<any>(`/?${query.toString()}`);
  return {
    responses: Array.isArray(raw.responses) ? raw.responses.map(mapResponse) : [],
    checks: Array.isArray(raw.checks) ? raw.checks.map(mapCheck) : [],
  };
}

export async function upsertResponse(payload: {
  orgSlug: string;
  engagementId: string;
  id?: string;
  riskId: string;
  responseType: string;
  title: string;
  objective?: string | null;
  procedure?: Record<string, unknown>;
  linkage?: Record<string, unknown>;
  ownership?: Record<string, unknown>;
  coverageAssertions?: string[];
  plannedEffectiveness?: string;
  status?: string;
}) {
  const { orgSlug, engagementId, ...rest } = payload;
  return request<{ id: string }>(`/response/upsert?${new URLSearchParams({ orgSlug, engagementId }).toString()}`, {
    method: 'POST',
    body: JSON.stringify(rest),
  });
}

export async function updateResponseStatus(payload: {
  orgSlug: string;
  engagementId: string;
  id: string;
  status: string;
}) {
  const { orgSlug, engagementId, ...rest } = payload;
  return request<{ status: string }>(`/response/status?${new URLSearchParams({ orgSlug, engagementId }).toString()}`, {
    method: 'POST',
    body: JSON.stringify(rest),
  });
}

export async function recordResponseCheck(payload: {
  orgSlug: string;
  engagementId: string;
  responseId: string;
  completeness: boolean;
  conclusions?: string;
  metadata?: Record<string, unknown>;
}) {
  const { orgSlug, engagementId, ...rest } = payload;
  return request<{ id: string }>(`/response/check?${new URLSearchParams({ orgSlug, engagementId }).toString()}`, {
    method: 'POST',
    body: JSON.stringify(rest),
  });
}
