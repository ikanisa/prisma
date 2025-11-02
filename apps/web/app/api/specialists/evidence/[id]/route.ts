import { NextResponse, type NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { recordSpecialistActivity } from '@/lib/supabase/activity';
import { invalidateSpecialistsCache } from '@/lib/specialists/cache';

const STANDARD_EXPERT = 'ISA 620';
const STANDARD_INTERNAL = 'ISA 610';

type TargetType = 'expert' | 'internal';

function getActorId(request: NextRequest): string | null {
  const header = request.headers.get('x-user-id');
  return header && header.trim().length > 0 ? header.trim() : null;
}

function normalizeStandardRefs(targetType: TargetType, refs: unknown): string[] | undefined {
  if (!Array.isArray(refs)) {
    return undefined;
  }

  const base = targetType === 'expert' ? STANDARD_EXPERT : STANDARD_INTERNAL;
  const extras = refs
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter((value) => value.length > 0);

  if (extras.length === 0) {
    return [base];
  }

  return Array.from(new Set([base, ...extras]));
}

function asNullableString(value: unknown): string | null | undefined {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (value === null) {
    return null;
  }
  return undefined;
}

function asNullableIdentifier(value: unknown): string | null | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (value === null) {
    return null;
  }
  return undefined;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const actorId = getActorId(request);
  if (!actorId) {
    return NextResponse.json({ error: 'x-user-id header required' }, { status: 401 });
  }

  const recordId = params?.id?.trim();
  if (!recordId) {
    return NextResponse.json({ error: 'Invalid evidence id' }, { status: 400 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();
  const supabaseUnsafe = supabase as SupabaseClient;

  const { data: existing, error: fetchError } = await supabaseUnsafe
    .from('audit_specialist_evidence')
    .select('*')
    .eq('id', recordId)
    .single();

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return NextResponse.json({ error: 'Evidence record not found' }, { status: 404 });
    }
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const targetType: TargetType = existing.expert_assessment_id ? 'expert' : 'internal';

  const updates: Record<string, unknown> = {};

  if ('description' in payload) {
    updates.description = asNullableString(payload.description);
  }

  if ('notes' in payload) {
    updates.notes = asNullableString(payload.notes);
  }

  if ('documentId' in payload) {
    updates.document_id = asNullableIdentifier(payload.documentId);
  }

  if ('evidenceUrl' in payload) {
    updates.evidence_url = asNullableString(payload.evidenceUrl);
  }

  const normalizedRefs = normalizeStandardRefs(targetType, payload.standardRefs);
  if (normalizedRefs) {
    updates.standard_refs = normalizedRefs;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields provided to update' }, { status: 400 });
  }

  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabaseUnsafe
    .from('audit_specialist_evidence')
    .update(updates)
    .eq('id', recordId)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const baseStandard = targetType === 'expert' ? STANDARD_EXPERT : STANDARD_INTERNAL;

  await recordSpecialistActivity(supabase, {
    orgId: data.org_id,
    userId: actorId,
    action: 'EXP_EVIDENCE_UPDATED',
    entityId: data.id,
    metadata: {
      engagementId: data.engagement_id,
      targetType,
      targetId: targetType === 'expert' ? data.expert_assessment_id : data.internal_assessment_id,
      standards: Array.from(new Set([baseStandard, ...(data.standard_refs ?? [])])),
      documentId: data.document_id,
      evidenceUrl: data.evidence_url,
    },
  });

  await invalidateSpecialistsCache(data.org_id, data.engagement_id);

  return NextResponse.json({ evidence: data });
}
