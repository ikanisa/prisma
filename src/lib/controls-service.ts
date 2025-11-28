import { supabase } from '@/integrations/supabase/client';
import { getSupabaseFunctionBaseUrl } from '@/lib/supabase-functions';

const FUNCTIONS_BASE_URL = getSupabaseFunctionBaseUrl('audit-controls');

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

export type ControlWalkthroughResult = 'DESIGNED' | 'NOT_DESIGNED' | 'IMPLEMENTED' | 'NOT_IMPLEMENTED';
export type ControlTestResult = 'PASS' | 'EXCEPTIONS';
export type DeficiencySeverity = 'LOW' | 'MEDIUM' | 'HIGH';
export type DeficiencyStatus = 'OPEN' | 'REMEDIATION' | 'CLOSED';
export type ItgcType = 'ACCESS' | 'CHANGE' | 'OPERATIONS';

export interface ControlWalkthrough {
  id: string;
  org_id: string;
  engagement_id: string;
  control_id: string;
  walk_date: string;
  notes: string | null;
  result: ControlWalkthroughResult;
  created_at: string;
  created_by_user_id: string;
  procedure_id: string | null;
}

export interface ControlTest {
  id: string;
  org_id: string;
  engagement_id: string;
  control_id: string;
  attributes: Record<string, unknown>;
  sample_plan_ref: string | null;
  result: ControlTestResult;
  created_at: string;
  created_by_user_id: string;
  procedure_id: string | null;
}

export interface Deficiency {
  id: string;
  org_id: string;
  engagement_id: string;
  control_id: string | null;
  severity: DeficiencySeverity;
  recommendation: string;
  status: DeficiencyStatus;
  created_at: string;
  created_by_user_id: string;
  updated_at: string;
  procedure_id: string | null;
}

export interface Control {
  id: string;
  org_id: string;
  engagement_id: string;
  cycle: string;
  objective: string;
  description: string | null;
  frequency: string | null;
  owner: string | null;
  key: boolean;
  created_at: string;
  created_by_user_id: string;
  updated_at: string;
  updated_by_user_id: string | null;
  walkthroughs: ControlWalkthrough[];
  tests: ControlTest[];
  deficiencies: Deficiency[];
}

export interface ItgcGroup {
  id: string;
  org_id: string;
  engagement_id: string | null;
  type: ItgcType;
  scope: string | null;
  notes: string | null;
  created_at: string;
  created_by_user_id: string;
}

export function fetchControls(orgSlug: string, engagementId: string) {
  const params = new URLSearchParams({ orgSlug, engagementId });
  return request<{ controls: Control[]; itgcGroups: ItgcGroup[]; deficiencies: Deficiency[] }>(`/list?${params.toString()}`);
}

export function upsertControl(payload: {
  orgSlug: string;
  engagementId: string;
  id?: string;
  cycle: string;
  objective: string;
  description?: string | null;
  frequency?: string | null;
  owner?: string | null;
  key?: boolean;
}) {
  return request<{ id: string }>(`/control/upsert`, {
    method: 'POST',
    body: JSON.stringify({
      orgSlug: payload.orgSlug,
      control: {
        id: payload.id,
        engagementId: payload.engagementId,
        cycle: payload.cycle,
        objective: payload.objective,
        description: payload.description,
        frequency: payload.frequency,
        owner: payload.owner,
        key: payload.key ?? false,
      },
    }),
  });
}

export function logControlWalkthrough(payload: {
  orgSlug: string;
  controlId: string;
  date: string;
  notes?: string | null;
  result: ControlWalkthroughResult;
  procedureId?: string | null;
}) {
  return request<{ success: boolean }>(`/control/walkthrough/log`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function runControlTest(payload: {
  orgSlug: string;
  controlId: string;
  attributes?: Record<string, unknown>;
  samplePlanRef?: string | null;
  result: ControlTestResult;
  severity?: DeficiencySeverity;
  recommendation?: string;
  procedureId?: string | null;
}) {
  return request<{ success: boolean }>(`/control/test/run`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function createDeficiency(payload: {
  orgSlug: string;
  engagementId: string;
  controlId?: string | null;
  severity: DeficiencySeverity;
  recommendation: string;
  status?: DeficiencyStatus;
  procedureId?: string | null;
}) {
  return request<{ success: boolean }>(`/deficiency/create`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function upsertItgcGroup(payload: {
  orgSlug: string;
  engagementId?: string | null;
  id?: string;
  type: ItgcType;
  scope?: string | null;
  notes?: string | null;
}) {
  return request<{ success: boolean }>(`/itgc/upsert`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
