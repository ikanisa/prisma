import { NextResponse, type NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { recordSpecialistActivity } from '@/lib/supabase/activity';

const STANDARD_EXPERT = 'ISA 620';
const ALLOWED_STATUSES = new Set(['draft', 'in_review', 'final']);

function getActorId(request: NextRequest): string | null {
  const header = request.headers.get('x-user-id');
  return header && header.trim().length > 0 ? header.trim() : null;
}

function normalizeStandardRefs(input: unknown): string[] | undefined {
  if (!Array.isArray(input)) {
    return undefined;
  }

  const refs = input
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter((value) => value.length > 0);

  if (refs.length === 0) {
    return [STANDARD_EXPERT];
  }

  return Array.from(new Set([STANDARD_EXPERT, ...refs]));
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
    return NextResponse.json({ error: 'Invalid specialist id' }, { status: 400 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();
  const supabaseUnsafe = supabase as SupabaseClient;

  const updates: Record<string, unknown> = {};

  if ('area' in payload) {
    if (typeof payload.area !== 'string' || !payload.area.trim()) {
      return NextResponse.json({ error: 'area must be a non-empty string' }, { status: 400 });
    }
    updates.area = payload.area.trim();
  }

  if ('specialistName' in payload) {
    if (typeof payload.specialistName !== 'string' || !payload.specialistName.trim()) {
      return NextResponse.json(
        { error: 'specialistName must be a non-empty string' },
        { status: 400 },
      );
    }
    updates.specialist_name = payload.specialistName.trim();
  }

  const optionalMappings: Record<string, string> = {
    specialistFirm: 'specialist_firm',
    scopeOfWork: 'scope_of_work',
    competenceAssessment: 'competence_assessment',
    objectivityAssessment: 'objectivity_assessment',
    workPerformed: 'work_performed',
    resultsSummary: 'results_summary',
    conclusion: 'conclusion',
  };

  for (const [key, column] of Object.entries(optionalMappings)) {
    if (key in payload) {
      updates[column] = asNullableString(payload[key]);
    }
  }

  if ('status' in payload) {
    if (typeof payload.status !== 'string' || !ALLOWED_STATUSES.has(payload.status)) {
      return NextResponse.json({ error: 'status is invalid' }, { status: 400 });
    }
    updates.status = payload.status;
    if (payload.status !== 'final') {
      updates.concluded_by = null;
      updates.concluded_at = null;
    }
  }

  const normalizedRefs = normalizeStandardRefs(payload.standardRefs);
  if (normalizedRefs) {
    updates.standard_refs = normalizedRefs;
  }

  const conclude = payload.conclude === true;
  if (conclude || updates.status === 'final') {
    updates.status = 'final';
    updates.concluded_by = actorId;
    updates.concluded_at = new Date().toISOString();
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields provided to update' }, { status: 400 });
  }

  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabaseUnsafe
    .from('audit_specialist_experts')
    .update(updates)
    .eq('id', recordId)
    .select('*')
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Expert evaluation not found' }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const action = data.status === 'final' ? 'EXP_EXPERT_CONCLUDED' : 'EXP_EXPERT_UPDATED';

  await recordSpecialistActivity(supabase, {
    orgId: data.org_id,
    userId: actorId,
    action,
    entityId: data.id,
    metadata: {
      engagementId: data.engagement_id,
      status: data.status,
      standards: data.standard_refs ?? [STANDARD_EXPERT],
      type: 'expert',
    },
  });

  return NextResponse.json({ expert: data });
}
