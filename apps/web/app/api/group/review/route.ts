import { NextResponse } from 'next/server';
import { ZodError, z } from 'zod';
import { getServiceSupabaseClient } from '../../../../../lib/supabase-server';
import { ensureAuditRecordApprovalStage, upsertAuditModuleRecord } from '../../../../../lib/audit/module-records';
import { logAuditActivity } from '../../../../../lib/audit/activity-log';
import { attachRequestId, getOrCreateRequestId } from '../../../lib/observability';
import { createApiGuard } from '../../../lib/api-guard';

const reviewSchema = z.object({
  orgId: z.string().uuid(),
  engagementId: z.string().uuid(),
  componentId: z.string().uuid(),
  reviewerUserId: z.string().uuid(),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETE']).optional(),
  notes: z.string().optional(),
  userId: z.string().uuid(),
});

export async function POST(request: Request) {
  const requestId = getOrCreateRequestId(request);
  const supabase = await getServiceSupabaseClient();
  let payload;
  try {
    payload = reviewSchema.parse(await request.json());
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
    resource: `group:review:${payload.componentId}`,
    rateLimit: { limit: 60, windowSeconds: 60 },
  });
  if (guard.rateLimitResponse) return guard.rateLimitResponse;
  if (guard.replayResponse) return guard.replayResponse;

  const { data: existing } = await supabase
    .from('group_reviews')
    .select('id')
    .eq('org_id', payload.orgId)
    .eq('engagement_id', payload.engagementId)
    .eq('component_id', payload.componentId)
    .maybeSingle();

  let recordId: string | null = null;
  if (existing) {
    const { data, error } = await supabase
      .from('group_reviews')
      .update({
        reviewer_user_id: payload.reviewerUserId,
        status: payload.status ?? 'IN_PROGRESS',
        notes: payload.notes ?? null,
        started_at: payload.status === 'IN_PROGRESS' ? new Date().toISOString() : null,
        completed_at: payload.status === 'COMPLETE' ? new Date().toISOString() : null,
      })
      .eq('id', existing.id)
      .select()
      .maybeSingle();
    if (error || !data) {
      return guard.json(
        { error: error?.message ?? 'Failed to update review.' },
        { status: 500 },
      );
    }
    recordId = data.id;
  } else {
    const { data, error } = await supabase
      .from('group_reviews')
      .insert({
        org_id: payload.orgId,
        engagement_id: payload.engagementId,
        component_id: payload.componentId,
        reviewer_user_id: payload.reviewerUserId,
        status: payload.status ?? 'IN_PROGRESS',
        notes: payload.notes ?? null,
        started_at: payload.status === 'IN_PROGRESS' ? new Date().toISOString() : null,
        completed_at: payload.status === 'COMPLETE' ? new Date().toISOString() : null,
      })
      .select()
      .maybeSingle();
    if (error || !data) {
      return guard.json(
        { error: error?.message ?? 'Failed to create review.' },
        { status: 500 },
      );
    }
    recordId = data.id;
  }

  const resolvedStatus = payload.status ?? (existing ? 'IN_PROGRESS' : 'PENDING');

  try {
    await upsertAuditModuleRecord(supabase, {
      orgId: payload.orgId,
      engagementId: payload.engagementId,
      moduleCode: 'GRP1',
      recordRef: payload.componentId,
      title: 'Component review',
      recordStatus: resolvedStatus === 'COMPLETE' ? 'READY_FOR_REVIEW' : 'IN_PROGRESS',
      approvalState: 'DRAFT',
      currentStage: resolvedStatus === 'COMPLETE' ? 'MANAGER' : 'PREPARER',
      currentReviewerUserId: payload.reviewerUserId,
      metadata: {
        reviewId: recordId,
        reviewStatus: resolvedStatus,
        notes: payload.notes,
      },
      updatedByUserId: payload.userId,
    });

    if (resolvedStatus === 'COMPLETE') {
      await ensureAuditRecordApprovalStage(supabase, {
        orgId: payload.orgId,
        engagementId: payload.engagementId,
        moduleCode: 'GRP1',
        recordRef: payload.componentId,
        stage: 'MANAGER',
        decision: 'PENDING',
        metadata: { reviewId: recordId },
        userId: payload.userId,
      });
    }
  } catch (moduleError) {
    return guard.json(
      { error: moduleError instanceof Error ? moduleError.message : 'Failed to update audit module records for review.' },
      { status: 500 },
    );
  }

  await logAuditActivity(supabase, {
    orgId: payload.orgId,
    userId: payload.userId,
    action: 'GRP_REVIEW_UPDATED',
    entityType: 'AUDIT_GROUP',
    entityId: recordId,
    metadata: {
      componentId: payload.componentId,
      status: resolvedStatus,
      reviewerUserId: payload.reviewerUserId,
      requestId,
    },
  });

  return guard.respond({ success: true, reviewId: recordId });
}
