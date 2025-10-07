import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { Database } from '../../../../../../src/integrations/supabase/types';
import { logGroupActivity } from '../../../../lib/group/activity';
import { authenticateGroupRequest, isUuid, toJsonRecord } from '../../../../lib/group/request';
import { getSupabaseServerClient } from '../../../../lib/supabase/server';

type ReviewInsert = Database['public']['Tables']['component_reviews']['Insert'];

const supabase = getSupabaseServerClient();

function buildInsertPayload(orgId: string, body: Record<string, unknown>): ReviewInsert {
  if (typeof body.engagementId !== 'string' || !isUuid(body.engagementId)) {
    throw new Error('engagementId must be a UUID');
  }
  if (typeof body.componentId !== 'string' || !isUuid(body.componentId)) {
    throw new Error('componentId must be a UUID');
  }
  if (typeof body.reviewerId !== 'string' || !isUuid(body.reviewerId)) {
    throw new Error('reviewerId must be a UUID');
  }

  const payload: ReviewInsert = {
    org_id: orgId,
    engagement_id: body.engagementId.trim(),
    component_id: body.componentId.trim(),
    reviewer_id: body.reviewerId.trim(),
    status: 'pending',
    assigned_at: new Date().toISOString(),
  };

  if (typeof body.workpaperId === 'string') {
    payload.workpaper_id = isUuid(body.workpaperId) ? body.workpaperId.trim() : null;
  }
  if (typeof body.status === 'string' && body.status.trim()) {
    payload.status = body.status.trim();
  }
  if (typeof body.reviewNotes === 'string' && body.reviewNotes.trim()) {
    payload.review_notes = body.reviewNotes.trim();
  }
  if (typeof body.dueAt === 'string' && body.dueAt.trim()) {
    payload.due_at = body.dueAt.trim();
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
  const componentId = url.searchParams.get('componentId');
  const engagementId = url.searchParams.get('engagementId');
  const reviewerId = url.searchParams.get('reviewerId');
  const status = url.searchParams.get('status');

  const query = supabase
    .from('component_reviews')
    .select('*')
    .eq('org_id', orgId)
    .order('assigned_at', { ascending: false });

  if (componentId) {
    if (!isUuid(componentId)) {
      return NextResponse.json({ error: 'componentId must be a UUID' }, { status: 400 });
    }
    query.eq('component_id', componentId);
  }
  if (engagementId) {
    if (!isUuid(engagementId)) {
      return NextResponse.json({ error: 'engagementId must be a UUID' }, { status: 400 });
    }
    query.eq('engagement_id', engagementId);
  }
  if (reviewerId) {
    if (!isUuid(reviewerId)) {
      return NextResponse.json({ error: 'reviewerId must be a UUID' }, { status: 400 });
    }
    query.eq('reviewer_id', reviewerId);
  }
  if (status) {
    query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ reviews: data ?? [] });
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

  let insertPayload: ReviewInsert;
  try {
    insertPayload = buildInsertPayload(orgId, body);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('component_reviews')
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await logGroupActivity({
    supabase,
    action: 'GRP_REVIEW_ASSIGNED',
    orgId,
    userId,
    entityId: data?.id ?? null,
    entityType: 'component_review',
    metadata: {
      status: data?.status ?? null,
      reviewer_id: data?.reviewer_id ?? null,
    },
  });

  return NextResponse.json({ review: data });
}
