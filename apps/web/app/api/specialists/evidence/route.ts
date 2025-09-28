import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseServiceClient } from '../../../../lib/supabase/server';
import { recordSpecialistActivity } from '../../../../lib/supabase/activity';

const STANDARD_EXPERT = 'ISA 620';
const STANDARD_INTERNAL = 'ISA 610';

type TargetType = 'expert' | 'internal';

type EvidencePayload = {
  orgId: string;
  engagementId: string;
  targetType: TargetType;
  targetId: string;
  documentId?: string | null;
  evidenceUrl?: string | null;
  description?: string | null;
  notes?: string | null;
  standardRefs?: unknown;
};

function getActorId(request: NextRequest): string | null {
  const header = request.headers.get('x-user-id');
  return header && header.trim().length > 0 ? header.trim() : null;
}

function normalizeStandardRefs(targetType: TargetType, refs: unknown): string[] {
  const base = targetType === 'expert' ? STANDARD_EXPERT : STANDARD_INTERNAL;
  const extras = Array.isArray(refs)
    ? refs
        .map((value) => (typeof value === 'string' ? value.trim() : ''))
        .filter((value) => value.length > 0)
    : [];
  return Array.from(new Set([base, ...extras]));
}

export async function POST(request: NextRequest) {
  let rawPayload: Record<string, unknown>;
  try {
    rawPayload = (await request.json()) as Record<string, unknown>;
  } catch (error) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const actorId = getActorId(request);
  if (!actorId) {
    return NextResponse.json({ error: 'x-user-id header required' }, { status: 401 });
  }

  const payload: Partial<EvidencePayload> = {
    orgId: typeof rawPayload.orgId === 'string' ? rawPayload.orgId.trim() : undefined,
    engagementId:
      typeof rawPayload.engagementId === 'string' ? rawPayload.engagementId.trim() : undefined,
    targetType:
      rawPayload.targetType === 'expert' || rawPayload.targetType === 'internal'
        ? rawPayload.targetType
        : undefined,
    targetId: typeof rawPayload.targetId === 'string' ? rawPayload.targetId.trim() : undefined,
    documentId:
      typeof rawPayload.documentId === 'string'
        ? rawPayload.documentId.trim()
        : rawPayload.documentId === null
        ? null
        : undefined,
    evidenceUrl:
      typeof rawPayload.evidenceUrl === 'string'
        ? rawPayload.evidenceUrl.trim()
        : rawPayload.evidenceUrl === null
        ? null
        : undefined,
    description:
      typeof rawPayload.description === 'string'
        ? rawPayload.description.trim()
        : rawPayload.description === null
        ? null
        : undefined,
    notes:
      typeof rawPayload.notes === 'string' ? rawPayload.notes.trim() : undefined,
    standardRefs: rawPayload.standardRefs,
  };

  if (!payload.orgId || !payload.engagementId || !payload.targetType || !payload.targetId) {
    return NextResponse.json(
      { error: 'orgId, engagementId, targetType, and targetId are required' },
      { status: 400 },
    );
  }

  if (!payload.documentId && !payload.evidenceUrl) {
    return NextResponse.json(
      { error: 'Either documentId or evidenceUrl must be provided' },
      { status: 400 },
    );
  }

  const supabase = getSupabaseServiceClient();
  const targetType = payload.targetType as TargetType;

  const insertPayload: Record<string, unknown> = {
    org_id: payload.orgId,
    engagement_id: payload.engagementId,
    document_id: payload.documentId ?? null,
    evidence_url: payload.evidenceUrl ?? null,
    description: payload.description ?? null,
    notes: payload.notes ?? null,
    standard_refs: normalizeStandardRefs(targetType, payload.standardRefs),
    uploaded_by: actorId,
  };

  if (targetType === 'expert') {
    insertPayload.expert_assessment_id = payload.targetId;
  } else {
    insertPayload.internal_assessment_id = payload.targetId;
  }

  const { data, error } = await supabase
    .from('audit_specialist_evidence')
    .insert(insertPayload)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const action = 'EXP_EVIDENCE_ATTACHED';
  const baseStandard = targetType === 'expert' ? STANDARD_EXPERT : STANDARD_INTERNAL;

  await recordSpecialistActivity(supabase, {
    orgId: payload.orgId,
    userId: actorId,
    action,
    entityId: data.id,
    metadata: {
      engagementId: payload.engagementId,
      targetId: payload.targetId,
      targetType,
      documentId: payload.documentId ?? null,
      evidenceUrl: payload.evidenceUrl ?? null,
      standards: Array.from(new Set([baseStandard, ...(data.standard_refs ?? [])])),
    },
  });

  return NextResponse.json({ evidence: data }, { status: 201 });
}
