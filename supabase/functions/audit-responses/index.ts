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
type ResponseType = Database['public']['Enums']['response_type'];
type ResponseStatus = Database['public']['Enums']['response_status'];

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
    entity_type: 'AUDIT_RESPONSE',
    entity_id: params.entityId,
    metadata: params.metadata ?? {},
    module: 'AUDIT_RESPONSE',
    policy_pack: 'AP-GOV-1',
  });
  if (error) console.error('activity_log_error', error);
}

async function handleList(client: TypedClient, orgId: string, engagementId: string) {
  const { data: responses, error: responsesError } = await client
    .from('audit_responses')
    .select('*')
    .eq('org_id', orgId)
    .eq('engagement_id', engagementId)
    .order('updated_at', { ascending: false });
  if (responsesError) throw new HttpError(500, 'response_lookup_failed');

  const { data: checks, error: checksError } = await client
    .from('audit_response_checks')
    .select('*')
    .eq('org_id', orgId)
    .eq('engagement_id', engagementId)
    .order('created_at', { ascending: false });
  if (checksError) throw new HttpError(500, 'response_check_lookup_failed');

  return jsonResponse(200, {
    responses: responses ?? [],
    checks: checks ?? [],
  });
}

async function handleResponseUpsert(
  client: TypedClient,
  user: SupabaseUser,
  body: any,
  ctx: { orgId: string; engagementId: string },
) {
  const payload = {
    org_id: ctx.orgId,
    engagement_id: ctx.engagementId,
    risk_id: body.riskId as string,
    response_type: (body.responseType as ResponseType | undefined) ?? 'CONTROL',
    title: (body.title as string | undefined)?.trim(),
    objective: (body.objective as string | undefined)?.trim() ?? null,
    procedure: body.procedure ?? {},
    linkage: body.linkage ?? {},
    ownership: body.ownership ?? {},
    coverage_assertions: Array.isArray(body.coverageAssertions)
      ? (body.coverageAssertions as string[]).map((entry) => entry.trim())
      : [],
    planned_effectiveness: (body.plannedEffectiveness as Database['public']['Enums']['risk_rating'] | undefined) ?? 'MODERATE',
    status: (body.status as ResponseStatus | undefined) ?? 'PLANNED',
    updated_by_user_id: user.id,
  } satisfies Partial<Database['public']['Tables']['audit_responses']['Insert']>;

  if (!payload.risk_id) throw new HttpError(400, 'risk_id_required');
  if (!payload.title) throw new HttpError(400, 'title_required');

  const responseId = body.id as string | undefined;
  if (responseId) {
    const { data, error } = await client
      .from('audit_responses')
      .update(payload)
      .eq('id', responseId)
      .eq('org_id', ctx.orgId)
      .select('id')
      .single();
    if (error) throw new HttpError(500, 'response_update_failed');

    await logActivity(client, {
      orgId: ctx.orgId,
      userId: user.id,
      action: 'RESPONSE_UPDATED',
      entityId: data.id,
      metadata: { title: payload.title, status: payload.status },
    });
    return jsonResponse(200, { id: data.id });
  }

  const insertPayload = {
    ...payload,
    created_by_user_id: user.id,
  } as Database['public']['Tables']['audit_responses']['Insert'];

  const { data, error } = await client
    .from('audit_responses')
    .insert(insertPayload)
    .select('id')
    .single();
  if (error) throw new HttpError(500, 'response_create_failed');

  await logActivity(client, {
    orgId: ctx.orgId,
    userId: user.id,
    action: 'RESPONSE_CREATED',
    entityId: data.id,
    metadata: { title: payload.title, responseType: payload.response_type },
  });

  return jsonResponse(200, { id: data.id });
}

async function handleResponseStatus(
  client: TypedClient,
  user: SupabaseUser,
  body: any,
  ctx: { orgId: string; engagementId: string },
) {
  const responseId = body.id as string | undefined;
  if (!responseId) throw new HttpError(400, 'response_id_required');

  const status = body.status as ResponseStatus | undefined;
  if (!status) throw new HttpError(400, 'status_required');

  const { error } = await client
    .from('audit_responses')
    .update({ status, updated_by_user_id: user.id })
    .eq('id', responseId)
    .eq('org_id', ctx.orgId);
  if (error) throw new HttpError(500, 'response_status_update_failed');

  await logActivity(client, {
    orgId: ctx.orgId,
    userId: user.id,
    action: 'RESPONSE_STATUS_CHANGED',
    entityId: responseId,
    metadata: { status },
  });

  return jsonResponse(200, { status });
}

async function handleCompletenessCheck(
  client: TypedClient,
  user: SupabaseUser,
  body: any,
  ctx: { orgId: string; engagementId: string },
) {
  requireRole((await getOrgContext(client, body.orgSlug ?? null, user.id)).role, 'MANAGER');

  const responseId = body.responseId as string | undefined;
  if (!responseId) throw new HttpError(400, 'response_id_required');

  const record = {
    org_id: ctx.orgId,
    engagement_id: ctx.engagementId,
    response_id: responseId,
    completeness: Boolean(body.completeness),
    conclusions: (body.conclusions as string | undefined)?.trim() ?? null,
    metadata: body.metadata ?? {},
    reviewer_user_id: user.id,
    reviewed_at: new Date().toISOString(),
  } satisfies Database['public']['Tables']['audit_response_checks']['Insert'];

  const { data, error } = await client
    .from('audit_response_checks')
    .insert(record)
    .select('id')
    .single();
  if (error) throw new HttpError(500, 'response_check_failed');

  await logActivity(client, {
    orgId: ctx.orgId,
    userId: user.id,
    action: 'RESPONSE_CHECK_RECORDED',
    entityId: responseId,
    metadata: { completeness: record.completeness },
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
    const pathname = url.pathname.replace(/^\/audit-responses/, '') || '/';

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

      if (pathname === '/response/upsert') {
        requireRole(role, 'EMPLOYEE');
        return await handleResponseUpsert(client, user, body, ctx);
      }

      if (pathname === '/response/status') {
        requireRole(role, 'EMPLOYEE');
        return await handleResponseStatus(client, user, body, ctx);
      }

      if (pathname === '/response/check') {
        requireRole(role, 'MANAGER');
        return await handleCompletenessCheck(client, user, body, ctx);
      }
    }

    return jsonResponse(404, { error: 'not_found' });
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse(error.status, { error: error.message });
    }
    console.error('audit-responses-unhandled', error);
    return jsonResponse(500, { error: 'internal_error' });
  }
});
