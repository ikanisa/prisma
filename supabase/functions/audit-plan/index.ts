import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { Database } from '../../../src/integrations/supabase/types.ts';
import { createSupabaseClientWithAuth } from '../_shared/supabase-client.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('API_ALLOWED_ORIGINS') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

type TypedClient = SupabaseClient<Database>;
type RoleLevel = Database['public']['Enums']['role_level'];
type ApprovalStatus = Database['public']['Enums']['approval_status'];

type SupabaseUser = { id: string; email?: string | null };

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
  return { id: data.user.id, email: data.user.email };
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
    entity_type: 'AUDIT_PLAN',
    entity_id: params.entityId,
    metadata: params.metadata ?? {},
  });
  if (error) console.error('activity_log_error', error);
}

async function ensurePlan(client: TypedClient, orgId: string, engagementId: string) {
  const { data, error } = await client
    .from('audit_plans')
    .select('*')
    .eq('org_id', orgId)
    .eq('engagement_id', engagementId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new HttpError(500, 'plan_lookup_failed');
  return data ?? null;
}

function assertPlanMutable(plan: Database['public']['Tables']['audit_plans']['Row'] | null) {
  if (plan && plan.status === 'LOCKED') {
    throw new HttpError(409, 'plan_locked');
  }
}

async function recordPlanChange(
  client: TypedClient,
  params: {
    orgId: string;
    engagementId: string;
    planId: string;
    userId: string;
    reason: string;
    impact: Record<string, unknown>;
  },
) {
  const { error } = await client.from('plan_change_log').insert({
    org_id: params.orgId,
    engagement_id: params.engagementId,
    plan_id: params.planId,
    changed_by_user_id: params.userId,
    reason: params.reason,
    impact: params.impact,
  });
  if (error) console.error('plan_change_log_error', error);
}

async function fetchApprovalQueue(
  client: TypedClient,
  params: { orgId: string; engagementId: string; planId: string },
) {
  const { data, error } = await client
    .from('approval_queue')
    .select('id, stage, status, context_json, created_at, resolved_at, resolved_by_user_id')
    .eq('org_id', params.orgId)
    .eq('engagement_id', params.engagementId)
    .eq('kind', 'AUDIT_PLAN_FREEZE')
    .eq('context_json->>planId', params.planId)
    .order('created_at', { ascending: false });
  if (error) throw new HttpError(500, 'approval_lookup_failed');
  return data ?? [];
}

async function handleGet(client: TypedClient, user: SupabaseUser, url: URL) {
  const orgSlug = url.searchParams.get('orgSlug');
  const engagementId = url.searchParams.get('engagementId');
  const { orgId } = await getOrgContext(client, orgSlug, user.id);
  await fetchEngagement(client, orgId, engagementId);

  const plan = await ensurePlan(client, orgId, engagementId!);
  const planId = plan?.id ?? null;

  const { data: materiality, error: materialityError } = await client
    .from('materiality_sets')
    .select('*')
    .eq('org_id', orgId)
    .eq('engagement_id', engagementId)
    .maybeSingle();
  if (materialityError) throw new HttpError(500, 'materiality_lookup_failed');

  const { data: changeLog, error: changeLogError } = planId
    ? await client
        .from('plan_change_log')
        .select('*')
        .eq('org_id', orgId)
        .eq('plan_id', planId)
        .order('created_at', { ascending: false })
      : { data: [], error: null };
  if (changeLogError) throw new HttpError(500, 'plan_history_failed');

  const approvals = planId ? await fetchApprovalQueue(client, { orgId, engagementId: engagementId!, planId }) : [];

  return jsonResponse(200, {
    plan,
    materiality,
    changeLog,
    approvals,
  });
}

async function handleStrategyUpsert(client: TypedClient, user: SupabaseUser, body: any) {
  const { orgId, role } = await getOrgContext(client, body.orgSlug ?? null, user.id);
  requireRole(role, 'EMPLOYEE');
  const engagement = await fetchEngagement(client, orgId, body.engagementId ?? null);

  const basisFramework = (body.basisFramework as string | undefined)?.trim();
  if (!basisFramework) throw new HttpError(400, 'basis_framework_required');
  const strategy = body.strategy ?? {};

  const existing = await ensurePlan(client, orgId, engagement.id);
  assertPlanMutable(existing);

  let planId: string;
  if (existing) {
    const { data, error } = await client
      .from('audit_plans')
      .update({
        basis_framework: basisFramework,
        strategy,
        status: 'DRAFT',
        submitted_at: null,
        approvals: [],
        locked_at: null,
        locked_by_user_id: null,
      })
      .eq('id', existing.id)
      .select('id')
      .single();
    if (error) throw new HttpError(500, 'plan_update_failed');
    planId = data.id;
    await logActivity(client, {
      orgId,
      userId: user.id,
      action: 'PLAN_STRATEGY_UPDATED',
      entityId: planId,
      metadata: { basisFramework },
    });
    await recordPlanChange(client, {
      orgId,
      engagementId: engagement.id,
      planId,
      userId: user.id,
      reason: 'STRATEGY_UPDATED',
      impact: { basisFramework, status: 'DRAFT' },
    });
  } else {
    const { data, error } = await client
      .from('audit_plans')
      .insert({
        org_id: orgId,
        engagement_id: engagement.id,
        basis_framework: basisFramework,
        strategy,
        created_by_user_id: user.id,
      })
      .select('id')
      .single();
    if (error) throw new HttpError(500, 'plan_create_failed');
    planId = data.id;
    await logActivity(client, {
      orgId,
      userId: user.id,
      action: 'PLAN_CREATED',
      entityId: planId,
      metadata: { basisFramework },
    });
    await recordPlanChange(client, {
      orgId,
      engagementId: engagement.id,
      planId,
      userId: user.id,
      reason: 'STRATEGY_CREATED',
      impact: { basisFramework },
    });
  }

  return jsonResponse(200, { planId });
}

async function handleMaterialitySet(client: TypedClient, user: SupabaseUser, body: any) {
  const { orgId, role } = await getOrgContext(client, body.orgSlug ?? null, user.id);
  requireRole(role, 'EMPLOYEE');
  const engagement = await fetchEngagement(client, orgId, body.engagementId ?? null);

  const plan = await ensurePlan(client, orgId, engagement.id);
  assertPlanMutable(plan);
  const planId = plan?.id ?? null;
  if (!planId) throw new HttpError(409, 'plan_strategy_required');

  const fsMateriality = Number(body.fsMateriality ?? NaN);
  const performanceMateriality = Number(body.performanceMateriality ?? NaN);
  const ctt = Number(body.clearlyTrivialThreshold ?? NaN);
  if (!Number.isFinite(fsMateriality) || fsMateriality <= 0) throw new HttpError(400, 'invalid_fs_materiality');
  if (!Number.isFinite(performanceMateriality) || performanceMateriality <= 0) throw new HttpError(400, 'invalid_performance_materiality');
  if (!Number.isFinite(ctt) || ctt < 0) throw new HttpError(400, 'invalid_ctt');

  const payload = {
    fs_materiality: fsMateriality,
    performance_materiality: performanceMateriality,
    clearly_trivial_threshold: ctt,
    benchmarks: body.benchmarks ?? [],
    rationale: body.rationale ?? null,
    prepared_by_user_id: user.id,
  } satisfies Partial<Database['public']['Tables']['materiality_sets']['Insert']>;

  const existing = await client
    .from('materiality_sets')
    .select('id')
    .eq('org_id', orgId)
    .eq('engagement_id', engagement.id)
    .maybeSingle();

  let materialityId: string;
  if (existing.data) {
    const { data, error } = await client
      .from('materiality_sets')
      .update({ ...payload, prepared_at: new Date().toISOString() })
      .eq('id', existing.data.id)
      .select('id')
      .single();
    if (error) throw new HttpError(500, 'materiality_update_failed');
    materialityId = data.id;
  } else {
    const { data, error } = await client
      .from('materiality_sets')
      .insert({
        org_id: orgId,
        engagement_id: engagement.id,
        ...payload,
      })
      .select('id')
      .single();
    if (error) throw new HttpError(500, 'materiality_create_failed');
    materialityId = data.id;
  }

  await logActivity(client, {
    orgId,
    userId: user.id,
    action: 'MATERIALITY_SET',
    entityId: materialityId,
    metadata: {
      fsMateriality,
      performanceMateriality,
      ctt,
    },
  });

  await recordPlanChange(client, {
    orgId,
    engagementId: engagement.id,
    planId,
    userId: user.id,
    reason: 'MATERIALITY_UPDATED',
    impact: {
      fsMateriality,
      performanceMateriality,
      ctt,
    },
  });

  return jsonResponse(200, { materialityId });
}

async function upsertApprovalQueue(
  client: TypedClient,
  params: { orgId: string; engagementId: string; planId: string; createdBy: string },
) {
  const { data, error } = await client
    .from('approval_queue')
    .select('id, status')
    .eq('org_id', params.orgId)
    .eq('engagement_id', params.engagementId)
    .eq('kind', 'AUDIT_PLAN_FREEZE')
    .eq('context_json->>planId', params.planId)
    .maybeSingle();
  if (error) throw new HttpError(500, 'approval_lookup_failed');

  if (data && (data.status as ApprovalStatus) === 'PENDING') {
    return data.id;
  }

  const payload = { planId: params.planId, stage: 'PARTNER' };
  const { data: inserted, error: insertError } = await client
    .from('approval_queue')
    .insert({
      org_id: params.orgId,
      engagement_id: params.engagementId,
      kind: 'AUDIT_PLAN_FREEZE',
      stage: 'PARTNER',
      context_json: payload,
      created_by_user_id: params.createdBy,
      updated_by_user_id: params.createdBy,
      requested_by_user_id: params.createdBy,
    })
    .select('id')
    .single();
  if (insertError) throw new HttpError(500, 'approval_queue_create_failed');
  return inserted.id;
}

async function handleSubmitForApproval(client: TypedClient, user: SupabaseUser, body: any) {
  const { orgId, role } = await getOrgContext(client, body.orgSlug ?? null, user.id);
  requireRole(role, 'MANAGER');
  const engagement = await fetchEngagement(client, orgId, body.engagementId ?? null);

  const plan = await ensurePlan(client, orgId, engagement.id);
  if (!plan) throw new HttpError(409, 'plan_required');
  if (plan.status === 'LOCKED') throw new HttpError(409, 'plan_locked');

  const { data: materiality, error: materialityError } = await client
    .from('materiality_sets')
    .select('id')
    .eq('org_id', orgId)
    .eq('engagement_id', engagement.id)
    .maybeSingle();
  if (materialityError) throw new HttpError(500, 'materiality_lookup_failed');
  if (!materiality) throw new HttpError(409, 'materiality_required');

  const { data, error } = await client
    .from('audit_plans')
    .update({
      status: 'READY_FOR_APPROVAL',
      submitted_at: new Date().toISOString(),
      approvals: [
        {
          stage: 'PARTNER',
          status: 'PENDING',
          submittedAt: new Date().toISOString(),
        },
      ],
    })
    .eq('id', plan.id)
    .select('id')
    .single();
  if (error) throw new HttpError(500, 'plan_submit_failed');

  const approvalId = await upsertApprovalQueue(client, {
    orgId,
    engagementId: engagement.id,
    planId: plan.id,
    createdBy: user.id,
  });

  await logActivity(client, {
    orgId,
    userId: user.id,
    action: 'PLAN_SUBMITTED',
    entityId: data.id,
    metadata: { approvalId },
  });

  await recordPlanChange(client, {
    orgId,
    engagementId: engagement.id,
    planId: plan.id,
    userId: user.id,
    reason: 'SUBMITTED_FOR_APPROVAL',
    impact: { approvalId },
  });

  return jsonResponse(200, { approvalId });
}

async function handleApprovalDecision(client: TypedClient, user: SupabaseUser, body: any) {
  const { orgId, role } = await getOrgContext(client, body.orgSlug ?? null, user.id);
  requireRole(role, 'PARTNER');
  const engagement = await fetchEngagement(client, orgId, body.engagementId ?? null);

  const plan = await ensurePlan(client, orgId, engagement.id);
  if (!plan) throw new HttpError(409, 'plan_required');
  if (plan.status !== 'READY_FOR_APPROVAL') throw new HttpError(409, 'plan_not_pending');

  const approvalId = body.approvalId as string | undefined;
  if (!approvalId) throw new HttpError(400, 'approval_id_required');

  const decision = body.decision as ApprovalStatus | undefined;
  if (!decision || (decision !== 'APPROVED' && decision !== 'REJECTED')) {
    throw new HttpError(400, 'invalid_decision');
  }

  const note = body.note as string | undefined;

  const { data: queueRow, error: queueError } = await client
    .from('approval_queue')
    .select('id, status')
    .eq('id', approvalId)
    .eq('org_id', orgId)
    .maybeSingle();
  if (queueError) throw new HttpError(500, 'approval_lookup_failed');
  if (!queueRow) throw new HttpError(404, 'approval_not_found');

  const { error: updateQueueError } = await client
    .from('approval_queue')
    .update({
      status: decision,
      resolved_at: new Date().toISOString(),
      resolved_by_user_id: user.id,
      resolution_note: note ?? null,
    })
    .eq('id', approvalId);
  if (updateQueueError) throw new HttpError(500, 'approval_update_failed');

  if (decision === 'REJECTED') {
    const { error: planUpdateError } = await client
      .from('audit_plans')
      .update({
        status: 'DRAFT',
        approvals: [],
        submitted_at: null,
      })
      .eq('id', plan.id);
    if (planUpdateError) throw new HttpError(500, 'plan_reset_failed');

    await recordPlanChange(client, {
      orgId,
      engagementId: engagement.id,
      planId: plan.id,
      userId: user.id,
      reason: 'APPROVAL_REJECTED',
      impact: { approvalId, note },
    });

    await logActivity(client, {
      orgId,
      userId: user.id,
      action: 'PLAN_APPROVAL_REJECTED',
      entityId: plan.id,
      metadata: { approvalId },
    });

    return jsonResponse(200, { status: 'REJECTED' });
  }

  const lockedAt = new Date().toISOString();
  const { error: lockError } = await client
    .from('audit_plans')
    .update({
      status: 'LOCKED',
      locked_at: lockedAt,
      locked_by_user_id: user.id,
      approvals: [
        {
          stage: 'PARTNER',
          status: 'APPROVED',
          approvedAt: lockedAt,
          approvedBy: user.id,
        },
      ],
    })
    .eq('id', plan.id);
  if (lockError) throw new HttpError(500, 'plan_lock_failed');

  await recordPlanChange(client, {
    orgId,
    engagementId: engagement.id,
    planId: plan.id,
    userId: user.id,
    reason: 'PLAN_LOCKED',
    impact: { approvalId },
  });

  await logActivity(client, {
    orgId,
    userId: user.id,
    action: 'PLAN_APPROVED',
    entityId: plan.id,
    metadata: { approvalId },
  });

  await logActivity(client, {
    orgId,
    userId: user.id,
    action: 'PLAN_LOCKED',
    entityId: plan.id,
    metadata: { approvalId },
  });

  return jsonResponse(200, { status: 'LOCKED' });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new HttpError(401, 'missing_auth_header');

    const client = await createSupabaseClient(authHeader);
    const user = await getUser(client);
    const url = new URL(req.url);
    const pathname = url.pathname.replace(/^\/audit-plan/, '') || '/';

    if (req.method === 'GET' && pathname === '/status') {
      return await handleGet(client, user, url);
    }

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));

      if (pathname === '/strategy/upsert') {
        return await handleStrategyUpsert(client, user, body);
      }
      if (pathname === '/materiality/set') {
        return await handleMaterialitySet(client, user, body);
      }
      if (pathname === '/plan/submit') {
        return await handleSubmitForApproval(client, user, body);
      }
      if (pathname === '/plan/approve') {
        return await handleApprovalDecision(client, user, body);
      }
    }

    return jsonResponse(404, { error: 'not_found' });
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse(error.status, { error: error.message });
    }
    console.error('audit-plan-unhandled', error);
    return jsonResponse(500, { error: 'internal_error' });
  }
});
