import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { Database } from '../../src/integrations/supabase/types.ts';

type AcceptanceStatusEnum = Database['public']['Enums']['acceptance_status'];
type AcceptanceDecisionEnum = Database['public']['Enums']['acceptance_decision'];
type BackgroundRiskRating = Database['public']['Enums']['background_risk_rating'];
type IndependenceConclusion = Database['public']['Enums']['independence_conclusion'];
type ApprovalStage = Database['public']['Enums']['approval_stage'];
type ApprovalStatus = Database['public']['Enums']['approval_status'];

export interface AcceptanceDecisionSnapshot {
  id: string;
  status: AcceptanceStatusEnum;
  decision: AcceptanceDecisionEnum;
  eqr_required: boolean;
  rationale: string | null;
  approved_at: string | null;
  updated_at: string;
}

export interface BackgroundSnapshot {
  id: string;
  client_id: string;
  risk_rating: BackgroundRiskRating;
  notes: string | null;
  screenings: Record<string, unknown>;
  created_at: string;
}

export interface IndependenceSnapshot {
  id: string;
  client_id: string;
  threats: unknown[];
  safeguards: unknown[];
  conclusion: IndependenceConclusion;
  prepared_at: string;
  updated_at: string;
}

export interface ApprovalSnapshot {
  id: string;
  stage: ApprovalStage;
  status: ApprovalStatus;
  created_at: string;
  resolved_at: string | null;
  resolution_note: string | null;
}

export interface AcceptanceSnapshot {
  status: AcceptanceDecisionSnapshot | null;
  background: BackgroundSnapshot | null;
  independence: IndependenceSnapshot | null;
  approvals: ApprovalSnapshot[];
}

async function fetchEngagement(client: SupabaseClient<Database>, orgId: string, engagementId: string) {
  const { data, error } = await client
    .from('engagements')
    .select('id, org_id, client_id')
    .eq('id', engagementId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data || data.org_id !== orgId) {
    throw new Error('engagement_not_found');
  }

  return data;
}

export async function fetchAcceptanceStatus(
  client: SupabaseClient<Database>,
  orgId: string,
  engagementId: string,
): Promise<AcceptanceSnapshot> {
  const engagement = await fetchEngagement(client, orgId, engagementId);

  const { data: decisionData, error: decisionError } = await client
    .from('acceptance_decisions')
    .select('id, status, decision, eqr_required, rationale, approved_at, updated_at')
    .eq('org_id', orgId)
    .eq('engagement_id', engagementId)
    .maybeSingle();

  if (decisionError) {
    throw decisionError;
  }

  let background: BackgroundSnapshot | null = null;
  if (engagement.client_id) {
    const { data: backgroundData, error: backgroundError } = await client
      .from('client_background_checks')
      .select('id, client_id, risk_rating, notes, screenings, created_at')
      .eq('org_id', orgId)
      .eq('client_id', engagement.client_id)
      .maybeSingle();

    if (backgroundError) {
      throw backgroundError;
    }

    if (backgroundData) {
      background = {
        ...backgroundData,
        screenings: (backgroundData.screenings as Record<string, unknown>) ?? {},
      };
    }
  }

  let independence: IndependenceSnapshot | null = null;
  if (engagement.client_id) {
    const { data: independenceData, error: independenceError } = await client
      .from('independence_assessments')
      .select('id, client_id, threats, safeguards, conclusion, prepared_at, updated_at')
      .eq('org_id', orgId)
      .eq('client_id', engagement.client_id)
      .maybeSingle();

    if (independenceError) {
      throw independenceError;
    }

    if (independenceData) {
      independence = {
        ...independenceData,
        threats: (independenceData.threats as unknown[]) ?? [],
        safeguards: (independenceData.safeguards as unknown[]) ?? [],
      };
    }
  }

  let approvals: ApprovalSnapshot[] = [];
  if (decisionData) {
    const { data: approvalRows, error: approvalsError } = await client
      .from('approval_queue')
      .select('id, stage, status, created_at, resolved_at, resolution_note')
      .eq('org_id', orgId)
      .eq('engagement_id', engagementId)
      .eq('kind', 'ACCEPTANCE_DECISION')
      .eq('draft_id', decisionData.id)
      .order('created_at', { ascending: true });

    if (approvalsError) {
      throw approvalsError;
    }

    approvals = approvalRows ?? [];
  }

  return {
    status: decisionData ?? null,
    background,
    independence,
    approvals,
  };
}

export async function ensureAcceptanceApproved(
  client: SupabaseClient<Database>,
  orgId: string,
  engagementId: string,
) {
  const snapshot = await fetchAcceptanceStatus(client, orgId, engagementId);
  const decision = snapshot.status;
  if (!decision) {
    throw new Error('acceptance_required');
  }
  if (decision.status !== 'APPROVED' || decision.decision !== 'ACCEPT') {
    throw new Error('acceptance_not_approved');
  }
}
