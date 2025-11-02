import { NextResponse, type NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseServiceClient } from '@/lib/supabase/server';
import { recordSpecialistActivity } from '@/lib/supabase/activity';
import { invalidateSpecialistsCache } from '@/lib/specialists/cache';

const STANDARD_INTERNAL = 'ISA 610';
const ALLOWED_STATUSES = new Set(['draft', 'in_review', 'final']);

function normalizeStandardRefs(input: unknown): string[] {
  const extras = Array.isArray(input)
    ? input
        .map((value) => (typeof value === 'string' ? value.trim() : ''))
        .filter((value) => value.length > 0)
    : [];
  return Array.from(new Set([STANDARD_INTERNAL, ...extras]));
}

function getActorId(request: NextRequest): string | null {
  const header = request.headers.get('x-user-id');
  return header && header.trim().length > 0 ? header.trim() : null;
}

export async function POST(request: NextRequest) {
  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const actorId = getActorId(request);
  if (!actorId) {
    return NextResponse.json({ error: 'x-user-id header required' }, { status: 401 });
  }

  const orgId = typeof payload.orgId === 'string' ? payload.orgId.trim() : '';
  const engagementId = typeof payload.engagementId === 'string' ? payload.engagementId.trim() : '';
  const relianceArea = typeof payload.relianceArea === 'string' ? payload.relianceArea.trim() : '';

  if (!orgId || !engagementId || !relianceArea) {
    return NextResponse.json(
      { error: 'orgId, engagementId, and relianceArea are required' },
      { status: 400 },
    );
  }

  const statusValue =
    typeof payload.status === 'string' && ALLOWED_STATUSES.has(payload.status)
      ? (payload.status as string)
      : 'draft';

  const supabase = getSupabaseServiceClient();
  const supabaseUnsafe = supabase as SupabaseClient;

  const { data, error } = await supabaseUnsafe
    .from('audit_specialist_internal')
    .insert({
      org_id: orgId,
      engagement_id: engagementId,
      reliance_area: relianceArea,
      internal_audit_lead:
        typeof payload.internalAuditLead === 'string' ? payload.internalAuditLead.trim() : null,
      scope_of_reliance:
        typeof payload.scopeOfReliance === 'string' ? payload.scopeOfReliance.trim() : null,
      competence_evaluation:
        typeof payload.competenceEvaluation === 'string'
          ? payload.competenceEvaluation.trim()
          : null,
      objectivity_evaluation:
        typeof payload.objectivityEvaluation === 'string'
          ? payload.objectivityEvaluation.trim()
          : null,
      work_evaluation:
        typeof payload.workEvaluation === 'string' ? payload.workEvaluation.trim() : null,
      risk_assessment:
        typeof payload.riskAssessment === 'string' ? payload.riskAssessment.trim() : null,
      conclusion: typeof payload.conclusion === 'string' ? payload.conclusion.trim() : null,
      prepared_by: actorId,
      status: statusValue as typeof statusValue,
      standard_refs: normalizeStandardRefs(payload.standardRefs),
    })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'An internal audit reliance evaluation already exists for this engagement' },
        { status: 409 },
      );
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await recordSpecialistActivity(supabase, {
    orgId,
    userId: actorId,
    action: 'EXP_INTERNAL_RECORDED',
    entityId: data.id,
    metadata: {
      engagementId,
      status: data.status,
      standards: data.standard_refs,
      type: 'internal_audit',
    },
  });

  await invalidateSpecialistsCache(orgId, engagementId);

  return NextResponse.json({ internal: data }, { status: 201 });
}
