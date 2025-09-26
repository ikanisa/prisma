import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getServiceSupabaseClient } from '../../../../lib/supabase-server';
import { updateControlSchema } from '../../../../lib/audit/schemas';
import { logAuditActivity } from '../../../../lib/audit/activity-log';
import { upsertAuditModuleRecord } from '../../../../lib/audit/module-records';
import { attachRequestId, getOrCreateRequestId } from '../../lib/observability';
import { createApiGuard } from '../../lib/api-guard';

export async function PATCH(request: Request, context: { params: { id: string } }) {
  const requestId = getOrCreateRequestId(request);
  const { id } = context.params;
  const supabase = getServiceSupabaseClient();
  let payload;

  try {
    payload = updateControlSchema.parse({ ...(await request.json()), controlId: id });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.flatten() }, attachRequestId({ status: 400 }, requestId));
    }
    return NextResponse.json({ error: 'Invalid JSON payload.' }, attachRequestId({ status: 400 }, requestId));
  }

  const { orgId, engagementId, userId, controlId, ...updates } = payload;

  const guard = await createApiGuard({
    request,
    supabase,
    requestId,
    orgId,
    resource: `controls:update:${controlId}`,
    rateLimit: { limit: 120, windowSeconds: 60 },
  });
  if (guard.rateLimitResponse) return guard.rateLimitResponse;
  if (guard.replayResponse) return guard.replayResponse;

  const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (updates.cycle) updatePayload.cycle = updates.cycle;
  if (updates.objective) updatePayload.objective = updates.objective;
  if (updates.description) updatePayload.description = updates.description;
  if (updates.frequency) updatePayload.frequency = updates.frequency;
  if (typeof updates.key === 'boolean') updatePayload.key = updates.key;
  if (updates.owner !== undefined) updatePayload.owner = updates.owner ?? null;

  const { data, error } = await supabase
    .from('controls')
    .update(updatePayload)
    .eq('id', controlId)
    .eq('org_id', orgId)
    .eq('engagement_id', engagementId)
    .select()
    .maybeSingle();

  if (error || !data) {
    return guard.json({ error: error?.message ?? 'Unable to update control.' }, { status: 500 });
  }

  await logAuditActivity(supabase, {
    orgId,
    userId,
    action: 'CTRL_UPDATED',
    entityId: controlId,
    metadata: {
      cycle: data.cycle,
      objective: data.objective,
      key: data.key,
      requestId,
    },
  });

  try {
    await upsertAuditModuleRecord(supabase, {
      orgId,
      engagementId,
      moduleCode: 'CTRL1',
      recordRef: controlId,
      title: data.description ?? data.objective ?? 'Control',
      metadata: {
        cycle: data.cycle,
        objective: data.objective,
        description: data.description,
        frequency: data.frequency,
        owner: data.owner,
        key: data.key,
        updatedAt: data.updated_at,
      },
      recordStatus: 'IN_PROGRESS',
      approvalState: 'DRAFT',
      currentStage: 'PREPARER',
      preparedByUserId: userId,
      ownerUserId: userId,
      updatedByUserId: userId,
    });
  } catch (moduleError) {
    const message = moduleError instanceof Error ? moduleError.message : 'Failed to sync audit module record.';
    return guard.json({ error: message }, { status: 500 });
  }

  return guard.respond({ control: data });
}
