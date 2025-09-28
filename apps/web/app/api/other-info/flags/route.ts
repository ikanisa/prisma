import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { FLAG_SEVERITIES, FLAG_STATUSES } from '@/lib/other-info';
import { getServiceSupabase, logOiAction } from '@/lib/supabase';

const VALID_SEVERITIES = new Set<string>(FLAG_SEVERITIES);
const VALID_STATUSES = new Set<string>(FLAG_STATUSES);

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

  const supabase = getServiceSupabase();
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
  } catch (error) {
    return badRequest('Invalid JSON body.');
  }

  const { orgId, engagementId, actorId, description, category } = payload;

  if (!orgId) {
    return badRequest('orgId is required.');
  }
  if (!engagementId) {
    return badRequest('engagementId is required.');
  }
  if (!actorId) {
    return badRequest('actorId is required.');
  }
  if (!description) {
    return badRequest('description is required.');
  }
  if (!category) {
    return badRequest('category is required.');
  }

  const severity = payload.severity && VALID_SEVERITIES.has(payload.severity) ? payload.severity : 'medium';
  const status = payload.status && VALID_STATUSES.has(payload.status) ? payload.status : 'open';

  const supabase = getServiceSupabase();
  const flagId = randomUUID();
  const { data, error } = await supabase
    .from('oi_flags')
    .insert({
      id: flagId,
      org_id: orgId,
      engagement_id: engagementId,
      document_id: payload.documentId ?? null,
      category,
      description,
      severity,
      status,
      metadata: payload.metadata ?? {},
      raised_by: actorId,
      resolution_notes: payload.resolutionNotes ?? null,
    })
    .select()
    .single();

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
  } catch (error) {
    return badRequest('Invalid JSON body.');
  }

  const { orgId, actorId, flagId } = payload;
  if (!orgId) {
    return badRequest('orgId is required.');
  }
  if (!actorId) {
    return badRequest('actorId is required.');
  }
  if (!flagId) {
    return badRequest('flagId is required.');
  }

  const updates: Record<string, unknown> = {};

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

  if (payload.metadata) {
    updates.metadata = payload.metadata;
  }

  if (Object.keys(updates).length === 0) {
    return badRequest('No updates provided.');
  }

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('oi_flags')
    .update(updates)
    .eq('id', flagId)
    .eq('org_id', orgId)
    .select()
    .single();

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
