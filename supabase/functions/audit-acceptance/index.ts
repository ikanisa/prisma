import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createSupabaseClientWithAuth } from '../_shared/supabase-client.ts';
import type { Database } from '../../../src/integrations/supabase/types.ts';
import { fetchAcceptanceStatus } from '../_shared/acceptance.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('API_ALLOWED_ORIGINS') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

type TypedClient = SupabaseClient<Database>;
type RoleLevel = Database['public']['Enums']['role_level'];
type AcceptanceStatus = Database['public']['Enums']['acceptance_status'];

type SupabaseUser = { id: string; email?: string };

const roleRank: Record<RoleLevel, number> = {
  EMPLOYEE: 1,
  MANAGER: 2,
  SYSTEM_ADMIN: 3,
};

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

async function createSupabaseClient(authHeader: string): Promise<TypedClient> {
  return createSupabaseClientWithAuth<Database>(authHeader);
}

async function getUser(client: TypedClient): Promise<SupabaseUser> {
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new HttpError(401, 'invalid_token');
  return { id: data.user.id, email: data.user.email ?? undefined };
}

async function getOrgContext(client: TypedClient, orgSlug: string | null, userId: string) {
  if (!orgSlug) throw new HttpError(400, 'org_slug_required');
  const { data: org, error: orgError } = await client
    .from('organizations')
    .select('id')
    .eq('slug', orgSlug)
    .maybeSingle();
  if (orgError) throw new HttpError(500, 'org_lookup_failed');
  if (!org) throw new HttpError(404, 'organization_not_found');

  const { data: membership, error: membershipError } = await client
    .from('memberships')
    .select('role')
    .eq('org_id', org.id)
    .eq('user_id', userId)
    .maybeSingle();
  if (membershipError) throw new HttpError(500, 'membership_lookup_failed');
  if (!membership) throw new HttpError(403, 'not_a_member');

  return { orgId: org.id, role: membership.role as RoleLevel };
}

function requireRole(current: RoleLevel, min: RoleLevel) {
  if (roleRank[current] < roleRank[min]) {
    throw new HttpError(403, 'insufficient_role');
  }
}

async function fetchEngagement(client: TypedClient, orgId: string, engagementId: string | null) {
  if (!engagementId) throw new HttpError(400, 'engagement_id_required');
  const { data, error } = await client
    .from('engagements')
    .select('id, org_id')
    .eq('id', engagementId)
    .maybeSingle();
  if (error) throw new HttpError(500, 'engagement_lookup_failed');
  if (!data || data.org_id !== orgId) throw new HttpError(404, 'engagement_not_found');
  return data;
}

async function logActivity(
  client: TypedClient,
  params: { orgId: string; userId: string; action: string; entityId: string; metadata?: Record<string, unknown> },
) {
  const { error } = await client.from('activity_log').insert({
    org_id: params.orgId,
    user_id: params.userId,
    action: params.action,
    entity_type: 'ACCEPTANCE',
    entity_id: params.entityId,
    metadata: params.metadata ?? {},
  });
  if (error) console.error('activity_log_error', error);
}

async function handleBackgroundRun(client: TypedClient, user: SupabaseUser, body: any) {
  const { orgId, role } = await getOrgContext(client, body.orgSlug ?? null, user.id);
  requireRole(role, 'EMPLOYEE');
  const clientId = body.clientId as string | undefined;
  if (!clientId) throw new HttpError(400, 'client_id_required');

  const screenings = body.screenings ?? {};
  const riskRating = body.riskRating ?? 'UNKNOWN';
  const notes = body.notes ?? null;

  const { data, error } = await client
    .from('client_background_checks')
    .upsert(
      {
        org_id: orgId,
        client_id: clientId,
        screenings,
        risk_rating: riskRating,
        notes,
        created_by_user_id: user.id,
      },
      { onConflict: 'org_id,client_id' },
    )
    .select('id')
    .single();
  if (error) throw new HttpError(500, 'background_check_failed');

  await logActivity(client, {
    orgId,
    userId: user.id,
    action: 'ACC_SCREEN_RUN',
    entityId: data.id,
    metadata: { riskRating },
  });

  return jsonResponse(200, { backgroundCheckId: data.id });
}

