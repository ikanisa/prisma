import { supabase } from '@/integrations/supabase/client';

const FUNCTIONS_BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/audit-plan`;

export type AuditPlanStatus = 'DRAFT' | 'READY_FOR_APPROVAL' | 'LOCKED';

export interface AuditPlanDetail {
  id: string;
  basisFramework: string;
  strategy: Record<string, unknown>;
  status: AuditPlanStatus;
  submittedAt: string | null;
  lockedAt: string | null;
  approvals: unknown[];
  updatedAt: string;
}

export interface MaterialityDetail {
  id: string;
  fsMateriality: number;
  performanceMateriality: number;
  clearlyTrivialThreshold: number;
  benchmarks: unknown[];
  rationale: string | null;
  preparedAt: string;
}

export interface PlanChangeEntry {
  id: string;
  reason: string;
  impact: Record<string, unknown>;
  createdAt: string;
  changedByUserId: string;
}

export interface ApprovalEntry {
  id: string;
  stage: 'MANAGER' | 'PARTNER' | 'EQR';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  createdAt: string;
  resolvedAt: string | null;
  resolvedByUserId: string | null;
  payload: Record<string, unknown>;
}

export interface AuditPlanSnapshot {
  plan: AuditPlanDetail | null;
  materiality: MaterialityDetail | null;
  changeLog: PlanChangeEntry[];
  approvals: ApprovalEntry[];
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

export async function fetchAuditPlanSnapshot(params: { orgSlug: string; engagementId: string }) {
  const query = new URLSearchParams(params as Record<string, string>);
  const raw = await request<any>(`/status?${query.toString()}`);

  const plan = raw.plan
    ? {
        id: raw.plan.id,
        basisFramework: raw.plan.basis_framework,
        strategy: raw.plan.strategy ?? {},
        status: raw.plan.status as AuditPlanStatus,
        submittedAt: raw.plan.submitted_at,
        lockedAt: raw.plan.locked_at,
        approvals: raw.plan.approvals ?? [],
        updatedAt: raw.plan.updated_at,
      }
    : null;

  const materiality = raw.materiality
    ? {
        id: raw.materiality.id,
        fsMateriality: Number(raw.materiality.fs_materiality ?? 0),
        performanceMateriality: Number(raw.materiality.performance_materiality ?? 0),
        clearlyTrivialThreshold: Number(raw.materiality.clearly_trivial_threshold ?? 0),
        benchmarks: raw.materiality.benchmarks ?? [],
        rationale: raw.materiality.rationale ?? null,
        preparedAt: raw.materiality.prepared_at,
      }
    : null;

  const changeLog: PlanChangeEntry[] = Array.isArray(raw.changeLog)
    ? raw.changeLog.map((entry: any) => ({
        id: entry.id,
        reason: entry.reason,
        impact: entry.impact ?? {},
        createdAt: entry.created_at,
        changedByUserId: entry.changed_by_user_id,
      }))
    : [];

  const approvals: ApprovalEntry[] = Array.isArray(raw.approvals)
    ? raw.approvals.map((entry: any) => ({
        id: entry.id,
        stage: entry.stage,
        status: entry.status,
        createdAt: entry.created_at,
        resolvedAt: entry.resolved_at,
        resolvedByUserId: entry.resolved_by_user_id,
        payload: entry.payload ?? {},
      }))
    : [];

  return { plan, materiality, changeLog, approvals } satisfies AuditPlanSnapshot;
}

export function upsertPlanStrategy(payload: {
  orgSlug: string;
  engagementId: string;
  basisFramework: string;
  strategy: Record<string, unknown>;
}) {
  return request<{ planId: string }>(`/strategy/upsert`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function setMateriality(payload: {
  orgSlug: string;
  engagementId: string;
  fsMateriality: number;
  performanceMateriality: number;
  clearlyTrivialThreshold: number;
  benchmarks?: unknown[];
  rationale?: string;
}) {
  return request<{ materialityId: string }>(`/materiality/set`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function submitPlanForApproval(payload: { orgSlug: string; engagementId: string }) {
  return request<{ approvalId: string }>(`/plan/submit`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function decidePlanApproval(payload: {
  orgSlug: string;
  engagementId: string;
  approvalId: string;
  decision: 'APPROVED' | 'REJECTED';
  note?: string;
}) {
  return request<{ status: AuditPlanStatus | 'REJECTED' }>(`/plan/approve`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
