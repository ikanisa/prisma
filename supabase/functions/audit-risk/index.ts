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
type RiskStatus = Database['public']['Enums']['risk_status'];
type RiskRating = Database['public']['Enums']['risk_rating'];
type RiskCategory = Database['public']['Enums']['audit_risk_category'];

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
    entity_type: 'AUDIT_RISK',
    entity_id: params.entityId,
    metadata: params.metadata ?? {},
    module: 'AUDIT_RISK',
    policy_pack: 'AP-GOV-1',
  });
  if (error) console.error('activity_log_error', error);
}

async function handleList(client: TypedClient, orgId: string, engagementId: string) {
  const { data: risks, error: riskError } = await client
    .from('audit_risks')
    .select('*')
    .eq('org_id', orgId)
    .eq('engagement_id', engagementId)
    .order('updated_at', { ascending: false });
  if (riskError) throw new HttpError(500, 'risk_lookup_failed');

  const { data: signals, error: signalError } = await client
    .from('audit_risk_signals')
    .select('*')
    .eq('org_id', orgId)
    .eq('engagement_id', engagementId)
    .order('detected_at', { ascending: false });
  if (signalError) throw new HttpError(500, 'risk_signal_lookup_failed');

  const { data: activity, error: activityError } = await client
    .from('audit_risk_activity')
    .select('*')
    .eq('org_id', orgId)
    .eq('engagement_id', engagementId)
    .order('created_at', { ascending: false });
  if (activityError) throw new HttpError(500, 'risk_activity_lookup_failed');

  return jsonResponse(200, {
    risks: risks ?? [],
    signals: signals ?? [],
    activity: activity ?? [],
  });
}

async function handleRiskUpsert(
  client: TypedClient,
  user: SupabaseUser,
  body: any,
  ctx: { orgId: string; engagementId: string },
) {
  const payload = {
    org_id: ctx.orgId,
    engagement_id: ctx.engagementId,
    code: (body.code as string | undefined)?.trim() || null,
    title: (body.title as string | undefined)?.trim(),
    description: (body.description as string | undefined)?.trim() ?? null,
    category: body.category as RiskCategory,
    assertions: Array.isArray(body.assertions)
      ? (body.assertions as string[]).map((entry) => String(entry))
      : [],
    likelihood: (body.likelihood as RiskRating | undefined) ?? 'MODERATE',
    impact: (body.impact as RiskRating | undefined) ?? 'MODERATE',
    inherent_rating: (body.inherentRating as RiskRating | undefined) ?? 'MODERATE',
    residual_rating: (body.residualRating as RiskRating | undefined) ?? null,
    status: (body.status as RiskStatus | undefined) ?? 'OPEN',
    source: (body.source as string | undefined)?.toUpperCase() ?? 'ANALYTICS',
    analytics_summary: body.analyticsSummary ?? {},
    owner_user_id: body.ownerUserId ?? null,
    updated_by_user_id: user.id,
  } satisfies Partial<Database['public']['Tables']['audit_risks']['Insert']>;

  if (!payload.title) throw new HttpError(400, 'title_required');
  if (!payload.category) throw new HttpError(400, 'category_required');

  const riskId = body.id as string | undefined;
  if (riskId) {
    const { data, error } = await client
      .from('audit_risks')
      .update(payload)
      .eq('id', riskId)
      .eq('org_id', ctx.orgId)
      .select('id')
      .single();
    if (error) throw new HttpError(500, 'risk_update_failed');

    await logActivity(client, {
      orgId: ctx.orgId,
      userId: user.id,
      action: 'RISK_UPDATED',
      entityId: data.id,
      metadata: { title: payload.title, status: payload.status },
    });
    return jsonResponse(200, { id: data.id });
  }

  const insertPayload = {
    ...payload,
    created_by_user_id: user.id,
  } as Database['public']['Tables']['audit_risks']['Insert'];

  const { data, error } = await client
    .from('audit_risks')
    .insert(insertPayload)
    .select('id')
    .single();
  if (error) throw new HttpError(500, 'risk_create_failed');

  await logActivity(client, {
    orgId: ctx.orgId,
    userId: user.id,
    action: 'RISK_CREATED',
    entityId: data.id,
    metadata: { title: payload.title, category: payload.category },
  });

  return jsonResponse(200, { id: data.id });
}

