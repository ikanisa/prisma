import { supabase } from '@/integrations/supabase/client';
import { getSupabaseFunctionBaseUrl } from '@/lib/supabase-functions';

const FUNCTIONS_BASE_URL = getSupabaseFunctionBaseUrl('audit-report');

export interface AuditReportDraft {
  id: string;
  org_id: string;
  engagement_id: string;
  title?: string | null;
  period_id?: string | null;
  opinion: 'UNMODIFIED' | 'QUALIFIED' | 'ADVERSE' | 'DISCLAIMER';
  basis_for_opinion?: string | null;
  include_eom: boolean;
  eom_text?: string | null;
  include_om: boolean;
  om_text?: string | null;
  incorporate_kams: boolean;
  kam_ids: string[];
  gc_disclosure_required: boolean;
  draft_html?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  updated_by_user_id?: string | null;
  created_by_user_id?: string;
}

export interface ApprovalQueueItem {
  id: string;
  stage: 'MANAGER' | 'PARTNER' | 'EQR';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  created_at: string;
  resolved_at?: string | null;
  resolution_note?: string | null;
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

export function fetchReport(orgSlug: string, engagementId: string) {
  const params = new URLSearchParams({ orgSlug, engagementId });
  return request<{ report: AuditReportDraft | null; approvals: ApprovalQueueItem[] }>(`/get?${params.toString()}`);
}

export function createReportDraft(payload: { orgSlug: string; engagementId: string }) {
  return request<{ report: AuditReportDraft }>(`/draft/create`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateReportDraft(payload: {
  orgSlug: string;
  engagementId: string;
  reportId: string;
  opinion?: AuditReportDraft['opinion'];
  basisForOpinion?: string | null;
  includeEOM?: boolean;
  eomText?: string | null;
  includeOM?: boolean;
  omText?: string | null;
  incorporateKAMs?: boolean;
  kamIds?: string[];
  gcDisclosureRequired?: boolean;
}) {
  return request<{ report: AuditReportDraft }>(`/draft/update`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function submitReportDraft(payload: { orgSlug: string; engagementId: string; reportId: string }) {
  return request<{ report: AuditReportDraft }>(`/submit`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function releaseReport(payload: { orgSlug: string; engagementId: string; reportId: string }) {
  return request<{ report: AuditReportDraft }>(`/release`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function runDecisionTree(payload: { orgSlug: string; engagementId: string }) {
  return request<{
    recommendedOpinion: AuditReportDraft['opinion'];
    reasons: string[];
    requiredSections: string[];
    goingConcernMaterialUncertainty: boolean;
  }>(`/decision-tree`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function exportReportPdf(payload: { orgSlug: string; engagementId: string; reportId: string }) {
  return request<{ documentId: string; path: string }>(`/export/pdf`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
