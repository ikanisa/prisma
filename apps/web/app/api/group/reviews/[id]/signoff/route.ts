import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { logGroupActivity } from '../../../../../../lib/group/activity';
import { authenticateGroupRequest, isUuid, toJsonRecord } from '../../../../../../lib/group/request';
import { getSupabaseServerClient } from '../../../../../../lib/supabase/server';

type RouteContext = {
  params: {
    id: string;
  };
};

const supabase = getSupabaseServerClient();

export async function POST(request: NextRequest, context: RouteContext) {
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
    return NextResponse.json({ error: 'review id must be a UUID' }, { status: 400 });
  }

  const signedOffAt =
    typeof body.signedOffAt === 'string' && body.signedOffAt.trim()
      ? body.signedOffAt.trim()
      : new Date().toISOString();
  const status = typeof body.status === 'string' && body.status.trim() ? body.status.trim() : 'signed_off';

  const updates: Record<string, unknown> = {
    signed_off_at: signedOffAt,
    signed_off_by: userId,
    status,
  };

  if (typeof body.reviewNotes === 'string') {
    updates.review_notes = body.reviewNotes.trim() || null;
  }
  if ('metadata' in body) {
    const metadata = toJsonRecord(body.metadata);
    updates.metadata = metadata ?? null;
  }

  const { data, error } = await supabase
    .from('component_reviews')
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
    action: 'GRP_REVIEW_SIGNOFF',
    orgId,
    userId,
    entityId: data?.id ?? null,
    entityType: 'component_review',
    metadata: {
      status: data?.status ?? null,
      signed_off_at: data?.signed_off_at ?? null,
    },
  });

  return NextResponse.json({ review: data });
}
