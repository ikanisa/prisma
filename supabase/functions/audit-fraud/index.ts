import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createSupabaseClientWithAuth } from '../_shared/supabase-client.ts';
import type { Database } from '../../../src/integrations/supabase/types.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('API_ALLOWED_ORIGINS') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

type TypedClient = SupabaseClient<Database>;
type RoleLevel = Database['public']['Enums']['role_level'];
type FraudPlanStatus = Database['public']['Enums']['fraud_plan_status'];

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
    entity_type: 'FRAUD_PLAN',
    entity_id: params.entityId,
    metadata: params.metadata ?? {},
    module: 'FRAUD_PLAN',
    policy_pack: 'AP-GOV-1',
  });
  if (error) console.error('activity_log_error', error);
}

async function ensureFraudPlan(client: TypedClient, orgId: string, engagementId: string) {
  const { data, error } = await client
    .from('fraud_plans')
    .select('*')
    .eq('org_id', orgId)
    .eq('engagement_id', engagementId)
    .maybeSingle();
  if (error) throw new HttpError(500, 'fraud_plan_lookup_failed');
  return data ?? null;
}

async function upsertApprovalQueue(
  client: TypedClient,
  params: { orgId: string; engagementId: string; fraudPlanId: string; createdBy: string },
) {
  const { data, error } = await client
    .from('approval_queue')
    .select('id, status')
    .eq('org_id', params.orgId)
    .eq('engagement_id', params.engagementId)
    .eq('kind', 'FRAUD_PLAN_APPROVAL')
    .eq('context_json->>fraudPlanId', params.fraudPlanId)
    .maybeSingle();
  if (error) throw new HttpError(500, 'fraud_plan_approval_lookup_failed');

  if (data && data.status === 'PENDING') return data.id;

  const payload = { fraudPlanId: params.fraudPlanId };
  const { data: inserted, error: insertError } = await client
    .from('approval_queue')
    .insert({
      org_id: params.orgId,
      engagement_id: params.engagementId,
      kind: 'FRAUD_PLAN_APPROVAL',
      stage: 'PARTNER',
      status: 'PENDING',
      context_json: payload,
      created_by_user_id: params.createdBy,
      updated_by_user_id: params.createdBy,
      requested_by_user_id: params.createdBy,
    })
    .select('id')
    .single();
  if (insertError) throw new HttpError(500, 'fraud_plan_approval_create_failed');
  return inserted.id;
}

async function handleGet(client: TypedClient, orgId: string, engagementId: string) {
  const plan = await ensureFraudPlan(client, orgId, engagementId);

  const { data: actions, error: actionError } = await client
    .from('fraud_plan_actions')
    .select('*')
    .eq('org_id', orgId)
    .eq('engagement_id', engagementId)
    .order('created_at', { ascending: false });
  if (actionError) throw new HttpError(500, 'fraud_plan_actions_failed');

  const { data: jeStrategy, error: jeError } = await client
    .from('journal_entry_strategies')
    .select('*')
    .eq('org_id', orgId)
    .eq('engagement_id', engagementId)
    .maybeSingle();
  if (jeError) throw new HttpError(500, 'je_strategy_lookup_failed');

  return jsonResponse(200, {
    plan,
    actions: actions ?? [],
    journalEntryStrategy: jeStrategy ?? null,
  });
}

async function handlePlanUpsert(
  client: TypedClient,
  user: SupabaseUser,
  body: any,
  ctx: { orgId: string; engagementId: string },
) {
  const payload = {
    org_id: ctx.orgId,
    engagement_id: ctx.engagementId,
    brainstorming_notes: (body.brainstormingNotes as string | undefined)?.trim() ?? null,
    inherent_fraud_risks: body.inherentFraudRisks ?? [],
    fraud_responses: body.fraudResponses ?? [],
    analytics_strategy: body.analyticsStrategy ?? {},
    override_assessment: body.overrideAssessment ?? {},
    updated_by_user_id: user.id,
  } satisfies Partial<Database['public']['Tables']['fraud_plans']['Insert']>;

  const existing = await ensureFraudPlan(client, ctx.orgId, ctx.engagementId);

  if (existing) {
    const { data, error } = await client
      .from('fraud_plans')
      .update({ ...payload, status: existing.status === 'LOCKED' ? existing.status : 'DRAFT' })
      .eq('id', existing.id)
      .select('id, status')
      .single();
    if (error) throw new HttpError(500, 'fraud_plan_update_failed');

    await logActivity(client, {
      orgId: ctx.orgId,
      userId: user.id,
      action: 'FRAUD_PLAN_UPDATED',
      entityId: data.id,
      metadata: { status: data.status },
    });
    return jsonResponse(200, { id: data.id });
  }

  const insertPayload = {
    ...payload,
    created_by_user_id: user.id,
  } as Database['public']['Tables']['fraud_plans']['Insert'];

  const { data, error } = await client
    .from('fraud_plans')
    .insert(insertPayload)
    .select('id, status')
    .single();
  if (error) throw new HttpError(500, 'fraud_plan_create_failed');

  await logActivity(client, {
    orgId: ctx.orgId,
    userId: user.id,
    action: 'FRAUD_PLAN_CREATED',
    entityId: data.id,
    metadata: { status: data.status },
  });

  return jsonResponse(200, { id: data.id });
}

