import { NextResponse } from 'next/server';
import { ZodError, z } from 'zod';
import { getServiceSupabaseClient } from '../../../../../lib/supabase-server';
import { upsertAuditModuleRecord } from '../../../../../lib/audit/module-records';
import { logAuditActivity } from '../../../../../lib/audit/activity-log';
import { attachRequestId, getOrCreateRequestId } from '../../../lib/observability';
import { createApiGuard } from '../../../lib/api-guard';
import { authenticateGroupRequest } from '../../../lib/group/request';

const createSchema = z.object({
  orgId: z.string().uuid(),
  engagementId: z.string().uuid(),
  name: z.string().min(1),
  country: z.string().optional(),
  significance: z.enum(['INSIGNIFICANT', 'SIGNIFICANT', 'KEY']).default('INSIGNIFICANT'),
  materiality: z.number().optional(),
  assignedFirm: z.string().optional(),
  notes: z.string().optional(),
  userId: z.string().uuid(),
});

export async function POST(request: Request) {
  const requestId = getOrCreateRequestId(request);
  const supabase = await getServiceSupabaseClient();
  let payload;
  try {
    payload = createSchema.parse(await request.json());
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
    resource: 'group:component:create',
    rateLimit: { limit: 30, windowSeconds: 60 },
  });
  if (guard.rateLimitResponse) return guard.rateLimitResponse;
  if (guard.replayResponse) return guard.replayResponse;

  const { data, error } = await supabase
    .from('group_components')
    .insert({
      org_id: orgId,
      engagement_id: payload.engagementId,
      name: payload.name,
      country: payload.country ?? null,
      significance: payload.significance,
      materiality: payload.materiality ?? null,
      assigned_firm: payload.assignedFirm ?? null,
      notes: payload.notes ?? null,
    })
    .select()
    .maybeSingle();

  if (error || !data) {
    return guard.json(
      { error: error?.message ?? 'Failed to create group component.' },
      { status: 500 },
    );
  }

  try {
    await upsertAuditModuleRecord(supabase, {
      orgId,
      engagementId: payload.engagementId,
      moduleCode: 'GRP1',
      recordRef: data.id,
      title: `${data.name} component`,
      recordStatus: 'IN_PROGRESS',
      approvalState: 'DRAFT',
      currentStage: 'PREPARER',
      preparedByUserId: userId,
      ownerUserId: userId,
      metadata: {
        country: data.country,
        significance: data.significance,
        materiality: data.materiality,
      },
      userId,
    });
  } catch (moduleError) {
    return guard.json(
      { error: moduleError instanceof Error ? moduleError.message : 'Failed to register component in audit module records.' },
      { status: 500 },
    );
  }

  await logAuditActivity(supabase, {
    orgId,
    userId,
    action: 'GRP_COMPONENT_CREATED',
    entityType: 'AUDIT_GROUP',
    entityId: data.id,
    metadata: {
      country: data.country,
      significance: data.significance,
      materiality: data.materiality,
      assignedFirm: data.assigned_firm,
      requestId,
    },
  });

  return guard.respond({ component: data });
}
