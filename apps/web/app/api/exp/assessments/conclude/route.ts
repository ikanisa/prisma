import { NextResponse } from 'next/server';
import { ZodError, z } from 'zod';

import { getServiceSupabaseClient } from '../../../../../lib/supabase-server';
import { queueManagerReview } from '../../../../../lib/audit/approvals';
import { buildEvidenceManifest } from '../../../../../lib/audit/evidence';
import { attachRequestId, getOrCreateRequestId } from '../../../../lib/observability';
import { createApiGuard } from '../../../../lib/api-guard';

const concludeSchema = z.object({
  orgId: z.string().uuid(),
  engagementId: z.string().uuid(),
  assessmentId: z.string().uuid(),
  conclusion: z.enum(['RELIED', 'PARTIAL', 'NOT_RELIED', 'PENDING']),
  conclusionNotes: z.string().optional(),
  memoDocumentId: z.string().uuid().optional(),
  userId: z.string().uuid(),
});

export async function POST(request: Request) {
  const requestId = getOrCreateRequestId(request);
  const supabase = getServiceSupabaseClient();
  let payload;
  try {
    payload = concludeSchema.parse(await request.json());
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

  const guard = await createApiGuard({
    request,
    supabase,
    requestId,
    orgId: payload.orgId,
    resource: `exp:assessment:conclude:${payload.assessmentId}`,
    rateLimit: { limit: 45, windowSeconds: 60 },
  });
  if (guard.rateLimitResponse) return guard.rateLimitResponse;
  if (guard.replayResponse) return guard.replayResponse;

  const { data: assessment, error } = await supabase
    .from('specialist_assessments')
    .update({
      conclusion: payload.conclusion,
      conclusion_notes: payload.conclusionNotes ?? null,
      memo_document_id: payload.memoDocumentId ?? null,
      reviewed_by_user_id: payload.userId,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', payload.assessmentId)
    .eq('org_id', payload.orgId)
    .select()
    .maybeSingle();

  if (error || !assessment) {
    return guard.json(
      { error: error?.message ?? 'Failed to update assessment conclusion.' },
      { status: 500 },
    );
  }

  const manifest = buildEvidenceManifest({
    moduleCode: 'EXP1',
    recordRef: payload.assessmentId,
    attachments: payload.memoDocumentId
      ? [
          {
            documentId: payload.memoDocumentId,
            kind: 'SPECIALIST_MEMO',
          },
        ]
      : undefined,
    metadata: {
      conclusion: payload.conclusion,
      conclusionNotes: payload.conclusionNotes,
    },
  });

  try {
    await queueManagerReview(supabase, {
      orgId: payload.orgId,
      engagementId: payload.engagementId,
      moduleCode: 'EXP1',
      recordRef: payload.assessmentId,
      title: 'Specialist reliance conclusion',
      metadata: {
        conclusion: payload.conclusion,
        conclusionNotes: payload.conclusionNotes,
        manifest,
        requestId,
      },
      preparedByUserId: assessment.prepared_by_user_id,
      updatedByUserId: payload.userId,
    });
  } catch (moduleError) {
    return guard.json(
      { error: moduleError instanceof Error ? moduleError.message : 'Failed to queue specialist approval.' },
      { status: 500 },
    );
  }

  return guard.respond({ assessment });
}