async function handlePlanSubmit(
  client: TypedClient,
  user: SupabaseUser,
  ctx: { orgId: string; engagementId: string },
) {
  const plan = await ensureFraudPlan(client, ctx.orgId, ctx.engagementId);
  if (!plan) throw new HttpError(409, 'fraud_plan_required');
  if (plan.status === 'LOCKED') throw new HttpError(409, 'fraud_plan_locked');

  const submittedAt = new Date().toISOString();
  const { data, error } = await client
    .from('fraud_plans')
    .update({ status: 'READY_FOR_APPROVAL', submitted_at: submittedAt })
    .eq('id', plan.id)
    .select('id')
    .single();
  if (error) throw new HttpError(500, 'fraud_plan_submit_failed');

  const approvalId = await upsertApprovalQueue(client, {
    orgId: ctx.orgId,
    engagementId: ctx.engagementId,
    fraudPlanId: plan.id,
    createdBy: user.id,
  });

  await logActivity(client, {
    orgId: ctx.orgId,
    userId: user.id,
    action: 'FRAUD_PLAN_SUBMITTED',
    entityId: data.id,
    metadata: { approvalId },
  });

  await client.from('fraud_plan_actions').insert({
    org_id: ctx.orgId,
    engagement_id: ctx.engagementId,
    fraud_plan_id: plan.id,
    action: 'SUBMITTED',
    metadata: { approvalId },
    created_by_user_id: user.id,
  });

  return jsonResponse(200, { approvalId });
}

async function handlePlanApprove(
  client: TypedClient,
  user: SupabaseUser,
  body: any,
  ctx: { orgId: string; engagementId: string },
) {
  const plan = await ensureFraudPlan(client, ctx.orgId, ctx.engagementId);
  if (!plan) throw new HttpError(409, 'fraud_plan_required');
  if (plan.status !== 'READY_FOR_APPROVAL') throw new HttpError(409, 'fraud_plan_not_pending');

  const approvalId = body.approvalId as string | undefined;
  if (!approvalId) throw new HttpError(400, 'approval_id_required');

  const decision = (body.decision as 'APPROVED' | 'REJECTED' | undefined) ?? 'APPROVED';

  const { error: queueUpdateError } = await client
    .from('approval_queue')
    .update({
      status: decision,
      resolved_at: new Date().toISOString(),
      resolved_by_user_id: user.id,
      resolution_note: body.note ?? null,
    })
    .eq('id', approvalId)
    .eq('org_id', ctx.orgId);
  if (queueUpdateError) throw new HttpError(500, 'fraud_plan_approval_queue_failed');

  if (decision === 'REJECTED') {
    const { error } = await client
      .from('fraud_plans')
      .update({ status: 'DRAFT', submitted_at: null })
      .eq('id', plan.id);
    if (error) throw new HttpError(500, 'fraud_plan_reset_failed');

    await logActivity(client, {
      orgId: ctx.orgId,
      userId: user.id,
      action: 'FRAUD_PLAN_REJECTED',
      entityId: plan.id,
      metadata: { approvalId },
    });

    await client.from('fraud_plan_actions').insert({
      org_id: ctx.orgId,
      engagement_id: ctx.engagementId,
      fraud_plan_id: plan.id,
      action: 'REJECTED',
      notes: body.note ?? null,
      created_by_user_id: user.id,
    });

    return jsonResponse(200, { status: 'REJECTED' });
  }

  const lockedAt = new Date().toISOString();
  const { error } = await client
    .from('fraud_plans')
    .update({ status: 'LOCKED', locked_at: lockedAt })
    .eq('id', plan.id);
  if (error) throw new HttpError(500, 'fraud_plan_lock_failed');

  await logActivity(client, {
    orgId: ctx.orgId,
    userId: user.id,
    action: 'FRAUD_PLAN_APPROVED',
    entityId: plan.id,
    metadata: { approvalId },
  });

  await client.from('fraud_plan_actions').insert({
    org_id: ctx.orgId,
    engagement_id: ctx.engagementId,
    fraud_plan_id: plan.id,
    action: 'APPROVED',
    notes: body.note ?? null,
    metadata: { approvalId },
    created_by_user_id: user.id,
  });

  return jsonResponse(200, { status: 'LOCKED' });
}