async function handleIndependenceAssess(client: TypedClient, user: SupabaseUser, body: any) {
  const { orgId, role } = await getOrgContext(client, body.orgSlug ?? null, user.id);
  requireRole(role, 'EMPLOYEE');
  const clientId = body.clientId as string | undefined;
  if (!clientId) throw new HttpError(400, 'client_id_required');

  const assessment = {
    org_id: orgId,
    client_id: clientId,
    threats: body.threats ?? [],
    safeguards: body.safeguards ?? [],
    conclusion: body.conclusion ?? 'OK',
    prepared_by_user_id: user.id,
  };

  const { data, error } = await client
    .from('independence_assessments')
    .upsert(assessment, { onConflict: 'org_id,client_id' })
    .select('id')
    .single();
  if (error) throw new HttpError(500, 'independence_save_failed');

  await logActivity(client, {
    orgId,
    userId: user.id,
    action: 'ACC_INDEP_ASSESSED',
    entityId: data.id,
    metadata: { conclusion: assessment.conclusion },
  });

  return jsonResponse(200, { assessmentId: data.id });
}

async function ensureApprovalStages(
  client: TypedClient,
  params: { orgId: string; engagementId: string; decisionId: string; createdBy: string },
) {
  const { data: existing, error } = await client
    .from('approval_queue')
    .select('stage')
    .eq('org_id', params.orgId)
    .eq('draft_id', params.decisionId)
    .eq('kind', 'ACCEPTANCE_DECISION');
  if (error) throw new HttpError(500, 'approval_lookup_failed');

  const requiredStages: Array<'PARTNER'> = ['PARTNER'];
  const stagesPresent = new Set(existing?.map((row) => row.stage));

  for (const stage of requiredStages) {
    if (!stagesPresent.has(stage)) {
      const { error: insertError } = await client.from('approval_queue').insert({
        org_id: params.orgId,
        engagement_id: params.engagementId,
        kind: 'ACCEPTANCE_DECISION',
        stage,
        draft_id: params.decisionId,
        created_by_user_id: params.createdBy,
        updated_by_user_id: params.createdBy,
        payload: { decisionId: params.decisionId, stage },
      });
      if (insertError) throw new HttpError(500, 'approval_queue_create_failed');
    }
  }
}

async function handleDecisionSubmit(client: TypedClient, user: SupabaseUser, body: any) {
  const { orgId, role } = await getOrgContext(client, body.orgSlug ?? null, user.id);
  requireRole(role, 'EMPLOYEE');
  const engagement = await fetchEngagement(client, orgId, body.engagementId ?? null);

  const decision = (body.decision as string | undefined)?.toUpperCase() ?? 'ACCEPT';
  const eqrRequired = Boolean(body.eqrRequired);
  const rationale = body.rationale ?? null;

  const { data, error } = await client
    .from('acceptance_decisions')
    .upsert(
      {
        org_id: orgId,
        engagement_id: engagement.id,
        decision,
        eqr_required: eqrRequired,
        rationale,
        status: 'DRAFT' as AcceptanceStatus,
        created_by_user_id: user.id,
        updated_by_user_id: user.id,
      },
      { onConflict: 'engagement_id' },
    )
    .select('id, status')
    .single();
  if (error) throw new HttpError(500, 'decision_save_failed');

  await ensureApprovalStages(client, {
    orgId,
    engagementId: engagement.id,
    decisionId: data.id,
    createdBy: user.id,
  });

  await logActivity(client, {
    orgId,
    userId: user.id,
    action: 'ACC_DECISION_SUBMITTED',
    entityId: data.id,
    metadata: { decision, eqrRequired },
  });

  return jsonResponse(200, { decisionId: data.id, status: data.status });
}

async function finalizeAcceptance(
  client: TypedClient,
  params: { orgId: string; engagementId: string; decisionId: string; approverId: string; approved: boolean },
) {
  const status: AcceptanceStatus = params.approved ? 'APPROVED' : 'REJECTED';
  const updates: Database['public']['Tables']['acceptance_decisions']['Update'] = {
    status,
    updated_by_user_id: params.approverId,
    approved_by_user_id: params.approved ? params.approverId : null,
    approved_at: params.approved ? new Date().toISOString() : null,
  };

  const { data, error } = await client
    .from('acceptance_decisions')
    .update(updates)
    .eq('id', params.decisionId)
    .select('engagement_id, eqr_required, decision')
    .single();
  if (error) throw new HttpError(500, 'decision_update_failed');

  if (params.approved) {
    const { error: engagementError } = await client
      .from('engagements')
      .update({ eqr_required: data.eqr_required })
      .eq('id', data.engagement_id);
    if (engagementError) throw new HttpError(500, 'engagement_update_failed');
  }

  await logActivity(client, {
    orgId: params.orgId,
    userId: params.approverId,
    action: params.approved ? 'ACC_DECISION_APPROVED' : 'ACC_DECISION_REJECTED',
    entityId: params.decisionId,
    metadata: { eqrRequired: data.eqr_required, decision: data.decision },
  });
}

