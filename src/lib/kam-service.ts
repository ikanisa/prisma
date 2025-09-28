import { supabase } from '@/integrations/supabase/client';

const FUNCTIONS_BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/audit-kam`;

export interface KamCandidate {
  id: string;
  org_id: string;
  engagement_id: string;
  source: 'RISK' | 'ESTIMATE' | 'GOING_CONCERN' | 'OTHER';
  risk_id?: string | null;
  estimate_id?: string | null;
  going_concern_id?: string | null;
  title: string;
  rationale?: string | null;
  status: 'CANDIDATE' | 'SELECTED' | 'EXCLUDED';
  created_at: string;
}

export interface KamDraft {
  id: string;
  org_id: string;
  engagement_id: string;
  candidate_id: string;
  heading: string;
  why_kam?: string | null;
  how_addressed?: string | null;
  procedures_refs: Array<{ procedureId: string; isaRefs: string[] }>;
  evidence_refs: Array<{ evidenceId?: string; documentId?: string; note?: string }>;
  results_summary?: string | null;
  status: 'DRAFT' | 'READY_FOR_REVIEW' | 'APPROVED' | 'REJECTED';
  submitted_at?: string | null;
  approved_at?: string | null;
  created_at: string;
}

export interface ApprovalQueueItem {
  id: string;
  org_id: string;
  engagement_id: string;
  stage: 'MANAGER' | 'PARTNER' | 'EQR';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  draft_id?: string | null;
  candidate_id?: string | null;
  created_at: string;
  resolved_at?: string | null;
  resolution_note?: string | null;
}

export interface KamListResponse {
  candidates: KamCandidate[];
  drafts: KamDraft[];
  approvals: ApprovalQueueItem[];
  role: 'EMPLOYEE' | 'MANAGER' | 'SYSTEM_ADMIN';
}

async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

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
    const message = json?.error ?? 'Request failed';
    throw new Error(message);
  }

  return json as T;
}

export function fetchKamData(orgSlug: string, engagementId: string, seed = true) {
  const query = new URLSearchParams({ orgSlug, engagementId, seed: String(seed) });
  return request<KamListResponse>(`/list?${query.toString()}`);
}

export function addCandidate(payload: {
  orgSlug: string;
  engagementId: string;
  title: string;
  rationale?: string;
  source: KamCandidate['source'];
  riskId?: string;
  estimateId?: string;
  goingConcernId?: string;
}) {
  return request<{ candidate: KamCandidate }>(`/candidate/add`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateCandidateStatus(payload: {
  orgSlug: string;
  engagementId: string;
  candidateId: string;
  reason?: string;
  action: 'select' | 'exclude';
}) {
  const path = payload.action === 'select' ? '/candidate/select' : '/candidate/exclude';
  return request<{ candidate: KamCandidate }>(path, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function createDraft(payload: {
  orgSlug: string;
  engagementId: string;
  candidateId: string;
  heading?: string;
  whyKam?: string;
  howAddressed?: string;
  resultsSummary?: string;
  proceduresRefs?: KamDraft['procedures_refs'];
  evidenceRefs?: KamDraft['evidence_refs'];
}) {
  return request<{ draft: KamDraft; reused?: boolean }>(`/draft/create`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateDraft(payload: {
  orgSlug: string;
  engagementId: string;
  draftId: string;
  heading?: string;
  whyKam?: string;
  howAddressed?: string;
  resultsSummary?: string;
  proceduresRefs?: KamDraft['procedures_refs'];
  evidenceRefs?: KamDraft['evidence_refs'];
}) {
  return request<{ draft: KamDraft }>(`/draft/update`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function submitDraft(payload: {
  orgSlug: string;
  engagementId: string;
  draftId: string;
}) {
  return request<{ draft: KamDraft }>(`/draft/submit`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function exportKams(orgSlug: string, engagementId: string, format: 'json' | 'markdown' = 'json') {
  const query = new URLSearchParams({ orgSlug, engagementId, format });
  return request<{ drafts?: KamDraft[]; markdown?: string; count: number }>(`/export?${query.toString()}`);
}

export function decideApproval(payload: {
  orgSlug: string;
  engagementId: string;
  approvalId: string;
  decision: 'APPROVED' | 'REJECTED';
  note?: string;
}) {
  return request<{ approvals: ApprovalQueueItem[] }>(`/approval/decide`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
