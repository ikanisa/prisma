import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getServiceSupabaseClient } from '@/lib/supabase-server';
import { postJournalSchema } from '@/lib/accounting/schemas';
import { logActivity } from '@/lib/accounting/activity-log';
import { attachRequestId, getOrCreateRequestId } from '@/app/lib/observability';
import { createApiGuard } from '@/app/lib/api-guard';

export async function POST(request: Request) {
  const requestId = getOrCreateRequestId(request);
  const supabase = await getServiceSupabaseClient();
  let payload;
  try {
    payload = postJournalSchema.parse(await request.json());
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
    resource: `journal:post:${payload.batchId}`,
    rateLimit: { limit: 30, windowSeconds: 60 },
  });
  if (guard.rateLimitResponse) return guard.rateLimitResponse;
  if (guard.replayResponse) return guard.replayResponse;

  const { data: batch } = await supabase
    .from('journal_batches')
    .select('id, status')
    .eq('id', payload.batchId)
    .eq('org_id', payload.orgId)
    .maybeSingle();

  if (!batch) {
    return guard.json({ error: 'Batch not found' }, { status: 404 });
  }

  if (batch.status !== 'APPROVED') {
    return guard.json({ error: 'Only approved batches can be posted' }, { status: 409 });
  }

  const { error } = await supabase
    .from('journal_batches')
    .update({ status: 'POSTED', posted_at: new Date().toISOString() })
    .eq('id', payload.batchId)
    .eq('org_id', payload.orgId);

  if (error) {
    return guard.json({ error: error.message }, { status: 500 });
  }

  await logActivity(supabase, {
    orgId: payload.orgId,
    userId: payload.userId,
    action: 'JE_POSTED',
    entityType: 'JOURNAL_BATCH',
    entityId: payload.batchId,
    metadata: { requestId },
  });

  return guard.respond({ status: 'POSTED' });
}
