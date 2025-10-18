import { NextResponse } from 'next/server';
import { ZodError, z } from 'zod';

import { getServiceSupabaseClient } from '@/lib/supabase-server';
import { upsertAuditModuleRecord } from '@/lib/audit/module-records';
import { logAuditActivity } from '@/lib/audit/activity-log';
import { attachRequestId, getOrCreateRequestId } from '@/app/lib/observability';
import { createApiGuard } from '@/app/lib/api-guard';

const upsertSchema = z.object({
  orgId: z.string().uuid(),
  engagementId: z.string().uuid(),
  assessmentId: z.string().uuid().optional(),
  specialistKind: z.enum(['EXTERNAL_SPECIALIST', 'INTERNAL_AUDIT']),
  name: z.string().min(1),
  firm: z.string().optional(),
  scope: z.string().optional(),
  competenceRationale: z.string().optional(),
  objectivityRationale: z.string().optional(),
  workPerformed: z.string().optional(),
  conclusion: z.enum(['RELIED', 'PARTIAL', 'NOT_RELIED', 'PENDING']).optional(),
  conclusionNotes: z.string().optional(),
  memoDocumentId: z.string().uuid().optional(),
  userId: z.string().uuid(),
});

export async function GET(request: Request) {
  const requestId = getOrCreateRequestId(request);
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId');
  const engagementId = searchParams.get('engagementId');

  if (!orgId || !engagementId) {
    return NextResponse.json(
      { error: 'orgId and engagementId query parameters are required.' },
      attachRequestId({ status: 400 }, requestId),
    );
  }

  const supabase = await getServiceSupabaseClient();
  const { data, error } = await supabase
    .from('specialist_assessments')
    .select('*')
    .eq('org_id', orgId)
    .eq('engagement_id', engagementId)
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: error.message ?? 'Failed to load specialist assessments.' },
      attachRequestId({ status: 500 }, requestId),
    );
  }

  return NextResponse.json({ assessments: data ?? [] }, attachRequestId({ status: 200 }, requestId));
}

export async function POST(request: Request) {
  const requestId = getOrCreateRequestId(request);
  const supabase = await getServiceSupabaseClient();
  let payload;
  try {
    payload = upsertSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.flatten() },
        attachRequestId({ status: 400 }, requestId),
      );
    }
    return NextResponse.json(
      { error: 'Invalid JSON payload.' },
      attachRequestId({ status: 400 }, requestId),
    );
  }

  const isUpdate = Boolean(payload.assessmentId);
  const resource = isUpdate
    ? `exp:assessment:update:${payload.assessmentId}`
    : `exp:assessment:create:${payload.engagementId}`;

  const guard = await createApiGuard({
    request,
    supabase,
    requestId,
    orgId: payload.orgId,
    resource,
    rateLimit: { limit: 60, windowSeconds: 60 },
  });
  if (guard.rateLimitResponse) return guard.rateLimitResponse;
  if (guard.replayResponse) return guard.replayResponse;

  let assessmentId = payload.assessmentId ?? null;
  let assessmentRecord: Record<string, unknown> | null = null;

  if (assessmentId) {
    const { data, error } = await supabase
      .from('specialist_assessments')
      .update({
        specialist_kind: payload.specialistKind,
        name: payload.name,
        firm: payload.firm ?? null,
        scope: payload.scope ?? null,
        competence_rationale: payload.competenceRationale ?? null,
        objectivity_rationale: payload.objectivityRationale ?? null,
        work_performed: payload.workPerformed ?? null,
        conclusion: payload.conclusion ?? 'PENDING',
        conclusion_notes: payload.conclusionNotes ?? null,
        memo_document_id: payload.memoDocumentId ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', assessmentId)
      .eq('org_id', payload.orgId)
      .select()
      .maybeSingle();
    if (error || !data) {
      return guard.json(
        { error: error?.message ?? 'Failed to update assessment.' },
        { status: 500 },
      );
    }
    assessmentRecord = data;
  } else {
    const { data, error } = await supabase
      .from('specialist_assessments')
      .insert({
        org_id: payload.orgId,
        engagement_id: payload.engagementId,
        specialist_kind: payload.specialistKind,
        name: payload.name,
        firm: payload.firm ?? null,
        scope: payload.scope ?? null,
        competence_rationale: payload.competenceRationale ?? null,
        objectivity_rationale: payload.objectivityRationale ?? null,
        work_performed: payload.workPerformed ?? null,
        conclusion: payload.conclusion ?? 'PENDING',
        conclusion_notes: payload.conclusionNotes ?? null,
        memo_document_id: payload.memoDocumentId ?? null,
        prepared_by_user_id: payload.userId,
        prepared_at: new Date().toISOString(),
      })
      .select()
      .maybeSingle();
    if (error || !data) {
      return guard.json(
        { error: error?.message ?? 'Failed to create assessment.' },
        { status: 500 },
      );
    }
    assessmentId = data.id;
    assessmentRecord = data;
  }

  try {
    await upsertAuditModuleRecord(supabase, {
      orgId: payload.orgId,
      engagementId: payload.engagementId,
      moduleCode: 'EXP1',
      recordRef: assessmentId!,
      title: `${payload.specialistKind === 'EXTERNAL_SPECIALIST' ? 'External specialist' : 'Internal audit'} assessment`,
      recordStatus: 'IN_PROGRESS',
      approvalState: 'DRAFT',
      currentStage: 'PREPARER',
      preparedByUserId: payload.userId,
      metadata: {
        specialistKind: payload.specialistKind,
        conclusion: payload.conclusion ?? 'PENDING',
      },
      userId: payload.userId,
    });
  } catch (moduleError) {
    return guard.json(
      { error: moduleError instanceof Error ? moduleError.message : 'Failed to update specialist module record.' },
      { status: 500 },
    );
  }

  const action = payload.specialistKind === 'EXTERNAL_SPECIALIST' ? 'EXP_EXPERT_ASSESSED' : 'EXP_IA_ASSESSED';
  const metadataConclusion =
    payload.conclusion ?? ((assessmentRecord?.conclusion as string | undefined) ?? 'PENDING');

  await logAuditActivity(supabase, {
    orgId: payload.orgId,
    userId: payload.userId,
    action,
    entityType: 'AUDIT_SPECIALIST',
    entityId: assessmentId!,
    metadata: {
      specialistKind: payload.specialistKind,
      name: payload.name,
      firm: payload.firm,
      conclusion: metadataConclusion,
      memoDocumentId: payload.memoDocumentId ?? null,
      requestId,
    },
  });

  return guard.respond({ assessmentId });
}
