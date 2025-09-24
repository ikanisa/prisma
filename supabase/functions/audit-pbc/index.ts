import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import type { Database } from '../../../src/integrations/supabase/types.ts';
import { listPbcRequests } from '../_shared/pbc.ts';

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
type PbcStatus = Database['public']['Enums']['pbc_request_status'];

type SupabaseUser = {
  id: string;
  email?: string;
};

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
  params: { orgId: string; userId: string; action: string; entityId: string; metadata?: Record<string, unknown> },
) {
  const { error } = await client.from('activity_log').insert({
    org_id: params.orgId,
    user_id: params.userId,
    action: params.action,
    entity_type: 'PBC_REQUEST',
    entity_id: params.entityId,
    metadata: params.metadata ?? {},
  });
  if (error) console.error('activity_log_error', error);
}

function parseStatus(status: unknown): PbcStatus {
  const allowed: PbcStatus[] = ['REQUESTED', 'RECEIVED', 'REJECTED', 'OBSOLETE'];
  if (typeof status !== 'string') throw new HttpError(400, 'invalid_status');
  const upper = status.toUpperCase();
  if (!allowed.includes(upper as PbcStatus)) throw new HttpError(400, 'invalid_status');
  return upper as PbcStatus;
}

async function handleInstantiate(client: TypedClient, user: SupabaseUser, body: any) {
  const orgSlug = body.orgSlug ?? body.org_slug ?? null;
  const engagementId = body.engagementId ?? body.engagement_id ?? null;
  const cycle = body.cycle as string | undefined;
  const items = Array.isArray(body.items) ? body.items : null;

  if (!cycle) throw new HttpError(400, 'cycle_required');
  if (!items || items.length === 0) throw new HttpError(400, 'items_required');

  const { orgId, role } = await getOrgContext(client, orgSlug, user.id);
  requireRole(role, 'EMPLOYEE');
  const engagement = await fetchEngagement(client, orgId, engagementId);

  const rows = items.map((item: any) => ({
    org_id: orgId,
    engagement_id: engagement.id,
    cycle,
    item: String(item.item ?? item.title ?? 'PBC Item'),
    description: item.description ?? null,
    due_at: item.dueAt ?? item.due_at ?? null,
    assignee_client_user_id: item.assigneeClientUserId ?? item.assignee_client_user_id ?? null,
    procedure_id: item.procedureId ?? item.procedure_id ?? null,
    status: 'REQUESTED' as PbcStatus,
    created_by_user_id: user.id,
    updated_by_user_id: user.id,
  }));

  const { data, error } = await client.from('pbc_requests').insert(rows).select('id');
  if (error) throw new HttpError(500, 'pbc_requests_create_failed');

  for (const inserted of data ?? []) {
    await logActivity(client, {
      orgId,
      userId: user.id,
      action: 'PBC_CREATED',
      entityId: inserted.id,
      metadata: { cycle, engagementId: engagement.id },
    });
  }

  const requests = await listPbcRequests(client, orgId, engagement.id);
  return jsonResponse(200, { requests });
}

async function createDelivery(
  client: TypedClient,
  params: { orgId: string; requestId: string; documentId: string | null; note: string | null; userId: string },
) {
  const payload: Database['public']['Tables']['pbc_deliveries']['Insert'] = {
    org_id: params.orgId,
    request_id: params.requestId,
    document_id: params.documentId,
    note: params.note,
    created_by_user_id: params.userId,
  };
  const { error } = await client.from('pbc_deliveries').insert(payload);
  if (error) throw new HttpError(500, 'pbc_delivery_failed');
}

async function ensureEvidence(
  client: TypedClient,
  params: {
    orgId: string;
    engagementId: string;
    procedureId: string | null;
    documentId: string | null;
    request: { id: string; item: string; description: string | null };
    userId: string;
  },
) {
  if (!params.documentId) return;

  const { data: existing, error: existingError } = await client
    .from('audit_evidence')
    .select('id')
    .eq('org_id', params.orgId)
    .eq('engagement_id', params.engagementId)
    .eq('document_id', params.documentId)
    .maybeSingle();
  if (existingError && existingError.code !== 'PGRST116') {
    throw new HttpError(500, 'evidence_lookup_failed');
  }
  if (existing) return;

  const insert: Database['public']['Tables']['audit_evidence']['Insert'] = {
    org_id: params.orgId,
    engagement_id: params.engagementId,
    created_by_user_id: params.userId,
    updated_by_user_id: params.userId,
    description: params.request.description ?? `PBC upload – ${params.request.item}`,
    document_id: params.documentId,
    procedure_id: params.procedureId ?? null,
  } as any;

  const { error } = await client.from('audit_evidence').insert(insert);
  if (error) throw new HttpError(500, 'evidence_create_failed');
}

