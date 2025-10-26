import { supabase } from '@/integrations/supabase/client';

const resolveFunctionsBaseUrl = () => {
  const base =
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.SUPABASE_URL ??
    '';
  return base.replace(/\/$/, '');
};

const FUNCTIONS_BASE_URL = resolveFunctionsBaseUrl()
  ? `${resolveFunctionsBaseUrl()}/functions/v1/audit-plan`
  : '';

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

type RawPlanDetail = {
  id: string;
  basis_framework: string;
  strategy?: Record<string, unknown> | null;
  status: AuditPlanStatus;
  submitted_at: string | null;
  locked_at: string | null;
  approvals?: unknown[] | null;
  updated_at: string;
};

type RawMaterialityDetail = {
  id: string;
  fs_materiality?: number | string | null;
  performance_materiality?: number | string | null;
  clearly_trivial_threshold?: number | string | null;
  benchmarks?: unknown[] | null;
  rationale?: string | null;
  prepared_at: string;
};

type RawChangeEntry = {
  id: string;
  reason: string;
  impact?: Record<string, unknown> | null;
  created_at: string;
  changed_by_user_id: string;
};

type RawApprovalEntry = {
  id: string;
  stage: ApprovalEntry['stage'];
  status: ApprovalEntry['status'];
  created_at: string;
  resolved_at: string | null;
  resolved_by_user_id: string | null;
  payload?: Record<string, unknown> | null;
};

type RawAuditPlanSnapshot = {
  plan?: RawPlanDetail | null;
  materiality?: RawMaterialityDetail | null;
  changeLog?: RawChangeEntry[] | null;
  approvals?: RawApprovalEntry[] | null;
};

async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!FUNCTIONS_BASE_URL) {
    throw new Error('Supabase URL is not configured');
  }
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
  const raw = await request<RawAuditPlanSnapshot>(`/status?${query.toString()}`);

  const planSource = raw.plan ?? null;
  const plan = planSource
    ? {
        id: planSource.id,
        basisFramework: planSource.basis_framework,
        strategy: planSource.strategy ?? {},
        status: planSource.status,
        submittedAt: planSource.submitted_at,
        lockedAt: planSource.locked_at,
        approvals: planSource.approvals ?? [],
        updatedAt: planSource.updated_at,
      }
    : null;

  const materialitySource = raw.materiality ?? null;
  const materiality = materialitySource
    ? {
        id: materialitySource.id,
        fsMateriality: Number(materialitySource.fs_materiality ?? 0),
        performanceMateriality: Number(materialitySource.performance_materiality ?? 0),
        clearlyTrivialThreshold: Number(materialitySource.clearly_trivial_threshold ?? 0),
        benchmarks: materialitySource.benchmarks ?? [],
        rationale: materialitySource.rationale ?? null,
        preparedAt: materialitySource.prepared_at,
      }
    : null;

  const changeLog: PlanChangeEntry[] = Array.isArray(raw.changeLog)
    ? raw.changeLog.map((entry) => ({
        id: entry.id,
        reason: entry.reason,
        impact: entry.impact ?? {},
        createdAt: entry.created_at,
        changedByUserId: entry.changed_by_user_id,
      }))
    : [];

  const approvals: ApprovalEntry[] = Array.isArray(raw.approvals)
    ? raw.approvals.map((entry) => ({
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
