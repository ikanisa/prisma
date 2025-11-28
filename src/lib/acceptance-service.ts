import { supabase } from '@/integrations/supabase/client';
import { getSupabaseFunctionBaseUrl } from '@/lib/supabase-functions';

const FUNCTIONS_BASE_URL = getSupabaseFunctionBaseUrl('audit-acceptance');

export type AcceptanceStatus = 'DRAFT' | 'APPROVED' | 'REJECTED';

export interface AcceptanceDecisionDetail {
  id: string;
  status: AcceptanceStatus;
  decision: 'ACCEPT' | 'DECLINE';
  eqrRequired: boolean;
  rationale: string | null;
  approvedAt: string | null;
  updatedAt: string;
}

export interface BackgroundDetail {
  id: string;
  clientId: string;
  riskRating: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN';
  notes: string | null;
  screenings: Record<string, unknown>;
  createdAt: string;
}

export interface IndependenceDetail {
  id: string;
  clientId: string;
  threats: unknown[];
  safeguards: unknown[];
  conclusion: 'OK' | 'SAFEGUARDS_REQUIRED' | 'PROHIBITED';
  preparedAt: string;
  updatedAt: string;
}

export interface ApprovalDetail {
  id: string;
  stage: 'MANAGER' | 'PARTNER' | 'EQR';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  createdAt: string;
  resolvedAt: string | null;
  resolutionNote: string | null;
}

export interface AcceptanceSnapshot {
  status: AcceptanceDecisionDetail | null;
  background: BackgroundDetail | null;
  independence: IndependenceDetail | null;
  approvals: ApprovalDetail[];
}

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

export function runBackgroundScreen(payload: {
  orgSlug: string;
  clientId: string;
  screenings: Record<string, unknown>;
  riskRating: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN';
  notes?: string;
}) {
  return request<{ backgroundCheckId: string }>(`/background/run`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function saveIndependenceAssessment(payload: {
  orgSlug: string;
  clientId: string;
  threats: unknown[];
  safeguards: unknown[];
  conclusion: 'OK' | 'SAFEGUARDS_REQUIRED' | 'PROHIBITED';
}) {
  return request<{ assessmentId: string }>(`/independence/assess`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function submitAcceptanceDecision(payload: {
  orgSlug: string;
  engagementId: string;
  decision: 'ACCEPT' | 'DECLINE';
  eqrRequired: boolean;
  rationale?: string;
}) {
  return request<{ decisionId: string; status: AcceptanceStatus }>(`/decision/submit`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function decideAcceptanceApproval(payload: {
  orgSlug: string;
  engagementId: string;
  approvalId: string;
  decision: 'APPROVED' | 'REJECTED';
  note?: string;
}) {
  return request<{ decision: string }>(`/decision/decide`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function fetchAcceptanceStatus(orgSlug: string, engagementId: string) {
  const params = new URLSearchParams({ orgSlug, engagementId });
  return request<AcceptanceSnapshot>(`/status?${params.toString()}`);
}
