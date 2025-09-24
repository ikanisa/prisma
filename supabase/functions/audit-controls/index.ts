import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { Database } from '../../../src/integrations/supabase/types.ts';
import { listControls, listItgcGroups } from '../_shared/controls.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('API_ALLOWED_ORIGINS') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
}

type TypedClient = SupabaseClient<Database>;
type RoleLevel = Database['public']['Enums']['role_level'];
type WalkthroughResult = Database['public']['Enums']['control_walkthrough_result'];
type TestResult = Database['public']['Enums']['control_test_result'];
type DeficiencySeverity = Database['public']['Enums']['deficiency_severity'];
type DeficiencyStatus = Database['public']['Enums']['deficiency_status'];
type ItgcType = Database['public']['Enums']['itgc_type'];

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

function createSupabaseClient(authHeader: string): TypedClient {
  return createClient<Database>(supabaseUrl!, serviceRoleKey!, {
    auth: { persistSession: false },
    global: { headers: { Authorization: authHeader } },
  });
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
  params: { orgId: string; userId: string; action: string; entityId: string; entityType: string; metadata?: Record<string, unknown> },
) {
  const { error } = await client.from('activity_log').insert({
    org_id: params.orgId,
    user_id: params.userId,
    action: params.action,
    entity_type: params.entityType,
    entity_id: params.entityId,
    metadata: params.metadata ?? {},
  });
  if (error) console.error('activity_log_error', error);
}

function parseWalkthroughResult(value: unknown): WalkthroughResult {
  const allowed: WalkthroughResult[] = ['DESIGNED', 'NOT_DESIGNED', 'IMPLEMENTED', 'NOT_IMPLEMENTED'];
  if (typeof value !== 'string') throw new HttpError(400, 'invalid_walkthrough_result');
  const upper = value.toUpperCase();
  if (!allowed.includes(upper as WalkthroughResult)) throw new HttpError(400, 'invalid_walkthrough_result');
  return upper as WalkthroughResult;
}

function parseTestResult(value: unknown): TestResult {
  const allowed: TestResult[] = ['PASS', 'EXCEPTIONS'];
  if (typeof value !== 'string') throw new HttpError(400, 'invalid_test_result');
  const upper = value.toUpperCase();
  if (!allowed.includes(upper as TestResult)) throw new HttpError(400, 'invalid_test_result');
  return upper as TestResult;
}

function parseSeverity(value: unknown, fallback: DeficiencySeverity = 'MEDIUM'): DeficiencySeverity {
  const allowed: DeficiencySeverity[] = ['LOW', 'MEDIUM', 'HIGH'];
  if (typeof value !== 'string') return fallback;
  const upper = value.toUpperCase();
  return (allowed.includes(upper as DeficiencySeverity) ? upper : fallback) as DeficiencySeverity;
}

function parseStatus(value: unknown, fallback: DeficiencyStatus = 'OPEN'): DeficiencyStatus {
  const allowed: DeficiencyStatus[] = ['OPEN', 'REMEDIATION', 'CLOSED'];
  if (typeof value !== 'string') return fallback;
  const upper = value.toUpperCase();
  return (allowed.includes(upper as DeficiencyStatus) ? upper : fallback) as DeficiencyStatus;
}

function parseItgcType(value: unknown): ItgcType {
  const allowed: ItgcType[] = ['ACCESS', 'CHANGE', 'OPERATIONS'];
  if (typeof value !== 'string') throw new HttpError(400, 'invalid_itgc_type');
  const upper = value.toUpperCase();
  if (!allowed.includes(upper as ItgcType)) throw new HttpError(400, 'invalid_itgc_type');
  return upper as ItgcType;
}

