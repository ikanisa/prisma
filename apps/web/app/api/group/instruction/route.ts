import { NextResponse } from 'next/server';
import { ZodError, z } from 'zod';
import { getServiceSupabaseClient } from '../../../../../lib/supabase-server';
import { ensureAuditRecordApprovalStage, upsertAuditModuleRecord } from '../../../../../lib/audit/module-records';
import { logAuditActivity } from '../../../../../lib/audit/activity-log';
import { attachRequestId, getOrCreateRequestId } from '../../../lib/observability';
import { createApiGuard } from '../../../lib/api-guard';
import { authenticateGroupRequest } from '../../../lib/group/request';

const instructionSchema = z.object({
  orgId: z.string().uuid(),
  engagementId: z.string().uuid(),
  componentId: z.string().uuid(),
  title: z.string().min(1),
  status: z.enum(['DRAFT', 'SENT', 'ACKNOWLEDGED', 'COMPLETE']).optional(),
  dueAt: z.string().datetime().optional(),
  userId: z.string().uuid(),
});

export async function POST(request: Request) {
  const requestId = getOrCreateRequestId(request);
  const supabase = await getServiceSupabaseClient();
  let payload;
  try {
    payload = instructionSchema.parse(await request.json());
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

  const auth = await authenticateGroupRequest({
    request,
    supabase,
    orgIdCandidate: payload.orgId,
    userIdCandidate: payload.userId,
  });
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error },
      attachRequestId({ status: auth.status }, requestId),
    );
  }

  const { orgId, userId } = auth;

  const guard = await createApiGuard({
    request,
    supabase,
    requestId,
    orgId,
    resource: `group:instruction:${payload.componentId}`,
    rateLimit: { limit: 60, windowSeconds: 60 },
  });
  if (guard.rateLimitResponse) return guard.rateLimitResponse;
  if (guard.replayResponse) return guard.replayResponse;

  const { data: component, error: componentError } = await supabase
    .from('group_components')
    .select('id')
    .eq('id', payload.componentId)
    .eq('org_id', orgId)
    .maybeSingle();
  if (componentError) {
    return guard.json(
      { error: componentError.message },
      { status: 500 },
    );
  }
  if (!component) {
    return guard.json({ error: 'Group component not found.' }, { status: 404 });
  }

  const { data, error } = await supabase
    .from('group_instructions')
    .insert({
      org_id: orgId,
      engagement_id: payload.engagementId,
      component_id: payload.componentId,
      title: payload.title,
      status: payload.status ?? 'DRAFT',
      due_at: payload.dueAt ?? null,
    })
    .select()
    .maybeSingle();

  if (error || !data) {
    return guard.json(
      { error: error?.message ?? 'Failed to create instruction.' },
      { status: 500 },
    );
  }

  try {
    await upsertAuditModuleRecord(supabase, {
      orgId,
      engagementId: payload.engagementId,
      moduleCode: 'GRP1',
      recordRef: payload.componentId,
      title: 'Instructions for component',
      recordStatus: payload.status === 'COMPLETE' ? 'READY_FOR_REVIEW' : 'IN_PROGRESS',
      approvalState: 'DRAFT',
      currentStage: 'PREPARER',
      preparedByUserId: userId,
      metadata: {
        instructionId: data.id,
        instructionStatus: data.status,
        dueAt: data.due_at,
      },
      updatedByUserId: userId,
    });

    if (payload.status === 'COMPLETE') {
      await ensureAuditRecordApprovalStage(supabase, {
        orgId,
        engagementId: payload.engagementId,
        moduleCode: 'GRP1',
        recordRef: payload.componentId,
        stage: 'MANAGER',
        decision: 'PENDING',
        metadata: { instructionId: data.id },
        userId,
      });
    }
  } catch (moduleError) {
    return guard.json(
      { error: moduleError instanceof Error ? moduleError.message : 'Failed to update audit module record.' },
      { status: 500 },
    );
  }

  const statusAction =
    data.status === 'COMPLETE'
      ? 'GRP_INSTRUCTION_COMPLETED'
      : data.status === 'ACKNOWLEDGED'
        ? 'GRP_INSTRUCTION_ACKED'
        : data.status === 'SENT'
          ? 'GRP_INSTRUCTION_SENT'
          : null;

  if (statusAction) {
    await logAuditActivity(supabase, {
      orgId,
      userId,
      action: statusAction,
      entityType: 'AUDIT_GROUP',
      entityId: data.id,
      metadata: {
        componentId: payload.componentId,
        status: data.status,
        dueAt: data.due_at,
        requestId,
      },
    });
  }

  return guard.respond({ instruction: data });
}
