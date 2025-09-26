import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getServiceSupabaseClient } from '../../../../../lib/supabase-server';
import { addJournalLinesSchema } from '../../../../../lib/accounting/schemas';
import { validateJournalBalance, evaluateAndPersistJournalAlerts } from '../../../../../lib/accounting/journal';
import { attachRequestId, getOrCreateRequestId } from '../../../lib/observability';
import { createApiGuard } from '../../../lib/api-guard';

export async function POST(request: Request) {
  const requestId = getOrCreateRequestId(request);
  const supabase = getServiceSupabaseClient();
  let payload;
  try {
    payload = addJournalLinesSchema.parse(await request.json());
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
    resource: `journal:lines:${payload.batchId}`,
    rateLimit: { limit: 120, windowSeconds: 60 },
  });
  if (guard.rateLimitResponse) return guard.rateLimitResponse;
  if (guard.replayResponse) return guard.replayResponse;

  if (!validateJournalBalance(payload.lines)) {
    return guard.json({ error: 'Journal batch is out of balance' }, { status: 422 });
  }

  const { data: batch } = await supabase
    .from('journal_batches')
    .select('id, org_id, entity_id, period_id')
    .eq('id', payload.batchId)
    .maybeSingle();

  if (!batch) {
    return guard.json({ error: 'Batch not found' }, { status: 404 });
  }

  const periodId = payload.periodId ?? batch.period_id ?? null;

  const rows = payload.lines.map((line) => ({
    org_id: payload.orgId,
    entity_id: batch.entity_id,
    period_id: periodId,
    account_id: line.accountId,
    date: line.date,
    description: line.description ?? null,
    debit: line.debit,
    credit: line.credit,
    currency: line.currency,
    fx_rate: line.fxRate ?? null,
    source: 'JOURNAL',
    batch_id: payload.batchId,
    created_by_user_id: payload.userId,
  }));

  const { error } = await supabase.from('ledger_entries').insert(rows);
  if (error) {
    return guard.json({ error: error.message }, { status: 500 });
  }

  if (periodId && !batch.period_id) {
    await supabase
      .from('journal_batches')
      .update({ period_id: periodId })
      .eq('id', payload.batchId);
  }

  await evaluateAndPersistJournalAlerts(supabase, {
    orgId: payload.orgId,
    batchId: payload.batchId,
    userId: payload.userId,
  });

  return guard.respond({ inserted: rows.length });
}
