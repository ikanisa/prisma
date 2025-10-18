import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getServiceSupabaseClient } from '@/lib/supabase-server';
import { approveJournalSchema } from '@/lib/accounting/schemas';
import { logActivity } from '@/lib/accounting/activity-log';
import { attachRequestId, getOrCreateRequestId } from '@/app/lib/observability';
import { createApiGuard } from '@/app/lib/api-guard';

export async function POST(request: Request) {
  const requestId = getOrCreateRequestId(request);
  const supabase = await getServiceSupabaseClient();
  let payload;
  try {
    payload = approveJournalSchema.parse(await request.json());
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
    resource: `journal:approve:${payload.batchId}`,
    rateLimit: { limit: 30, windowSeconds: 60 },
  });
  if (guard.rateLimitResponse) return guard.rateLimitResponse;
  if (guard.replayResponse) return guard.replayResponse;

  const { data: batch } = await supabase
    .from('journal_batches')
    .select('id, status, entity_id')
    .eq('id', payload.batchId)
    .eq('org_id', payload.orgId)
    .maybeSingle();

  if (!batch) {
    return guard.json({ error: 'Batch not found' }, { status: 404 });
  }

  if (batch.status !== 'SUBMITTED') {
    return guard.json({ error: 'Only submitted batches can be approved' }, { status: 409 });
  }

  const { data: unresolved } = await supabase
    .from('je_control_alerts')
    .select('id, rule')
    .eq('batch_id', payload.batchId)
    .eq('severity', 'HIGH')
    .eq('resolved', false);

  if (unresolved && unresolved.length > 0) {
    return guard.json(
      { error: 'High severity alerts must be resolved before approval', alerts: unresolved },
      { status: 422 },
    );
  }

  const { error } = await supabase
    .from('journal_batches')
    .update({
      status: 'APPROVED',
      approved_at: new Date().toISOString(),
      approved_by_user_id: payload.userId,
    })
    .eq('id', payload.batchId)
    .eq('org_id', payload.orgId);

  if (error) {
    return guard.json({ error: error.message }, { status: 500 });
  }

  await logActivity(supabase, {
    orgId: payload.orgId,
    userId: payload.userId,
    action: 'JE_APPROVED',
    entityType: 'JOURNAL_BATCH',
    entityId: payload.batchId,
    metadata: { requestId },
  });

  return guard.respond({ status: 'APPROVED' });
}
