import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { Database } from '../../../../../../src/integrations/supabase/types';
import { logGroupActivity } from '../../../../lib/group/activity';
import { authenticateGroupRequest, isUuid, toJsonRecord } from '../../../../lib/group/request';
import { getSupabaseServerClient } from '../../../../lib/supabase/server';

type GroupComponentInsert = Database['public']['Tables']['group_components']['Insert'];

const supabase = getSupabaseServerClient();

function buildInsertPayload(orgId: string, body: Record<string, unknown>): GroupComponentInsert {
  if (typeof body.engagementId !== 'string' || !isUuid(body.engagementId)) {
    throw new Error('engagementId must be a UUID');
  }
  if (typeof body.componentName !== 'string' || !body.componentName.trim()) {
    throw new Error('componentName is required');
  }

  const payload: GroupComponentInsert = {
    org_id: orgId,
    engagement_id: body.engagementId.trim(),
    component_name: body.componentName.trim(),
  };

  if (typeof body.componentCode === 'string' && body.componentCode.trim()) {
    payload.component_code = body.componentCode.trim();
  }
  if (typeof body.componentType === 'string' && body.componentType.trim()) {
    payload.component_type = body.componentType.trim();
  }
  if (typeof body.jurisdiction === 'string' && body.jurisdiction.trim()) {
    payload.jurisdiction = body.jurisdiction.trim();
  }
  if (typeof body.riskLevel === 'string' && body.riskLevel.trim()) {
    payload.risk_level = body.riskLevel.trim();
  }
  if (typeof body.status === 'string' && body.status.trim()) {
    payload.status = body.status.trim();
  }
  if (typeof body.materialityScope === 'string' && body.materialityScope.trim()) {
    payload.materiality_scope = body.materialityScope.trim();
  }
  if (typeof body.leadAuditorId === 'string' && isUuid(body.leadAuditorId)) {
    payload.lead_auditor = body.leadAuditorId.trim();
  }
  const metadata = toJsonRecord(body.metadata);
  if (metadata) {
    payload.metadata = metadata;
  }

  return payload;
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

export async function GET(request: NextRequest) {
  const auth = await authenticateGroupRequest({
    request,
    supabase,
    userErrorMessage: 'Authentication required',
  });
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { orgId } = auth;

  const url = new URL(request.url);
  const engagementId = url.searchParams.get('engagementId');

  const query = supabase
    .from('group_components')
    .select('*')
    .eq('org_id', orgId)
    .order('component_name', { ascending: true });

  if (engagementId) {
    if (!isUuid(engagementId)) {
      return NextResponse.json({ error: 'engagementId must be a UUID' }, { status: 400 });
    }
    query.eq('engagement_id', engagementId);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ components: data ?? [] });
}

export async function POST(request: NextRequest) {
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

  let insertPayload: GroupComponentInsert;
  try {
    insertPayload = buildInsertPayload(orgId, body);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('group_components')
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await logGroupActivity({
    supabase,
    action: 'GRP_COMPONENT_CREATED',
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