async function pushDeficiencyToTcwg(
  client: TypedClient,
  params: { orgId: string; engagementId: string; deficiency: Database['public']['Tables']['deficiencies']['Row'] },
) {
  const { data: pack, error } = await client
    .from('tcwg_packs')
    .select('id, deficiencies')
    .eq('org_id', params.orgId)
    .eq('engagement_id', params.engagementId)
    .maybeSingle();
  if (error) {
    console.error('tcwg_pack_lookup_failed', error);
    return;
  }
  if (!pack) return;

  const existing = Array.isArray(pack.deficiencies) ? [...(pack.deficiencies as any[])] : [];
  existing.push({
    id: params.deficiency.id,
    controlId: params.deficiency.control_id,
    procedureId: params.deficiency.procedure_id,
    severity: params.deficiency.severity,
    recommendation: params.deficiency.recommendation,
    status: params.deficiency.status,
    created_at: params.deficiency.created_at,
  });

  const { error: updateError } = await client
    .from('tcwg_packs')
    .update({ deficiencies: existing })
    .eq('id', pack.id);
  if (updateError) {
    console.error('tcwg_pack_update_failed', updateError);
  }
}

async function createDeficiency(
  client: TypedClient,
  params: {
    orgId: string;
    engagementId: string;
    controlId?: string | null;
    severity: DeficiencySeverity;
    recommendation: string;
    status?: DeficiencyStatus;
    user: SupabaseUser;
    procedureId?: string | null;
  },
) {
  const payload: Database['public']['Tables']['deficiencies']['Insert'] = {
    org_id: params.orgId,
    engagement_id: params.engagementId,
    control_id: params.controlId ?? null,
    severity: params.severity,
    recommendation: params.recommendation,
    status: params.status ?? 'OPEN',
    created_by_user_id: params.user.id,
    procedure_id: params.procedureId ?? null,
  };

  const { data, error } = await client
    .from('deficiencies')
    .insert(payload)
    .select('*')
    .single();
  if (error) throw new HttpError(500, 'deficiency_create_failed');

  await logActivity(client, {
    orgId: params.orgId,
    userId: params.user.id,
    action: 'CTRL_DEFICIENCY_RAISED',
    entityId: data.id,
    entityType: 'DEFICIENCY',
    metadata: {
      controlId: data.control_id,
      severity: data.severity,
      status: data.status,
      procedureId: data.procedure_id,
    },
  });

  await pushDeficiencyToTcwg(client, {
    orgId: params.orgId,
    engagementId: params.engagementId,
    deficiency: data,
  });

  return data;
}

async function handleControlUpsert(client: TypedClient, user: SupabaseUser, body: any) {
  const orgSlug = body.orgSlug ?? body.org_slug ?? null;
  const { orgId, role } = await getOrgContext(client, orgSlug, user.id);
  requireRole(role, 'EMPLOYEE');

  const control = body.control ?? body;
  const engagementId = control.engagementId ?? control.engagement_id ?? null;
  const engagement = await fetchEngagement(client, orgId, engagementId);

  const payload: Database['public']['Tables']['controls']['Insert'] = {
    id: control.id ?? undefined,
    org_id: orgId,
    engagement_id: engagement.id,
    cycle: control.cycle ?? 'General',
    objective: control.objective ?? 'Control objective',
    description: control.description ?? null,
    frequency: control.frequency ?? null,
    owner: control.owner ?? null,
    key: control.key ?? false,
    created_by_user_id: user.id,
    updated_by_user_id: user.id,
  };

  const { data, error } = await client
    .from('controls')
    .upsert(payload, { onConflict: 'id' })
    .select('id')
    .single();
  if (error) throw new HttpError(500, 'control_upsert_failed');

  await logActivity(client, {
    orgId,
    userId: user.id,
    action: 'CTRL_ADDED',
    entityId: data.id,
    entityType: 'CONTROL',
    metadata: {
      cycle: payload.cycle,
      objective: payload.objective,
    },
  });

  return data.id;
}