async function handleUpdateStatus(client: TypedClient, user: SupabaseUser, body: any) {
  const orgSlug = body.orgSlug ?? body.org_slug ?? null;
  const requestId = body.requestId ?? body.request_id ?? null;
  const statusRaw = body.status;
  const documentId = body.documentId ?? body.document_id ?? null;
  const note = body.note ?? null;
  const procedureId = body.procedureId ?? body.procedure_id ?? null;

  const { orgId, role } = await getOrgContext(client, orgSlug, user.id);
  requireRole(role, 'EMPLOYEE');

  if (!requestId) throw new HttpError(400, 'request_id_required');

  const status = parseStatus(statusRaw);

  const { data: existing, error: existingError } = await client
    .from('pbc_requests')
    .select('*')
    .eq('org_id', orgId)
    .eq('id', requestId)
    .maybeSingle();
  if (existingError) throw new HttpError(500, 'pbc_request_lookup_failed');
  if (!existing) throw new HttpError(404, 'pbc_request_not_found');

  const updates: Database['public']['Tables']['pbc_requests']['Update'] = {
    status,
    updated_by_user_id: user.id,
  };
  if (procedureId) {
    updates.procedure_id = procedureId;
  }

  const { error: updateError } = await client
    .from('pbc_requests')
    .update(updates)
    .eq('id', requestId);
  if (updateError) throw new HttpError(500, 'pbc_request_update_failed');

  if (status === 'RECEIVED') {
    await createDelivery(client, {
      orgId,
      requestId,
      documentId,
      note,
      userId: user.id,
    });
    await ensureEvidence(client, {
      orgId,
      engagementId: existing.engagement_id,
      procedureId: (procedureId ?? existing.procedure_id) ?? null,
      documentId,
      request: { id: existing.id, item: existing.item, description: existing.description },
      userId: user.id,
    });
  }

  await logActivity(client, {
    orgId,
    userId: user.id,
    action: status === 'RECEIVED' ? 'PBC_RECEIVED' : 'PBC_STATUS_UPDATED',
    entityId: existing.id,
    metadata: {
      from: existing.status,
      to: status,
      documentId,
      engagementId: existing.engagement_id,
    },
  });

  const requests = await listPbcRequests(client, orgId, existing.engagement_id);
  return jsonResponse(200, { requests });
}

async function handleRemind(client: TypedClient, user: SupabaseUser, body: any) {
  const orgSlug = body.orgSlug ?? body.org_slug ?? null;
  const requestId = body.requestId ?? body.request_id ?? null;
  const message = body.message ?? 'Reminder sent to client owner';

  const { orgId, role } = await getOrgContext(client, orgSlug, user.id);
  requireRole(role, 'EMPLOYEE');

  if (!requestId) throw new HttpError(400, 'request_id_required');

  const { data: request, error } = await client
    .from('pbc_requests')
    .select('id, engagement_id, item')
    .eq('org_id', orgId)
    .eq('id', requestId)
    .maybeSingle();
  if (error) throw new HttpError(500, 'pbc_request_lookup_failed');
  if (!request) throw new HttpError(404, 'pbc_request_not_found');

  await logActivity(client, {
    orgId,
    userId: user.id,
    action: 'PBC_REMINDER_SENT',
    entityId: request.id,
    metadata: { message, engagementId: request.engagement_id },
  });

  const { error: notificationError } = await client.from('notifications').insert({
    org_id: orgId,
    user_id: user.id,
    title: `Reminder sent for PBC item: ${request.item}`,
    message,
    type: 'PBC_REMINDER',
  });
  if (notificationError) console.error('pbc_reminder_notification_failed', notificationError);

  return jsonResponse(200, { success: true });
}

async function handleList(client: TypedClient, user: SupabaseUser, url: URL) {
  const orgSlug = url.searchParams.get('orgSlug');
  const engagementId = url.searchParams.get('engagementId');
  const { orgId } = await getOrgContext(client, orgSlug, user.id);
  const engagement = await fetchEngagement(client, orgId, engagementId);
  const requests = await listPbcRequests(client, orgId, engagement.id);
  return jsonResponse(200, { requests });
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
    const pathname = url.pathname.replace(/^\/audit-pbc/, '') || '/';

    if (req.method === 'GET' && pathname === '/list') {
      return await handleList(client, user, url);
    }

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));

      if (pathname === '/template/instantiate') return await handleInstantiate(client, user, body);
      if (pathname === '/request/update-status') return await handleUpdateStatus(client, user, body);
      if (pathname === '/request/remind') return await handleRemind(client, user, body);
    }

    return jsonResponse(404, { error: 'not_found' });
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse(error.status, { error: error.message });
    }
    console.error('audit-pbc-unhandled', error);
    return jsonResponse(500, { error: 'internal_error' });
  }
});
