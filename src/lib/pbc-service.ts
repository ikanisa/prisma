import { supabase } from '@/integrations/supabase/client';

const FUNCTIONS_BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/audit-pbc`;

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

export type PbcRequestStatus = 'REQUESTED' | 'RECEIVED' | 'REJECTED' | 'OBSOLETE';

export interface PbcDelivery {
  id: string;
  org_id: string;
  request_id: string;
  document_id: string | null;
  delivered_at: string;
  note: string | null;
  created_at: string;
  created_by_user_id: string;
}

export interface PbcRequest {
  id: string;
  org_id: string;
  engagement_id: string;
  cycle: string;
  item: string;
  description: string | null;
  due_at: string | null;
  assignee_client_user_id: string | null;
  procedure_id: string | null;
  status: PbcRequestStatus;
  created_at: string;
  created_by_user_id: string;
  updated_at: string;
  updated_by_user_id: string | null;
  deliveries: PbcDelivery[];
}

export function fetchPbcRequests(orgSlug: string, engagementId: string) {
  const params = new URLSearchParams({ orgSlug, engagementId });
  return request<{ requests: PbcRequest[] }>(`/list?${params.toString()}`);
}

export function instantiatePbcTemplate(payload: {
  orgSlug: string;
  engagementId: string;
  cycle: string;
  items: Array<{
    item: string;
    description?: string | null;
    dueAt?: string | null;
    assigneeClientUserId?: string | null;
    procedureId?: string | null;
  }>;
}) {
  return request<{ requests: PbcRequest[] }>(`/template/instantiate`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updatePbcRequestStatus(payload: {
  orgSlug: string;
  requestId: string;
  status: PbcRequestStatus;
  documentId?: string | null;
  note?: string | null;
  procedureId?: string | null;
}) {
  return request<{ requests: PbcRequest[] }>(`/request/update-status`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function remindPbcRequest(payload: {
  orgSlug: string;
  requestId: string;
  message?: string;
}) {
  return request<{ success: boolean }>(`/request/remind`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