async function handleDecisionDecide(client: TypedClient, user: SupabaseUser, body: any) {
  const { orgId, role } = await getOrgContext(client, body.orgSlug ?? null, user.id);
  requireRole(role, 'MANAGER');
  const engagement = await fetchEngagement(client, orgId, body.engagementId ?? null);

  const approvalId = body.approvalId as string | undefined;
  const decisionRaw = body.decision as string | undefined;
  const decision = decisionRaw ? decisionRaw.toUpperCase() : undefined;
  const note = body.note as string | undefined;

  if (!approvalId) throw new HttpError(400, 'approval_id_required');
  if (!decision || (decision !== 'APPROVED' && decision !== 'REJECTED')) {
    throw new HttpError(400, 'invalid_decision');
  }

  const { data: approval, error: approvalError } = await client
    .from('approval_queue')
    .select('*')
    .eq('org_id', orgId)
    .eq('id', approvalId)
    .maybeSingle();
  if (approvalError) throw new HttpError(500, 'approval_lookup_failed');
  if (!approval || approval.kind !== 'ACCEPTANCE_DECISION') throw new HttpError(404, 'approval_not_found');

  const { error: queueUpdateError } = await client
    .from('approval_queue')
    .update({
      status: decision,
      resolved_at: new Date().toISOString(),
      resolved_by_user_id: user.id,
      resolution_note: note ?? null,
    })
    .eq('id', approval.id);
  if (queueUpdateError) throw new HttpError(500, 'approval_update_failed');

  await finalizeAcceptance(client, {
    orgId,
    engagementId: engagement.id,
    decisionId: approval.draft_id!,
    approverId: user.id,
    approved: decision === 'APPROVED',
  });

  return jsonResponse(200, { decision });
}

async function handleStatus(client: TypedClient, user: SupabaseUser, url: URL) {
  const orgSlug = url.searchParams.get('orgSlug');
  const engagementId = url.searchParams.get('engagementId');
  const { orgId } = await getOrgContext(client, orgSlug, user.id);
  await fetchEngagement(client, orgId, engagementId);
  const snapshot = await fetchAcceptanceStatus(client, orgId, engagementId!);

  const result = {
    status: snapshot.status
      ? {
          id: snapshot.status.id,
          status: snapshot.status.status,
          decision: snapshot.status.decision,
          eqrRequired: snapshot.status.eqr_required,
          rationale: snapshot.status.rationale,
          approvedAt: snapshot.status.approved_at,
          updatedAt: snapshot.status.updated_at,
        }
      : null,
    background: snapshot.background
      ? {
          id: snapshot.background.id,
          clientId: snapshot.background.client_id,
          riskRating: snapshot.background.risk_rating,
          notes: snapshot.background.notes,
          screenings: snapshot.background.screenings ?? {},
          createdAt: snapshot.background.created_at,
        }
      : null,
    independence: snapshot.independence
      ? {
          id: snapshot.independence.id,
          clientId: snapshot.independence.client_id,
          threats: snapshot.independence.threats ?? [],
          safeguards: snapshot.independence.safeguards ?? [],
          conclusion: snapshot.independence.conclusion,
          preparedAt: snapshot.independence.prepared_at,
          updatedAt: snapshot.independence.updated_at,
        }
      : null,
    approvals: snapshot.approvals.map((approval) => ({
      id: approval.id,
      stage: approval.stage,
      status: approval.status,
      createdAt: approval.created_at,
      resolvedAt: approval.resolved_at,
      resolutionNote: approval.resolution_note,
    })),
  };

  return jsonResponse(200, result);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authHeader = req.headers.get('authorization') ?? req.headers.get('Authorization');
  if (!authHeader) return jsonResponse(401, { error: 'missing_authorization' });

  const client = await createSupabaseClient(authHeader);

  try {
    const user = await getUser(client);
    const url = new URL(req.url);
    const pathname = url.pathname.replace(/^\/audit-acceptance/, '') || '/';

    if (req.method === 'GET' && pathname === '/status') {
      return await handleStatus(client, user, url);
    }

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));

      if (pathname === '/background/run') return await handleBackgroundRun(client, user, body);
      if (pathname === '/independence/assess') return await handleIndependenceAssess(client, user, body);
      if (pathname === '/decision/submit') return await handleDecisionSubmit(client, user, body);
      if (pathname === '/decision/decide') return await handleDecisionDecide(client, user, body);
    }

    return jsonResponse(404, { error: 'not_found' });
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse(error.status, { error: error.message });
    }
    console.error('audit-acceptance-unhandled', error);
    return jsonResponse(500, { error: 'internal_error' });
  }
});
