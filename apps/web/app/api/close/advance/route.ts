import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getServiceSupabaseClient } from '@/lib/supabase-server';
import { advanceCloseSchema } from '@/lib/accounting/schemas';
import { logActivity } from '@/lib/accounting/activity-log';
import { attachRequestId, getOrCreateRequestId } from '@/app/lib/observability';
import { createApiGuard } from '@/app/lib/api-guard';

const transitions: Record<string, string> = {
  OPEN: 'SUBSTANTIVE_REVIEW',
  SUBSTANTIVE_REVIEW: 'READY_TO_LOCK',
};

export async function POST(request: Request) {
  const requestId = getOrCreateRequestId(request);
  const supabase = await getServiceSupabaseClient();
  let payload;
  try {
    payload = advanceCloseSchema.parse(await request.json());
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.flatten() }, attachRequestId({ status: 400 }, requestId));
    }
    return NextResponse.json({ error: 'Invalid JSON body' }, attachRequestId({ status: 400 }, requestId));
  }

  const guard = await createApiGuard({
    request,
    supabase,
    requestId,
    orgId: payload.orgId,
    resource: `close:advance:${payload.periodId}`,
    rateLimit: { limit: 30, windowSeconds: 60 },
  });
  if (guard.rateLimitResponse) return guard.rateLimitResponse;
  if (guard.replayResponse) return guard.replayResponse;

  const { data: period } = await supabase
    .from('close_periods')
    .select('id, status')
    .eq('id', payload.periodId)
    .eq('org_id', payload.orgId)
    .maybeSingle();

  if (!period) {
    return guard.json({ error: 'Period not found' }, { status: 404 });
  }

  const expected = transitions[period.status];
  if (!expected || expected !== payload.nextStatus) {
    return guard.json({ error: `Cannot advance from ${period.status} to ${payload.nextStatus}` }, { status: 409 });
  }

  const { error } = await supabase
    .from('close_periods')
    .update({ status: payload.nextStatus })
    .eq('id', payload.periodId)
    .eq('org_id', payload.orgId);

  if (error) {
    return guard.json({ error: error.message }, { status: 500 });
  }

  await logActivity(supabase, {
    orgId: payload.orgId,
    userId: payload.userId,
    action: 'CLOSE_ADVANCED',
    entityType: 'CLOSE_PERIOD',
    entityId: payload.periodId,
    metadata: { to: payload.nextStatus, requestId },
  });

  return guard.respond({ status: payload.nextStatus });
}
