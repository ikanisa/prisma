import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { logGroupActivity } from '@/lib/group/activity';
import { invalidateGroupComponentsCache } from '@/lib/group/cache';
import { getOrgIdFromRequest, isUuid, resolveUserId, toJsonRecord } from '@/lib/group/request';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type GroupComponentInsert = {
  org_id: string;
  engagement_id: string;
  component_name?: string | null;
  component_code?: string | null;
  component_type?: string | null;
  jurisdiction?: string | null;
  risk_level?: string | null;
  status?: string | null;
  materiality_scope?: string | null;
  lead_auditor?: string | null;
  metadata?: Record<string, unknown> | null;
};

type RouteContext = {
  params: {
    id: string;
  };
};

function tryGetSupabaseClients() {
  try {
    const supabase = getSupabaseServerClient();
    return { supabase, supabaseUnsafe: supabase as SupabaseClient };
  } catch {
    return null;
  }
}

function buildUpdatePayload(body: Record<string, unknown>): Partial<GroupComponentInsert> {
  const payload: Partial<GroupComponentInsert> = {};

  if (typeof body.componentName === 'string' && body.componentName.trim()) {
    payload.component_name = body.componentName.trim();
  }
  if (typeof body.componentCode === 'string') {
    payload.component_code = body.componentCode.trim() || null;
  }
  if (typeof body.componentType === 'string') {
    payload.component_type = body.componentType.trim() || null;
  }
  if (typeof body.jurisdiction === 'string') {
    payload.jurisdiction = body.jurisdiction.trim() || null;
  }
  if (typeof body.riskLevel === 'string') {
    payload.risk_level = body.riskLevel.trim() || null;
  }
  if (typeof body.status === 'string') {
    payload.status = body.status.trim() || null;
  }
  if (typeof body.materialityScope === 'string') {
    payload.materiality_scope = body.materialityScope.trim() || null;
  }
  if (typeof body.leadAuditorId === 'string') {
    payload.lead_auditor = isUuid(body.leadAuditorId) ? body.leadAuditorId.trim() : null;
  }
  if ('metadata' in body) {
    const metadata = toJsonRecord(body.metadata);
    payload.metadata = metadata ?? null;
  }

  return payload;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const clients = tryGetSupabaseClients();
  if (!clients) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }
  const { supabaseUnsafe } = clients;
  const orgId = getOrgIdFromRequest(request);
  if (!orgId) {
    return NextResponse.json({ error: 'orgId is required' }, { status: 400 });
  }

  const { id } = context.params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: 'component id must be a UUID' }, { status: 400 });
  }

  const { data, error } = await supabaseUnsafe
    .from('group_components')
    .select('*')
    .eq('org_id', orgId)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Component not found' }, { status: 404 });
  }

  return NextResponse.json({ component: data });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const clients = tryGetSupabaseClients();
  if (!clients) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }
  const { supabase, supabaseUnsafe } = clients;
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  if (!payload || typeof payload !== 'object') {
    return NextResponse.json({ error: 'Request body must be an object' }, { status: 400 });
  }

  const body = payload as Record<string, unknown>;
  const orgId = getOrgIdFromRequest(request, body.orgId);
  if (!orgId) {
    return NextResponse.json({ error: 'orgId is required' }, { status: 400 });
  }

  const userId = await resolveUserId(request, body.userId);
  if (!userId) {
    return NextResponse.json({ error: 'userId is required for auditing' }, { status: 401 });
  }

  const { id } = context.params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: 'component id must be a UUID' }, { status: 400 });
  }

  const updates = buildUpdatePayload(body);
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 });
  }

  const { data, error } = await supabaseUnsafe
    .from('group_components')
    .update(updates)
    .eq('org_id', orgId)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await logGroupActivity({
    supabase,
    action: 'GRP_COMPONENT_UPDATED',
    orgId,
    userId,
    entityId: data?.id ?? null,
    entityType: 'group_component',
    metadata: {
      status: data?.status ?? null,
      risk_level: data?.risk_level ?? null,
    },
  });

  await invalidateGroupComponentsCache(orgId, data.engagement_id);

  return NextResponse.json({ component: data });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const clients = tryGetSupabaseClients();
  if (!clients) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }
  const { supabase, supabaseUnsafe } = clients;
  let payload: unknown = null;
  try {
    if (request.headers.get('content-length')) {
      payload = await request.json();
    }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const body = (payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {}) as Record<string, unknown>;
  const orgId = getOrgIdFromRequest(request, body.orgId);
  if (!orgId) {
    return NextResponse.json({ error: 'orgId is required' }, { status: 400 });
  }

  const userId = await resolveUserId(request, body.userId);
  if (!userId) {
    return NextResponse.json({ error: 'userId is required for auditing' }, { status: 401 });
  }

  const { id } = context.params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: 'component id must be a UUID' }, { status: 400 });
  }

  const { data, error } = await supabaseUnsafe
    .from('group_components')
    .delete()
    .eq('org_id', orgId)
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Component not found' }, { status: 404 });
  }

  await logGroupActivity({
    supabase,
    action: 'GRP_COMPONENT_DELETED',
    orgId,
    userId,
    entityId: data.id,
    entityType: 'group_component',
    metadata: {
      status: data.status ?? null,
      risk_level: data.risk_level ?? null,
    },
  });

  await invalidateGroupComponentsCache(orgId, data.engagement_id);

  return NextResponse.json({ component: data });
}
