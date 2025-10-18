import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { logGroupActivity } from '@/lib/group/activity';
import { getOrgIdFromRequest, isUuid, resolveUserId, toJsonRecord } from '@/lib/group/request';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type GroupInstructionInsert = {
  org_id: string;
  engagement_id: string;
  component_id: string;
  instruction_title: string;
  instruction_body?: string | null;
  status?: string | null;
  due_at?: string | null;
  sent_by: string;
  sent_at: string;
  metadata?: Record<string, unknown> | null;
};

function getSupabaseClients() {
  const supabase = getSupabaseServerClient();
  return { supabase, supabaseUnsafe: supabase as SupabaseClient };
}

function buildInsertPayload(orgId: string, userId: string, body: Record<string, unknown>): GroupInstructionInsert {
  if (typeof body.engagementId !== 'string' || !isUuid(body.engagementId)) {
    throw new Error('engagementId must be a UUID');
  }
  if (typeof body.componentId !== 'string' || !isUuid(body.componentId)) {
    throw new Error('componentId must be a UUID');
  }
  if (typeof body.title !== 'string' || !body.title.trim()) {
    throw new Error('title is required');
  }

  const payload: GroupInstructionInsert = {
    org_id: orgId,
    engagement_id: body.engagementId.trim(),
    component_id: body.componentId.trim(),
    instruction_title: body.title.trim(),
    status: 'sent',
    sent_by: userId,
    sent_at: new Date().toISOString(),
  };

  if (typeof body.body === 'string' && body.body.trim()) {
    payload.instruction_body = body.body.trim();
  }
  if (typeof body.status === 'string' && body.status.trim()) {
    payload.status = body.status.trim();
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
  const { supabaseUnsafe } = getSupabaseClients();
  const orgId = getOrgIdFromRequest(request);
  if (!orgId) {
    return NextResponse.json({ error: 'orgId is required' }, { status: 400 });
  }

  const url = new URL(request.url);
  const engagementId = url.searchParams.get('engagementId');
  const componentId = url.searchParams.get('componentId');
  const status = url.searchParams.get('status');

  const query = supabaseUnsafe
    .from('group_instructions')
    .select('*')
    .eq('org_id', orgId)
    .order('sent_at', { ascending: false });

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
  if (status) {
    query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ instructions: data ?? [] });
}

export async function POST(request: NextRequest) {
  const { supabase, supabaseUnsafe } = getSupabaseClients();
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

  let insertPayload: GroupInstructionInsert;
  try {
    insertPayload = buildInsertPayload(orgId, userId, body);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }

  const { data, error } = await supabaseUnsafe
    .from('group_instructions')
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await logGroupActivity({
    supabase,
    action: 'GRP_INSTRUCTION_SENT',
    orgId,
    userId,
    entityId: data?.id ?? null,
    entityType: 'group_instruction',
    metadata: {
      status: data?.status ?? null,
      component_id: data?.component_id ?? null,
    },
  });

  return NextResponse.json({ instruction: data });
}