async function handleWalkthroughLog(client: TypedClient, user: SupabaseUser, body: any) {
  const orgSlug = body.orgSlug ?? body.org_slug ?? null;
  const controlId = body.controlId ?? body.control_id ?? null;
  const walkDate = body.date ?? body.walk_date ?? null;
  const notes = body.notes ?? null;
  const result = parseWalkthroughResult(body.result);
  const procedureId = body.procedureId ?? body.procedure_id ?? null;

  const { orgId, role } = await getOrgContext(client, orgSlug, user.id);
  requireRole(role, 'EMPLOYEE');

  if (!controlId) throw new HttpError(400, 'control_id_required');
  if (!walkDate) throw new HttpError(400, 'walkthrough_date_required');

  const { data: control, error: controlError } = await client
    .from('controls')
    .select('id, engagement_id, org_id')
    .eq('id', controlId)
    .maybeSingle();
  if (controlError) throw new HttpError(500, 'control_lookup_failed');
  if (!control || control.org_id !== orgId) throw new HttpError(404, 'control_not_found');

  const insert: Database['public']['Tables']['control_walkthroughs']['Insert'] = {
    org_id: orgId,
    engagement_id: control.engagement_id,
    control_id: control.id,
    walk_date: new Date(walkDate).toISOString().slice(0, 10),
    notes,
    result,
    created_by_user_id: user.id,
    procedure_id: procedureId ?? null,
  };

  const { error } = await client.from('control_walkthroughs').insert(insert);
  if (error) throw new HttpError(500, 'walkthrough_log_failed');

  await logActivity(client, {
    orgId,
    userId: user.id,
    action: 'CTRL_WALKTHROUGH_DONE',
    entityId: control.id,
    entityType: 'CONTROL',
    metadata: {
      result,
      walkDate: insert.walk_date,
      procedureId,
    },
  });
}

async function handleTestRun(client: TypedClient, user: SupabaseUser, body: any) {
  const orgSlug = body.orgSlug ?? body.org_slug ?? null;
  const controlId = body.controlId ?? body.control_id ?? null;
  const attributes = typeof body.attributes === 'object' && body.attributes ? { ...body.attributes } : {};
  const samplePlanRef = body.samplePlanRef ?? body.sample_plan_ref ?? null;
  const result = parseTestResult(body.result);
  const severityOverride = body.severity;
  const recommendationOverride = body.recommendation;
  const procedureId = body.procedureId ?? body.procedure_id ?? null;

  const { orgId, role } = await getOrgContext(client, orgSlug, user.id);
  requireRole(role, 'EMPLOYEE');
  if (!controlId) throw new HttpError(400, 'control_id_required');

  const { data: control, error: controlError } = await client
    .from('controls')
    .select('id, engagement_id, org_id, objective')
    .eq('id', controlId)
    .maybeSingle();
  if (controlError) throw new HttpError(500, 'control_lookup_failed');
  if (!control || control.org_id !== orgId) throw new HttpError(404, 'control_not_found');

  const sampleSize = Number(attributes.sampleSize ?? attributes.sample_size ?? 0);
  if (!sampleSize || sampleSize < 25) {
    attributes.sampleSize = 25;
  }

  const insert: Database['public']['Tables']['control_tests']['Insert'] = {
    org_id: orgId,
    engagement_id: control.engagement_id,
    control_id: control.id,
    attributes,
    sample_plan_ref: samplePlanRef ?? null,
    procedure_id: procedureId ?? null,
    result,
    created_by_user_id: user.id,
  };

  const { error } = await client.from('control_tests').insert(insert);
  if (error) throw new HttpError(500, 'control_test_failed');

  await logActivity(client, {
    orgId,
    userId: user.id,
    action: 'CTRL_TEST_RUN',
    entityId: control.id,
    entityType: 'CONTROL',
    metadata: {
      result,
      samplePlanRef,
      attributes,
      procedureId,
    },
  });

  if (result === 'EXCEPTIONS') {
    const severity = parseSeverity(severityOverride, 'HIGH');
    const recommendation =
      recommendationOverride ?? `Investigate deviations noted during testing of ${control.objective}.`;
    await createDeficiency(client, {
      orgId,
      engagementId: control.engagement_id,
      controlId: control.id,
      severity,
      recommendation,
      user,
      procedureId: procedureId ?? null,
    });
  }
}

