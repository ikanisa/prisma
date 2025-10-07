import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { Database } from '../../../../../../src/integrations/supabase/types';
import { logGroupActivity } from '../../../../lib/group/activity';
import { authenticateGroupRequest, isUuid, toJsonRecord } from '../../../../lib/group/request';
import { getSupabaseServerClient } from '../../../../lib/supabase/server';

type WorkpaperInsert = Database['public']['Tables']['component_workpapers']['Insert'];

const supabase = getSupabaseServerClient();

function buildInsertPayload(orgId: string, userId: string, body: Record<string, unknown>): WorkpaperInsert {
  if (typeof body.engagementId !== 'string' || !isUuid(body.engagementId)) {
    throw new Error('engagementId must be a UUID');
  }
  if (typeof body.componentId !== 'string' || !isUuid(body.componentId)) {
    throw new Error('componentId must be a UUID');
  }
  if (typeof body.title !== 'string' || !body.title.trim()) {
    throw new Error('title is required');
  }

  const payload: WorkpaperInsert = {
    org_id: orgId,
    engagement_id: body.engagementId.trim(),
    component_id: body.componentId.trim(),
    title: body.title.trim(),
    status: 'submitted',
    ingested_by: userId,
    ingested_at: new Date().toISOString(),
  };

  if (typeof body.status === 'string' && body.status.trim()) {
    payload.status = body.status.trim();
  }
  if (typeof body.notes === 'string' && body.notes.trim()) {
    payload.notes = body.notes.trim();
  }
  if (typeof body.ingestionMethod === 'string' && body.ingestionMethod.trim()) {
    payload.ingestion_method = body.ingestionMethod.trim();
  }
  if (typeof body.instructionId === 'string') {
    payload.instruction_id = isUuid(body.instructionId) ? body.instructionId.trim() : null;
  }
  if (typeof body.documentId === 'string') {
    payload.document_id = isUuid(body.documentId) ? body.documentId.trim() : null;
  }
  const metadata = toJsonRecord(body.metadata);
  if (metadata) {
    payload.metadata = metadata;
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
  const componentId = url.searchParams.get('componentId');
  const instructionId = url.searchParams.get('instructionId');
  const status = url.searchParams.get('status');

  const query = supabase
    .from('component_workpapers')
    .select('*')
    .eq('org_id', orgId)
    .order('ingested_at', { ascending: false });

  if (engagementId) {
    if (!isUuid(engagementId)) {
      return NextResponse.json({ error: 'engagementId must be a UUID' }, { status: 400 });
    }
    query.eq('engagement_id', engagementId);
  }
  if (componentId) {
    if (!isUuid(componentId)) {
      return NextResponse.json({ error: 'componentId must be a UUID' }, { status: 400 });
    }
    query.eq('component_id', componentId);
  }
  if (instructionId) {
    if (!isUuid(instructionId)) {
      return NextResponse.json({ error: 'instructionId must be a UUID' }, { status: 400 });
    }
    query.eq('instruction_id', instructionId);
  }
  if (status) {
    query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ workpapers: data ?? [] });
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

  let insertPayload: WorkpaperInsert;
  try {
    insertPayload = buildInsertPayload(orgId, userId, body);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('component_workpapers')
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await logGroupActivity({
    supabase,
    action: 'GRP_WORKPAPER_INGESTED',
    orgId,
    userId,
    entityId: data?.id ?? null,
    entityType: 'component_workpaper',
    metadata: {
      status: data?.status ?? null,
      component_id: data?.component_id ?? null,
    },
  });

  return NextResponse.json({ workpaper: data });
}
