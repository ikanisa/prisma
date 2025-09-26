import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getServiceSupabaseClient } from '../../../../../lib/supabase-server';
import { fxRemeasureSchema } from '../../../../../lib/accounting/schemas';
import { logActivity } from '../../../../../lib/accounting/activity-log';
import { attachRequestId, getOrCreateRequestId } from '../../../lib/observability';
import { createApiGuard } from '../../../lib/api-guard';

export async function POST(request: Request) {
  const requestId = getOrCreateRequestId(request);
  const supabase = getServiceSupabaseClient();
  let payload;
  try {
    payload = fxRemeasureSchema.parse(await request.json());
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
    resource: `fx:remeasure:${payload.entityId}`,
    rateLimit: { limit: 30, windowSeconds: 60 },
  });
  if (guard.rateLimitResponse) return guard.rateLimitResponse;
  if (guard.replayResponse) return guard.replayResponse;

  const { data: entries } = await supabase
    .from('ledger_entries')
    .select('account_id, debit, credit, currency')
    .eq('org_id', payload.orgId)
    .eq('entity_id', payload.entityId)
    .eq('period_id', payload.periodId)
    .not('currency', 'eq', 'EUR');

  const exposures = (entries ?? []).map((entry) => ({
    accountId: entry.account_id,
    currency: entry.currency,
    net: entry.debit - entry.credit,
  }));

  await logActivity(supabase, {
    orgId: payload.orgId,
    userId: payload.userId,
    action: 'FX_REMEASURE_PREVIEW',
    entityType: 'LEDGER',
    entityId: payload.entityId,
    metadata: { exposureCount: exposures.length, requestId },
  });

  return guard.respond({
    status: 'PREVIEW',
    exposures,
    ratesUsed: payload.rates ?? {},
    note: 'This endpoint prepares suggested remeasurement adjustments. Post journals manually after review.',
  });
}
