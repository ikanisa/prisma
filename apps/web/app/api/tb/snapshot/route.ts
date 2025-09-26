import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getServiceSupabaseClient } from '../../../../../lib/supabase-server';
import { trialBalanceSnapshotSchema } from '../../../../../lib/accounting/schemas';
import { logActivity } from '../../../../../lib/accounting/activity-log';
import { attachRequestId, getOrCreateRequestId } from '../../../lib/observability';
import { createApiGuard } from '../../../lib/api-guard';

export async function POST(request: Request) {
  const requestId = getOrCreateRequestId(request);
  const supabase = getServiceSupabaseClient();
  let payload;
  try {
    payload = trialBalanceSnapshotSchema.parse(await request.json());
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
    resource: `tb:snapshot:${payload.entityId}:${payload.periodId}`,
    rateLimit: { limit: 15, windowSeconds: 300 },
  });
  if (guard.rateLimitResponse) return guard.rateLimitResponse;
  if (guard.replayResponse) return guard.replayResponse;

  const { data: entries } = await supabase
    .from('ledger_entries')
    .select('account_id, debit, credit')
    .eq('org_id', payload.orgId)
    .eq('entity_id', payload.entityId)
    .eq('period_id', payload.periodId);

  const byAccount: Record<string, { debit: number; credit: number }> = {};
  let totalDebit = 0;
  let totalCredit = 0;

  for (const entry of entries ?? []) {
    if (!byAccount[entry.account_id]) {
      byAccount[entry.account_id] = { debit: 0, credit: 0 };
    }
    byAccount[entry.account_id].debit += entry.debit;
    byAccount[entry.account_id].credit += entry.credit;
    totalDebit += entry.debit;
    totalCredit += entry.credit;
  }

  const { error, data } = await supabase
    .from('trial_balance_snapshots')
    .insert({
      org_id: payload.orgId,
      entity_id: payload.entityId,
      period_id: payload.periodId,
      by_account: byAccount,
      total_debits: totalDebit,
      total_credits: totalCredit,
      created_by_user_id: payload.userId,
      locked: false,
    })
    .select()
    .maybeSingle();

  if (error || !data) {
    return guard.json({ error: error?.message ?? 'Failed to capture trial balance' }, { status: 500 });
  }

  await logActivity(supabase, {
    orgId: payload.orgId,
    userId: payload.userId,
    action: 'TB_SNAPSHOTTED',
    entityType: 'TRIAL_BALANCE',
    entityId: data.id,
    metadata: { totalDebit, totalCredit, requestId },
  });

  return guard.respond({ snapshot: data });
}
