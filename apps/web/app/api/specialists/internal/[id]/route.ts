import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseServiceClient } from '../../../../../lib/supabase/server';
import { recordSpecialistActivity } from '../../../../../lib/supabase/activity';

const STANDARD_INTERNAL = 'ISA 610';
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
    return [STANDARD_INTERNAL];
  }

  return Array.from(new Set([STANDARD_INTERNAL, ...refs]));
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
  } catch (error) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const supabase = getSupabaseServiceClient();

  const updates: Record<string, unknown> = {};

  if ('relianceArea' in payload) {
    if (typeof payload.relianceArea !== 'string' || !payload.relianceArea.trim()) {
      return NextResponse.json({ error: 'relianceArea must be a non-empty string' }, { status: 400 });
    }
    updates.reliance_area = payload.relianceArea.trim();
  }

  const optionalMappings: Record<string, string> = {
    internalAuditLead: 'internal_audit_lead',
    scopeOfReliance: 'scope_of_reliance',
    competenceEvaluation: 'competence_evaluation',
    objectivityEvaluation: 'objectivity_evaluation',
    workEvaluation: 'work_evaluation',
    riskAssessment: 'risk_assessment',
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

  const { data, error } = await supabase
    .from('audit_specialist_internal')
    .update(updates)
    .eq('id', recordId)
    .select('*')
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Internal audit evaluation not found' }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const action = data.status === 'final' ? 'EXP_INTERNAL_CONCLUDED' : 'EXP_INTERNAL_UPDATED';

  await recordSpecialistActivity(supabase, {
    orgId: data.org_id,
    userId: actorId,
    action,
    entityId: data.id,
    metadata: {
      engagementId: data.engagement_id,
      status: data.status,
      standards: data.standard_refs ?? [STANDARD_INTERNAL],
      type: 'internal_audit',
    },
  });

  return NextResponse.json({ internal: data });
}