async function handleActionAdd(
  client: TypedClient,
  user: SupabaseUser,
  body: any,
  ctx: { orgId: string; engagementId: string },
) {
  const plan = await ensureFraudPlan(client, ctx.orgId, ctx.engagementId);
  if (!plan) throw new HttpError(409, 'fraud_plan_required');

  const { data, error } = await client
    .from('fraud_plan_actions')
    .insert({
      org_id: ctx.orgId,
      engagement_id: ctx.engagementId,
      fraud_plan_id: plan.id,
      action: (body.action as string | undefined)?.toUpperCase() ?? 'NOTE',
      notes: (body.notes as string | undefined)?.trim() ?? null,
      metadata: body.metadata ?? {},
      created_by_user_id: user.id,
    })
    .select('id')
    .single();
  if (error) throw new HttpError(500, 'fraud_plan_action_failed');

  await logActivity(client, {
    orgId: ctx.orgId,
    userId: user.id,
    action: 'FRAUD_PLAN_ACTION_RECORDED',
    entityId: plan.id,
    metadata: { actionId: data.id },
  });

  return jsonResponse(200, { id: data.id });
}

async function handleJeStrategyUpsert(
  client: TypedClient,
  user: SupabaseUser,
  body: any,
  ctx: { orgId: string; engagementId: string },
) {
  const payload = {
    org_id: ctx.orgId,
    engagement_id: ctx.engagementId,
    scope: body.scope ?? {},
    filters: body.filters ?? {},
    thresholds: body.thresholds ?? {},
    schedule: body.schedule ?? {},
    analytics_link: body.analyticsLink ?? {},
    owner_user_id: body.ownerUserId ?? null,
    updated_by_user_id: user.id,
  } satisfies Partial<Database['public']['Tables']['journal_entry_strategies']['Insert']>;

  const { data: existing, error: lookupError } = await client
    .from('journal_entry_strategies')
    .select('id')
    .eq('org_id', ctx.orgId)
    .eq('engagement_id', ctx.engagementId)
    .maybeSingle();
  if (lookupError) throw new HttpError(500, 'je_strategy_lookup_failed');

  if (existing) {
    const { data, error } = await client
      .from('journal_entry_strategies')
      .update(payload)
      .eq('id', existing.id)
      .select('id')
      .single();
    if (error) throw new HttpError(500, 'je_strategy_update_failed');

    await logActivity(client, {
      orgId: ctx.orgId,
      userId: user.id,
      action: 'JE_STRATEGY_UPDATED',
      entityId: data.id,
    });
    return jsonResponse(200, { id: data.id });
  }

  const insertPayload = {
    ...payload,
    created_by_user_id: user.id,
  } as Database['public']['Tables']['journal_entry_strategies']['Insert'];

  const { data, error } = await client
    .from('journal_entry_strategies')
    .insert(insertPayload)
    .select('id')
    .single();
  if (error) throw new HttpError(500, 'je_strategy_create_failed');

  await logActivity(client, {
    orgId: ctx.orgId,
    userId: user.id,
    action: 'JE_STRATEGY_UPDATED',
    entityId: data.id,
  });

  return jsonResponse(200, { id: data.id });
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
    const pathname = url.pathname.replace(/^\/audit-fraud/, '') || '/';

    const orgSlug = url.searchParams.get('orgSlug') ?? null;
    const engagementId = url.searchParams.get('engagementId') ?? null;

    const { orgId, role } = await getOrgContext(client, orgSlug, user.id);
    const engagement = await fetchEngagement(client, orgId, engagementId);

    if (req.method === 'GET' && pathname === '/') {
      return await handleGet(client, orgId, engagement.id);
    }

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      const ctx = { orgId, engagementId: engagement.id };

      if (pathname === '/fraud-plan/upsert') {
        requireRole(role, 'EMPLOYEE');
        return await handlePlanUpsert(client, user, body, ctx);
      }

      if (pathname === '/fraud-plan/submit') {
        requireRole(role, 'MANAGER');
        return await handlePlanSubmit(client, user, ctx);
      }

      if (pathname === '/fraud-plan/approve') {
        requireRole(role, 'PARTNER');
        return await handlePlanApprove(client, user, body, ctx);
      }

      if (pathname === '/fraud-plan/action') {
        requireRole(role, 'EMPLOYEE');
        return await handleActionAdd(client, user, body, ctx);
      }

      if (pathname === '/je-strategy/upsert') {
        requireRole(role, 'EMPLOYEE');
        return await handleJeStrategyUpsert(client, user, body, ctx);
      }
    }

    return jsonResponse(404, { error: 'not_found' });
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse(error.status, { error: error.message });
    }
    console.error('audit-fraud-unhandled', error);
    return jsonResponse(500, { error: 'internal_error' });
  }
});
