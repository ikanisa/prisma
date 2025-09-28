import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getServiceSupabaseClient } from '../../../../lib/supabase-server';
import { createDeficiencySchema } from '../../../../lib/audit/schemas';
import { logAuditActivity } from '../../../../lib/audit/activity-log';
import { attachRequestId, getOrCreateRequestId } from '../../../lib/observability';
import { createApiGuard } from '../../../lib/api-guard';

export async function POST(request: Request) {
  const requestId = getOrCreateRequestId(request);
  const supabase = await getServiceSupabaseClient();
  let payload;

  try {
    payload = createDeficiencySchema.parse(await request.json());
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.flatten() }, attachRequestId({ status: 400 }, requestId));
    }
    return NextResponse.json({ error: 'Invalid JSON payload.' }, attachRequestId({ status: 400 }, requestId));
  }

  const { orgId, engagementId, userId, controlId, recommendation, severity, status } = payload;

  const guard = await createApiGuard({
    request,
    supabase,
    requestId,
    orgId,
    resource: `deficiency:create:${engagementId}`,
    rateLimit: { limit: 60, windowSeconds: 60 },
  });
  if (guard.rateLimitResponse) return guard.rateLimitResponse;
  if (guard.replayResponse) return guard.replayResponse;

  const { data, error } = await supabase
    .from('deficiencies')
    .insert({
      org_id: orgId,
      engagement_id: engagementId,
      control_id: controlId ?? null,
      recommendation,
      severity,
      status,
    })
    .select()
    .maybeSingle();

  if (error || !data) {
    return guard.json({ error: error?.message ?? 'Failed to create deficiency.' }, { status: 500 });
  }

  await logAuditActivity(supabase, {
    orgId,
    userId,
    action: 'CTRL_DEFICIENCY_RAISED',
    entityId: controlId ?? data.id,
    metadata: {
      deficiencyId: data.id,
      severity: data.severity,
      status: data.status,
      requestId,
    },
  });

  return guard.respond({ deficiency: data });
}
