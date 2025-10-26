import { supabase } from '@/integrations/supabase/client';

const resolveFunctionsBaseUrl = () => {
  const candidate =
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.SUPABASE_URL ??
    '';
  return candidate.replace(/\/$/, '');
};

const FUNCTIONS_BASE_URL = `${resolveFunctionsBaseUrl()}/functions/v1/accounting-close`;

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

export function importAccounts(payload: { orgSlug: string; accounts: Array<{ code: string; name: string; type: string; currency?: string }> }) {
  return request<{ imported: number }>(`/accounts/import`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function importEntries(payload: { orgSlug: string; entries: Array<Record<string, unknown>> }) {
  return request<{ inserted: number }>(`/entries/import`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function createJournalBatch(payload: { orgSlug: string; entityId?: string; periodId?: string; reference?: string }) {
  return request<{ batchId: string }>(`/journal/create`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function addJournalLines(payload: { orgSlug: string; batchId: string; lines: Array<Record<string, unknown>> }) {
  return request<{ linesInserted: number }>(`/journal/add-lines`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function submitJournal(payload: { orgSlug: string; batchId: string }) {
  return request<{ batchId: string; alerts: number }>(`/journal/submit`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function approveJournal(payload: { orgSlug: string; batchId: string }) {
  return request<{ status: string }>(`/journal/approve`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function postJournal(payload: { orgSlug: string; batchId: string }) {
  return request<{ status: string }>(`/journal/post`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function createReconciliation(payload: { orgSlug: string; type: string; periodId?: string; controlAccountId?: string; glBalance: number; externalBalance: number }) {
  return request<{ reconciliationId: string; difference: number }>(`/recon/create`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function addReconciliationItem(payload: { orgSlug: string; reconciliationId: string; category: string; amount: number; reference?: string; note?: string }) {
  return request<{ success: boolean }>(`/recon/add-item`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function closeReconciliation(payload: { orgSlug: string; reconciliationId: string }) {
  return request<{ status: string }>(`/recon/close`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function snapshotTrialBalance(payload: { orgSlug: string; entityId?: string; periodId?: string; lock?: boolean }) {
  return request<{ snapshotId: string; totalDebit: number; totalCredit: number }>(`/tb/snapshot`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function runVariance(payload: { orgSlug: string; entityId?: string; periodId?: string; values?: Record<string, number>; baseline?: Record<string, number> }) {
  return request<{ triggered: number }>(`/variance/run`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function instantiatePbc(payload: { orgSlug: string; entityId?: string; periodId?: string; area: string; items: Array<{ title: string; assigneeUserId?: string; dueAt?: string }> }) {
  return request<{ inserted: number }>(`/pbc/instantiate`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function advanceClosePeriod(payload: { orgSlug: string; closePeriodId: string }) {
  return request<{ status: string }>(`/close/advance`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function lockClosePeriod(payload: { orgSlug: string; closePeriodId: string }) {
  return request<{ status: string }>(`/close/lock`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