async function handleRiskStatus(
  client: TypedClient,
  user: SupabaseUser,
  body: any,
  ctx: { orgId: string; engagementId: string },
) {
  const riskId = body.id as string | undefined;
  if (!riskId) throw new HttpError(400, 'risk_id_required');
  const status = body.status as RiskStatus | undefined;
  if (!status) throw new HttpError(400, 'status_required');

  const fields: Partial<Database['public']['Tables']['audit_risks']['Update']> = {
    status,
    residual_rating: (body.residualRating as RiskRating | undefined) ?? null,
    updated_by_user_id: user.id,
  };

  const { error } = await client
    .from('audit_risks')
    .update(fields)
    .eq('id', riskId)
    .eq('org_id', ctx.orgId);
  if (error) throw new HttpError(500, 'risk_status_update_failed');

  await logActivity(client, {
    orgId: ctx.orgId,
    userId: user.id,
    action: 'RISK_STATUS_CHANGED',
    entityId: riskId,
    metadata: { status, residualRating: fields.residual_rating },
  });

  await client.from('audit_risk_activity').insert({
    org_id: ctx.orgId,
    engagement_id: ctx.engagementId,
    risk_id: riskId,
    action: 'STATUS_CHANGED',
    notes: body.note ?? null,
    metadata: {
      status,
      residualRating: fields.residual_rating,
    },
    created_by_user_id: user.id,
  });

  return jsonResponse(200, { status });
}

async function handleSignalRecord(
  client: TypedClient,
  user: SupabaseUser,
  body: any,
  ctx: { orgId: string; engagementId: string },
) {
  const signal = {
    org_id: ctx.orgId,
    engagement_id: ctx.engagementId,
    risk_id: (body.riskId as string | undefined) ?? null,
    signal_type: (body.signalType as string | undefined)?.toUpperCase() ?? 'ANALYTICS',
    source: (body.source as string | undefined)?.toUpperCase() ?? 'SYSTEM',
    severity: (body.severity as RiskRating | undefined) ?? 'MODERATE',
    metric: body.metric ?? {},
    detected_at: body.detectedAt ?? new Date().toISOString(),
    created_by_user_id: user.id,
  } satisfies Database['public']['Tables']['audit_risk_signals']['Insert'];

  const { data, error } = await client
    .from('audit_risk_signals')
    .insert(signal)
    .select('id, risk_id')
    .single();
  if (error) throw new HttpError(500, 'risk_signal_record_failed');

  if (data.risk_id) {
    await client
      .from('audit_risks')
      .update({
        analytics_summary: {
          lastSignalType: signal.signal_type,
          lastSeverity: signal.severity,
          lastDetectedAt: signal.detected_at,
        },
        updated_by_user_id: user.id,
      })
      .eq('id', data.risk_id)
      .eq('org_id', ctx.orgId);
  }

  await logActivity(client, {
    orgId: ctx.orgId,
    userId: user.id,
    action: 'RISK_SIGNAL_RECORDED',
    entityId: data.risk_id ?? data.id,
    metadata: { signalType: signal.signal_type, severity: signal.severity },
  });

  return jsonResponse(200, { id: data.id });
}

async function handleActivityAdd(
  client: TypedClient,
  user: SupabaseUser,
  body: any,
  ctx: { orgId: string; engagementId: string },
) {
  const riskId = body.riskId as string | undefined;
  if (!riskId) throw new HttpError(400, 'risk_id_required');

  const { data, error } = await client
    .from('audit_risk_activity')
    .insert({
      org_id: ctx.orgId,
      engagement_id: ctx.engagementId,
      risk_id: riskId,
      action: (body.action as string | undefined)?.toUpperCase() ?? 'NOTE',
      notes: (body.notes as string | undefined)?.trim() ?? null,
      metadata: body.metadata ?? {},
      created_by_user_id: user.id,
    })
    .select('id')
    .single();
  if (error) throw new HttpError(500, 'risk_activity_create_failed');

  await logActivity(client, {
    orgId: ctx.orgId,
    userId: user.id,
    action: 'RISK_ACTIVITY_RECORDED',
    entityId: riskId,
    metadata: { activityId: data.id },
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
    const pathname = url.pathname.replace(/^\/audit-risk/, '') || '/';

    const orgSlug = url.searchParams.get('orgSlug') ?? null;
    const engagementId = url.searchParams.get('engagementId') ?? null;

    const { orgId, role } = await getOrgContext(client, orgSlug, user.id);
    const engagement = await fetchEngagement(client, orgId, engagementId);

    if (req.method === 'GET' && pathname === '/') {
      return await handleList(client, orgId, engagement.id);
    }

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      const ctx = { orgId, engagementId: engagement.id };

      if (pathname === '/risk/upsert') {
        requireRole(role, 'EMPLOYEE');
        return await handleRiskUpsert(client, user, body, ctx);
      }

      if (pathname === '/risk/status') {
        requireRole(role, 'MANAGER');
        return await handleRiskStatus(client, user, body, ctx);
      }

      if (pathname === '/signal/record') {
        requireRole(role, 'EMPLOYEE');
        return await handleSignalRecord(client, user, body, ctx);
      }

      if (pathname === '/activity/add') {
        requireRole(role, 'EMPLOYEE');
        return await handleActivityAdd(client, user, body, ctx);
      }
    }

    return jsonResponse(404, { error: 'not_found' });
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse(error.status, { error: error.message });
    }
    console.error('audit-risk-unhandled', error);
    return jsonResponse(500, { error: 'internal_error' });
  }
});
