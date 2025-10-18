import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { logGroupActivity } from '@/lib/group/activity';
import { getOrgIdFromRequest, isUuid, resolveUserId, toJsonRecord } from '@/lib/group/request';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

export async function POST(request: NextRequest, context: RouteContext) {
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

  const { data, error } = await supabaseUnsafe
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
