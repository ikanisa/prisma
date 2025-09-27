import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseServiceClient } from '../../../../lib/supabase/server';
import { recordSpecialistActivity } from '../../../../lib/supabase/activity';

const STANDARD_EXPERT = 'ISA 620';
const ALLOWED_STATUSES = new Set(['draft', 'in_review', 'final']);

function normalizeStandardRefs(input: unknown): string[] {
  const extras = Array.isArray(input)
    ? input
        .map((value) => (typeof value === 'string' ? value.trim() : ''))
        .filter((value) => value.length > 0)
    : [];
  return Array.from(new Set([STANDARD_EXPERT, ...extras]));
}

function getActorId(request: NextRequest): string | null {
  const header = request.headers.get('x-user-id');
  return header && header.trim().length > 0 ? header.trim() : null;
}

export async function POST(request: NextRequest) {
  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch (error) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const actorId = getActorId(request);
  if (!actorId) {
    return NextResponse.json({ error: 'x-user-id header required' }, { status: 401 });
  }

  const orgId = typeof payload.orgId === 'string' ? payload.orgId.trim() : '';
  const engagementId = typeof payload.engagementId === 'string' ? payload.engagementId.trim() : '';
  const area = typeof payload.area === 'string' ? payload.area.trim() : '';
  const specialistName =
    typeof payload.specialistName === 'string' ? payload.specialistName.trim() : '';

  if (!orgId || !engagementId || !area || !specialistName) {
    return NextResponse.json(
      { error: 'orgId, engagementId, area, and specialistName are required' },
      { status: 400 },
    );
  }

  const statusValue =
    typeof payload.status === 'string' && ALLOWED_STATUSES.has(payload.status)
      ? (payload.status as string)
      : 'draft';

  const supabase = getSupabaseServiceClient();

  const { data, error } = await supabase
    .from('audit_specialist_experts')
    .insert({
      org_id: orgId,
      engagement_id: engagementId,
      area,
      specialist_name: specialistName,
      specialist_firm:
        typeof payload.specialistFirm === 'string' ? payload.specialistFirm.trim() : null,
      scope_of_work:
        typeof payload.scopeOfWork === 'string' ? payload.scopeOfWork.trim() : null,
      competence_assessment:
        typeof payload.competenceAssessment === 'string'
          ? payload.competenceAssessment.trim()
          : null,
      objectivity_assessment:
        typeof payload.objectivityAssessment === 'string'
          ? payload.objectivityAssessment.trim()
          : null,
      work_performed:
        typeof payload.workPerformed === 'string' ? payload.workPerformed.trim() : null,
      results_summary:
        typeof payload.resultsSummary === 'string' ? payload.resultsSummary.trim() : null,
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
        { error: 'An expert evaluation already exists for this engagement' },
        { status: 409 },
      );
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await recordSpecialistActivity(supabase, {
    orgId,
    userId: actorId,
    action: 'EXP_EXPERT_RECORDED',
    entityId: data.id,
    metadata: {
      engagementId,
      status: data.status,
      standards: data.standard_refs,
      type: 'expert',
    },
  });

  return NextResponse.json({ expert: data }, { status: 201 });
}
