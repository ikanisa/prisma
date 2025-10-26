import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { COMPARATIVE_STATUSES, DEFAULT_COMPARATIVE_CHECKS } from '@/lib/other-info';
import { logOiAction, tryGetServiceSupabase } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type ComparativesCheckRow = {
  id: string;
  org_id: string;
  engagement_id: string;
  check_key: string;
  assertion: string;
  status: string;
  notes: string | null;
  linked_flag_id: string | null;
  checked_by: string | null;
  checked_at: string | null;
};

type ComparativesCheckInsert = Omit<ComparativesCheckRow, 'checked_at' | 'checked_by' | 'notes' | 'linked_flag_id'> & {
  notes?: string | null;
  linked_flag_id?: string | null;
  checked_by?: string | null;
  checked_at?: string | null;
};

const VALID_STATUSES = new Set<string>(COMPARATIVE_STATUSES);

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId');
  const engagementId = searchParams.get('engagementId');

  if (!orgId || !engagementId) {
    return badRequest('orgId and engagementId are required query parameters.');
  }

  const supabase = tryGetServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ checks: [] });
  }
  const { data, error } = await supabase
    .from('comparatives_checks')
    .select('*')
    .eq('org_id', orgId)
    .eq('engagement_id', engagementId)
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (data && data.length > 0) {
    return NextResponse.json({ checks: data });
  }

  const seeded: ComparativesCheckInsert[] = DEFAULT_COMPARATIVE_CHECKS.map((item) => ({
    id: randomUUID(),
    org_id: orgId,
    engagement_id: engagementId,
    check_key: item.key,
    assertion: item.assertion,
    status: 'pending',
  }));

  const { data: inserted, error: seedError } = await supabase
    .from('comparatives_checks')
    .insert(seeded)
    .select();

  if (seedError) {
    return NextResponse.json({ error: seedError.message }, { status: 500 });
  }

  return NextResponse.json({ checks: inserted ?? [] });
}

interface UpsertCheckPayload {
  orgId?: string;
  engagementId?: string;
  actorId?: string;
  checkKey?: string;
  assertion?: string;
  status?: string;
  notes?: string | null;
  linkedFlagId?: string | null;
}

export async function POST(request: NextRequest) {
  let payload: UpsertCheckPayload;
  try {
    payload = (await request.json()) as UpsertCheckPayload;
  } catch {
    return badRequest('Invalid JSON body.');
  }

  const { orgId, engagementId, actorId, checkKey, assertion } = payload;

  if (!orgId) {
    return badRequest('orgId is required.');
  }
  if (!engagementId) {
    return badRequest('engagementId is required.');
  }
  if (!actorId) {
    return badRequest('actorId is required.');
  }
  if (!checkKey) {
    return badRequest('checkKey is required.');
  }
  if (!assertion) {
    return badRequest('assertion is required.');
  }

  const status = payload.status && VALID_STATUSES.has(payload.status) ? payload.status : 'pending';

  const supabase = tryGetServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }
  const { data, error } = await supabase
    .from('comparatives_checks')
    .upsert(
      {
        org_id: orgId,
        engagement_id: engagementId,
        check_key: checkKey,
        assertion,
        status,
        notes: payload.notes ?? null,
        linked_flag_id: payload.linkedFlagId ?? null,
        checked_by: status === 'pending' ? null : actorId,
        checked_at: status === 'completed' ? new Date().toISOString() : null,
      },
      { onConflict: 'org_id,engagement_id,check_key' },
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logOiAction(supabase, {
    orgId,
    userId: actorId,
    action: 'OI_UPLOADED',
    entityId: data?.id,
    metadata: {
      status: data?.status,
      checkKey,
    },
  });

  return NextResponse.json({ check: data }, { status: 201 });
}

interface UpdateCheckPayload {
  orgId?: string;
  actorId?: string;
  checkId?: string;
  status?: string;
  notes?: string | null;
  linkedFlagId?: string | null;
}

export async function PATCH(request: NextRequest) {
  let payload: UpdateCheckPayload;
  try {
    payload = (await request.json()) as UpdateCheckPayload;
  } catch {
    return badRequest('Invalid JSON body.');
  }

  const { orgId, actorId, checkId } = payload;
  if (!orgId) {
    return badRequest('orgId is required.');
  }
  if (!actorId) {
    return badRequest('actorId is required.');
  }
  if (!checkId) {
    return badRequest('checkId is required.');
  }

  const updates: Record<string, unknown> = {};

  if (payload.status) {
    if (!VALID_STATUSES.has(payload.status)) {
      return badRequest(`Unsupported status value: ${payload.status}`);
    }
    updates.status = payload.status;
    updates.checked_by = payload.status === 'pending' ? null : actorId;
    updates.checked_at = payload.status === 'completed' ? new Date().toISOString() : null;
  }

  if (payload.notes !== undefined) {
    updates.notes = payload.notes;
  }

  if (payload.linkedFlagId !== undefined) {
    updates.linked_flag_id = payload.linkedFlagId;
  }

  if (Object.keys(updates).length === 0) {
    return badRequest('No updates provided.');
  }

  const supabase = tryGetServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }
  const { data, error } = await supabase
    .from('comparatives_checks')
    .update(updates)
    .eq('id', checkId)
    .eq('org_id', orgId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logOiAction(supabase, {
    orgId,
    userId: actorId,
    action: 'OI_RESOLVED',
    entityId: checkId,
    metadata: {
      status: data?.status,
    },
  });

  return NextResponse.json({ check: data });
}
