import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { FLAG_SEVERITIES, FLAG_STATUSES } from '@/lib/other-info';
import { logOiAction, tryGetServiceSupabase } from '@/lib/supabase';
import { ensureOrgAccess, HttpError, resolveCurrentUser } from '../../soc/_common';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type OiFlagRow = {
  id: string;
  org_id: string;
  engagement_id: string;
  document_id: string | null;
  category: string;
  description: string;
  severity: string;
  status: string;
  metadata: Record<string, unknown> | null;
  raised_by: string;
  resolution_notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

type OiFlagInsert = {
  id?: string;
  org_id: string;
  engagement_id: string;
  document_id?: string | null;
  category: string;
  description: string;
  severity: string;
  status: string;
  metadata?: Record<string, unknown> | null;
  raised_by: string;
  resolution_notes?: string | null;
};

type OiFlagUpdate = Partial<{
  status: string;
  resolution_notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  metadata: Record<string, unknown> | null;
}>;

const VALID_SEVERITIES = new Set<string>(FLAG_SEVERITIES);
const VALID_STATUSES = new Set<string>(FLAG_STATUSES);

function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

function handleAuthorizationError(error: unknown): NextResponse {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  logger.error('other_info.flags_authorization_failed', { error });
  return NextResponse.json({ error: 'Failed to authorize request.' }, { status: 500 });
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
    return NextResponse.json({ flags: [] });
  }

  try {
    const { userId } = await resolveCurrentUser(request, supabase);
    await ensureOrgAccess(supabase, orgId, userId, 'EMPLOYEE');
  } catch (error) {
    return handleAuthorizationError(error);
  }

  const { data, error } = await supabase
    .from('oi_flags')
    .select('*')
    .eq('org_id', orgId)
    .eq('engagement_id', engagementId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ flags: data ?? [] });
}

interface CreateFlagPayload {
  orgId?: string;
  engagementId?: string;
  actorId?: string;
  documentId?: string | null;
  category?: string;
  description?: string;
  severity?: string;
  status?: string;
  metadata?: Record<string, unknown> | null;
  resolutionNotes?: string | null;
}

export async function POST(request: NextRequest) {
  let payload: CreateFlagPayload;
  try {
    payload = (await request.json()) as CreateFlagPayload;
  } catch {
    return badRequest('Invalid JSON body.');
  }

  const { orgId, engagementId, description, category } = payload;

  if (!orgId) {
    return badRequest('orgId is required.');
  }
  if (!engagementId) {
    return badRequest('engagementId is required.');
  }
  if (!description) {
    return badRequest('description is required.');
  }
  if (!category) {
    return badRequest('category is required.');
  }

  const severity = payload.severity && VALID_SEVERITIES.has(payload.severity) ? payload.severity : 'medium';
  const status = payload.status && VALID_STATUSES.has(payload.status) ? payload.status : 'open';

  const supabase = tryGetServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }
  let userId: string;
  try {
    ({ userId } = await resolveCurrentUser(request, supabase));
    await ensureOrgAccess(supabase, orgId, userId, 'EMPLOYEE');
  } catch (error) {
    return handleAuthorizationError(error);
  }

  const actorId = payload.actorId ?? userId;
  if (payload.actorId && payload.actorId !== userId) {
    return NextResponse.json({ error: 'actorId does not match the authenticated user.' }, { status: 403 });
  }

  const flagId = randomUUID();
  const insertPayload: OiFlagInsert = {
    id: flagId,
    org_id: orgId,
    engagement_id: engagementId,
    document_id: payload.documentId ?? null,
    category,
    description,
    severity,
    status,
    metadata: payload.metadata ?? null,
    raised_by: actorId,
    resolution_notes: payload.resolutionNotes ?? null,
  };

  const { data, error } = (await supabase
    .from('oi_flags')
    .insert(insertPayload)
    .select()
    .single()) as { data: OiFlagRow | null; error: { message: string } | null };

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logOiAction(supabase, {
    orgId,
    userId: actorId,
    action: 'OI_FLAG_CREATED',
    entityId: flagId,
    metadata: {
      severity,
      category,
    },
  });

  return NextResponse.json({ flag: data }, { status: 201 });
}

interface UpdateFlagPayload {
  orgId?: string;
  actorId?: string;
  flagId?: string;
  status?: string;
  resolutionNotes?: string | null;
  metadata?: Record<string, unknown> | null;
}

export async function PATCH(request: NextRequest) {
  let payload: UpdateFlagPayload;
  try {
    payload = (await request.json()) as UpdateFlagPayload;
  } catch {
    return badRequest('Invalid JSON body.');
  }

  const { orgId, flagId } = payload;
  if (!orgId) {
    return badRequest('orgId is required.');
  }
  if (!flagId) {
    return badRequest('flagId is required.');
  }

  const supabase = tryGetServiceSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }
  let userId: string;
  try {
    ({ userId } = await resolveCurrentUser(request, supabase));
    await ensureOrgAccess(supabase, orgId, userId, 'EMPLOYEE');
  } catch (error) {
    return handleAuthorizationError(error);
  }

  const actorId = payload.actorId ?? userId;
  if (payload.actorId && payload.actorId !== userId) {
    return NextResponse.json({ error: 'actorId does not match the authenticated user.' }, { status: 403 });
  }

  const updates: OiFlagUpdate = {};

  if (payload.status) {
    if (!VALID_STATUSES.has(payload.status)) {
      return badRequest(`Unsupported status value: ${payload.status}`);
    }
    updates.status = payload.status;

    if (payload.status === 'resolved') {
      updates.resolved_by = actorId;
      updates.resolved_at = new Date().toISOString();
      updates.resolution_notes = payload.resolutionNotes ?? null;
    } else if (payload.resolutionNotes !== undefined) {
      updates.resolution_notes = payload.resolutionNotes;
    }
  } else if (payload.resolutionNotes !== undefined) {
    updates.resolution_notes = payload.resolutionNotes;
  }

  if (payload.metadata !== undefined) {
    updates.metadata = payload.metadata ?? null;
  }

  if (Object.keys(updates).length === 0) {
    return badRequest('No updates provided.');
  }

  const { data, error } = (await supabase
    .from('oi_flags')
    .update(updates)
    .eq('id', flagId)
    .eq('org_id', orgId)
    .select()
    .single()) as { data: OiFlagRow | null; error: { message: string } | null };

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const action = payload.status === 'resolved' ? 'OI_FLAG_RESOLVED' : 'OI_FLAG_UPDATED';
  await logOiAction(supabase, {
    orgId,
    userId: actorId,
    action,
    entityId: flagId,
    metadata: {
      status: data?.status,
    },
  });

  return NextResponse.json({ flag: data });
}
