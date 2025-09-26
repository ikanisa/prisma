import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getServiceSupabaseClient } from '../../../../../lib/supabase-server';
import { ledgerEntriesImportSchema } from '../../../../../lib/accounting/schemas';
import { logActivity } from '../../../../../lib/accounting/activity-log';
import { attachRequestId, getOrCreateRequestId } from '../../../../../lib/observability';
import { createApiGuard } from '../../../../../lib/api-guard';

export async function POST(request: Request) {
  const requestId = getOrCreateRequestId(request);
  const supabase = getServiceSupabaseClient();

  let payload;
  try {
    payload = ledgerEntriesImportSchema.parse(await request.json());
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
    resource: `gl:entries:import:${payload.orgId}:${payload.entityId}`,
    rateLimit: { limit: 60, windowSeconds: 60 },
  });
  if (guard.rateLimitResponse) return guard.rateLimitResponse;
  if (guard.replayResponse) return guard.replayResponse;

  const rows = payload.entries.map((entry) => ({
    org_id: payload.orgId,
    entity_id: payload.entityId,
    period_id: payload.periodId ?? null,
    date: entry.date,
    account_id: entry.accountId,
    description: entry.description ?? null,
    debit: entry.debit,
    credit: entry.credit,
    currency: entry.currency,
    fx_rate: entry.fxRate ?? null,
    source: entry.source ?? 'IMPORT',
    batch_id: entry.batchId ?? null,
    created_by_user_id: payload.userId,
  }));

  const { error } = await supabase.from('ledger_entries').insert(rows);
  if (error) {
    return guard.json({ error: error.message }, { status: 500 });
  }

  await logActivity(supabase, {
    orgId: payload.orgId,
    userId: payload.userId,
    action: 'GL_ENTRIES_IMPORTED',
    entityType: 'LEDGER',
    entityId: payload.entityId,
    metadata: { count: rows.length },
  });

  return guard.respond({ inserted: rows.length });
}
