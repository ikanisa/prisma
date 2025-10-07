import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { Database } from '../../../../../../../src/integrations/supabase/types';
import { logGroupActivity } from '../../../../../lib/group/activity';
import { authenticateGroupRequest, isUuid, toJsonRecord } from '../../../../../lib/group/request';
import { getSupabaseServerClient } from '../../../../../lib/supabase/server';

type GroupComponentInsert = Database['public']['Tables']['group_components']['Insert'];

type RouteContext = {
  params: {
    id: string;
  };
};

const supabase = getSupabaseServerClient();

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
  const auth = await authenticateGroupRequest({
    request,
    supabase,
    userErrorMessage: 'Authentication required',
  });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { orgId } = auth;

  const { id } = context.params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: 'component id must be a UUID' }, { status: 400 });
  }

  const { data, error } = await supabase
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
  let payload: unknown;
  try {
    payload = await request.json();
  } catch (error) {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  if (!payload || typeof payload !== 'object') {
    return NextResponse.json({ error: 'Request body must be an object' }, { status: 400 });
  }
  const body = payload as Record<string, unknown>;
  const auth = await authenticateGroupRequest({
    request,
    supabase,
    orgIdCandidate: body.orgId,
    userIdCandidate: body.userId,
  });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { orgId, userId } = auth;

  const { id } = context.params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: 'component id must be a UUID' }, { status: 400 });
  }

  const updates = buildUpdatePayload(body);
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 });
  }

  const { data, error } = await supabase
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

  return NextResponse.json({ component: data });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  let payload: unknown = null;
  try {
    if (request.headers.get('content-length')) {
      payload = await request.json();
    }
  } catch (error) {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }
  const body = (payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {}) as Record<
    string,
    unknown
  >;
  const auth = await authenticateGroupRequest({
    request,
    supabase,
    orgIdCandidate: body.orgId,
    userIdCandidate: body.userId,
  });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { orgId, userId } = auth;

  const { id } = context.params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: 'component id must be a UUID' }, { status: 400 });
  }

  const { data, error } = await supabase
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

  return NextResponse.json({ component: data });
}
