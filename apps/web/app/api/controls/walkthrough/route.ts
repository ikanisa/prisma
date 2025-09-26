import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getServiceSupabaseClient } from '../../../../lib/supabase-server';
import { createWalkthroughSchema } from '../../../../lib/audit/schemas';
import { logAuditActivity } from '../../../../lib/audit/activity-log';
import { attachRequestId, getOrCreateRequestId } from '../../../lib/observability';
import { createApiGuard } from '../../../lib/api-guard';

export async function POST(request: Request) {
  const requestId = getOrCreateRequestId(request);
  const supabase = getServiceSupabaseClient();
  let payload;

  try {
    payload = createWalkthroughSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.flatten() }, attachRequestId({ status: 400 }, requestId));
    }
    return NextResponse.json({ error: 'Invalid JSON payload.' }, attachRequestId({ status: 400 }, requestId));
  }

  const { orgId, controlId, userId, date, notes, result } = payload;

  const guard = await createApiGuard({
    request,
    supabase,
    requestId,
    orgId,
    resource: `controls:walkthrough:${controlId}`,
    rateLimit: { limit: 60, windowSeconds: 60 },
    enableIdempotency: true,
  });
  if (guard.rateLimitResponse) return guard.rateLimitResponse;
  if (guard.replayResponse) return guard.replayResponse;

  const { data, error } = await supabase
    .from('control_walkthroughs')
    .insert({
      org_id: orgId,
      control_id: controlId,
      walkthrough_date: date,
      notes: notes ?? null,
      result,
      created_by: userId,
    })
    .select()
    .maybeSingle();

  if (error || !data) {
    return guard.json({ error: error?.message ?? 'Failed to record walkthrough.' }, { status: 500 });
  }

  await logAuditActivity(supabase, {
    orgId,
    userId,
    action: 'CTRL_WALKTHROUGH_DONE',
    entityId: controlId,
    metadata: {
      walkthroughId: data.id,
      result: data.result,
      date: data.walkthrough_date,
      requestId,
    },
  });

  return guard.respond({ walkthrough: data });
}