async function handleDeficiencyCreate(client: TypedClient, user: SupabaseUser, body: any) {
  const orgSlug = body.orgSlug ?? body.org_slug ?? null;
  const controlId = body.controlId ?? body.control_id ?? null;
  const engagementId = body.engagementId ?? body.engagement_id ?? null;
  const recommendation = body.recommendation ?? null;
  const procedureId = body.procedureId ?? body.procedure_id ?? null;

  if (!recommendation) throw new HttpError(400, 'recommendation_required');

  const severity = parseSeverity(body.severity, 'MEDIUM');
  const status = parseStatus(body.status, 'OPEN');

  const { orgId, role } = await getOrgContext(client, orgSlug, user.id);
  requireRole(role, 'EMPLOYEE');

  const engagement = await fetchEngagement(client, orgId, engagementId);

  await createDeficiency(client, {
    orgId,
    engagementId: engagement.id,
    controlId: controlId ?? null,
    severity,
    recommendation,
    status,
    user,
    procedureId,
  });
}

async function handleItgcUpsert(client: TypedClient, user: SupabaseUser, body: any) {
  const orgSlug = body.orgSlug ?? body.org_slug ?? null;
  const { orgId, role } = await getOrgContext(client, orgSlug, user.id);
  requireRole(role, 'EMPLOYEE');

  const payload: Database['public']['Tables']['itgc_groups']['Insert'] = {
    id: body.id ?? undefined,
    org_id: orgId,
    engagement_id: body.engagementId ?? body.engagement_id ?? null,
    type: parseItgcType(body.type),
    scope: body.scope ?? null,
    notes: body.notes ?? null,
    created_by_user_id: user.id,
  };

  const { error } = await client.from('itgc_groups').upsert(payload, { onConflict: 'id' });
  if (error) throw new HttpError(500, 'itgc_upsert_failed');
}

async function handleList(client: TypedClient, user: SupabaseUser, url: URL) {
  const orgSlug = url.searchParams.get('orgSlug');
  const engagementId = url.searchParams.get('engagementId');
  const { orgId } = await getOrgContext(client, orgSlug, user.id);
  const engagement = await fetchEngagement(client, orgId, engagementId);

  const [controls, itgcGroups, deficiencies] = await Promise.all([
    listControls(client, orgId, engagement.id),
    listItgcGroups(client, orgId, engagement.id),
    client
      .from('deficiencies')
      .select('*')
      .eq('org_id', orgId)
      .eq('engagement_id', engagement.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) throw error;
        return data ?? [];
      }),
  ]);

  return jsonResponse(200, { controls, itgcGroups, deficiencies });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authHeader = req.headers.get('authorization') ?? req.headers.get('Authorization');
  if (!authHeader) return jsonResponse(401, { error: 'missing_authorization' });

  const client = createSupabaseClient(authHeader);

  try {
    const user = await getUser(client);
    const url = new URL(req.url);
    const pathname = url.pathname.replace(/^\/audit-controls/, '') || '/';

    if (req.method === 'GET' && pathname === '/list') {
      return await handleList(client, user, url);
    }

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));

      if (pathname === '/control/upsert') {
        const id = await handleControlUpsert(client, user, body);
        return jsonResponse(200, { id });
      }
      if (pathname === '/control/walkthrough/log') {
        await handleWalkthroughLog(client, user, body);
        return jsonResponse(200, { success: true });
      }
      if (pathname === '/control/test/run') {
        await handleTestRun(client, user, body);
        return jsonResponse(200, { success: true });
      }
      if (pathname === '/deficiency/create') {
        await handleDeficiencyCreate(client, user, body);
        return jsonResponse(200, { success: true });
      }
      if (pathname === '/itgc/upsert') {
        await handleItgcUpsert(client, user, body);
        return jsonResponse(200, { success: true });
      }
    }

    return jsonResponse(404, { error: 'not_found' });
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse(error.status, { error: error.message });
    }
    console.error('audit-controls-unhandled', error);
    return jsonResponse(500, { error: 'internal_error' });
  }
});
