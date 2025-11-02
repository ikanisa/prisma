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

function tryGetSupabaseClients() {
  try {
    const supabase = getSupabaseServerClient();
    return { supabase, supabaseUnsafe: supabase as SupabaseClient };
  } catch {
    return null;
  }
}
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

export async function GET(request: NextRequest) {
  const clients = tryGetSupabaseClients();
  if (!clients) {
    return NextResponse.json({ components: [] });
  }
  const { supabaseUnsafe } = clients;
  const orgId = getOrgIdFromRequest(request);
  if (!orgId) {
    return NextResponse.json({ error: 'orgId is required' }, { status: 400 });
  }

  const url = new URL(request.url);
  const engagementId = url.searchParams.get('engagementId');

  const query = supabaseUnsafe
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

  let insertPayload: GroupComponentInsert;
  try {
    insertPayload = buildInsertPayload(orgId, body);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }

  const { data, error } = await supabaseUnsafe
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

  await invalidateGroupComponentsCache(orgId, insertPayload.engagement_id);

  return NextResponse.json({ component: data });
}
