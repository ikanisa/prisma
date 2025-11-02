import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { logGroupActivity } from '@/lib/group/activity';
import { invalidateGroupComponentsCache } from '@/lib/group/cache';
import { getOrgIdFromRequest, isUuid, resolveUserId, toJsonRecord } from '@/lib/group/request';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type WorkpaperInsert = {
  org_id: string;
  engagement_id: string;
  component_id: string;
  instruction_id?: string | null;
  document_id?: string | null;
  title: string;
  uploaded_by_user_id?: string | null;
  uploaded_at?: string;
  status?: string;
  notes?: string | null;
  ingestion_method?: string | null;
  ingested_by?: string;
  ingested_at?: string;
  metadata?: Record<string, unknown> | null;
};

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
  let supabase;
  let supabaseUnsafe;
  try {
    supabase = getSupabaseServerClient();
    supabaseUnsafe = supabase as SupabaseClient;
  } catch {
    return NextResponse.json({ workpapers: [] });
  }
  const orgId = getOrgIdFromRequest(request);
  if (!orgId) {
    return NextResponse.json({ error: 'orgId is required' }, { status: 400 });
  }

  const url = new URL(request.url);
  const engagementId = url.searchParams.get('engagementId');
  const componentId = url.searchParams.get('componentId');
  const instructionId = url.searchParams.get('instructionId');
  const status = url.searchParams.get('status');

  const query = supabaseUnsafe
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
  let supabase;
  let supabaseUnsafe;
  try {
    supabase = getSupabaseServerClient();
    supabaseUnsafe = supabase as SupabaseClient;
  } catch {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }
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

  let insertPayload: WorkpaperInsert;
  try {
    insertPayload = buildInsertPayload(orgId, userId, body);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }

  const { data, error } = await supabaseUnsafe
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

  await invalidateGroupComponentsCache(orgId, insertPayload.engagement_id);

  return NextResponse.json({ workpaper: data });
}
