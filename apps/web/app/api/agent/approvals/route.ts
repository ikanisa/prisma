import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '../../../../lib/supabase/server';
import type { Database } from '@/integrations/supabase/types';

type ApprovalRow = Database['public']['Tables']['approval_queue']['Row'];

type NormalisedApproval = {
  id: string;
  orgId: string;
  kind: string;
  stage: Database['public']['Enums']['approval_stage'];
  status: Database['public']['Enums']['approval_status'];
  requestedAt: string;
  requestedByUserId: string | null;
  approvedByUserId: string | null;
  decisionAt: string | null;
  decisionComment: string | null;
  sessionId: string | null;
  actionId: string | null;
  toolKey?: string;
  description?: string;
  orgSlug?: string;
  standards?: string[];
  evidenceCount?: number;
  context: Record<string, unknown>;
};

function normaliseApproval(row: ApprovalRow): NormalisedApproval {
  const context = (row.context_json ?? {}) as Record<string, unknown>;
  const toolKey = typeof context.toolKey === 'string' ? context.toolKey : undefined;
  const description = typeof context.description === 'string' ? context.description : undefined;
  const orgSlug = typeof context.orgSlug === 'string' ? context.orgSlug : undefined;
  const standards = Array.isArray(context.standardsRefs)
    ? (context.standardsRefs as unknown[]).filter((item): item is string => typeof item === 'string')
    : undefined;
  const evidenceRefs = Array.isArray(context.evidenceRefs) ? (context.evidenceRefs as unknown[]) : [];

  return {
    id: row.id,
    orgId: row.org_id,
    kind: row.kind,
    stage: row.stage,
    status: row.status,
    requestedAt: row.requested_at,
    requestedByUserId: row.requested_by_user_id,
    approvedByUserId: row.approved_by_user_id,
    decisionAt: row.decision_at,
    decisionComment: row.decision_comment,
    sessionId: row.session_id,
    actionId: row.action_id,
    toolKey,
    description,
    orgSlug,
    standards,
    evidenceCount: evidenceRefs.length,
    context,
  };
}

export async function GET(request: NextRequest) {
  const supabase = getSupabaseServiceClient();
  const orgId = request.nextUrl.searchParams.get('orgId');

  if (!orgId) {
    return NextResponse.json({ error: 'orgId query parameter is required.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('approval_queue')
    .select(
      'id, org_id, kind, stage, status, requested_at, requested_by_user_id, approved_by_user_id, decision_at, decision_comment, context_json, session_id, action_id'
    )
    .eq('org_id', orgId)
    .order('requested_at', { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const approvals = (data ?? []).map(normaliseApproval);
  const pending = approvals.filter((item) => item.status === 'PENDING');
  const history = approvals.filter((item) => item.status !== 'PENDING');

  return NextResponse.json({ pending, history });
}
