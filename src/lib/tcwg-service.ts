import { supabase } from '@/integrations/supabase/client';
import { getSupabaseFunctionBaseUrl } from '@/lib/supabase-functions';

const FUNCTIONS_BASE_URL = getSupabaseFunctionBaseUrl('audit-tcwg');

export type TcwgStatus = 'DRAFT' | 'READY_FOR_REVIEW' | 'APPROVED' | 'SENT';

export interface TcwgPack {
  id: string;
  org_id: string;
  engagement_id: string;
  report_draft_id?: string | null;
  independence_statement?: string | null;
  scope_summary?: string | null;
  significant_findings?: string | null;
  significant_difficulties?: string | null;
  uncorrected_misstatements: unknown[];
  corrected_misstatements: unknown[];
  deficiencies: unknown[];
  kam_summary: unknown[];
  going_concern_summary: Record<string, unknown>;
  subsequent_events_summary: Record<string, unknown>;
  other_matters?: string | null;
  status: TcwgStatus;
  pdf_document_id?: string | null;
  zip_document_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TcwgApprovalsResponse {
  approvals: Array<{
    id: string;
    stage: 'MANAGER' | 'PARTNER' | 'EQR';
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
    created_at?: string | null;
    resolved_at?: string | null;
    resolution_note?: string | null;
  }>;
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

export function fetchTcwgPack(orgSlug: string, engagementId: string) {
  const params = new URLSearchParams({ orgSlug, engagementId });
  return request<{ pack: TcwgPack | null; approvals: TcwgApprovalsResponse['approvals']; reportReleased: boolean }>(`/get?${params.toString()}`);
}

export function createTcwgPack(payload: { orgSlug: string; engagementId: string }) {
  return request<{ pack: TcwgPack }>(`/create`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateTcwgPack(payload: {
  orgSlug: string;
  engagementId: string;
  packId: string;
  independenceStatement?: string;
  scopeSummary?: string;
  significantFindings?: string;
  significantDifficulties?: string;
  uncorrectedMisstatements?: unknown[];
  correctedMisstatements?: unknown[];
  deficiencies?: unknown[];
  kamSummary?: unknown[];
  goingConcernSummary?: Record<string, unknown>;
  subsequentEventsSummary?: Record<string, unknown>;
  otherMatters?: string;
}) {
  return request<{ pack: TcwgPack }>(`/update`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function renderTcwgPack(payload: { orgSlug: string; engagementId: string; packId: string }) {
  return request<{ pack: TcwgPack; documentId: string }>(`/render`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function buildTcwgZip(payload: { orgSlug: string; engagementId: string; packId: string }) {
  return request<{ pack: TcwgPack; documentId: string; sha256: string }>(`/build-zip`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function submitTcwgPack(payload: { orgSlug: string; engagementId: string; packId: string }) {
  return request<{ pack: TcwgPack }>(`/submit`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function decideTcwgApproval(payload: {
  orgSlug: string;
  engagementId: string;
  approvalId: string;
  decision: 'APPROVED' | 'REJECTED';
  note?: string;
}) {
  return request<TcwgApprovalsResponse>(`/approval/decide`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function sendTcwgPack(payload: { orgSlug: string; engagementId: string; packId: string }) {
  return request<{ pack: TcwgPack; shareUrl: string | null; sha256: string }>(`/send`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
