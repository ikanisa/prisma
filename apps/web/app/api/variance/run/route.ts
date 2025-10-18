import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getServiceSupabaseClient } from '@/lib/supabase-server';
import { varianceRunSchema } from '@/lib/accounting/schemas';
import { logActivity } from '@/lib/accounting/activity-log';
import { attachRequestId, getOrCreateRequestId } from '@/app/lib/observability';
import { createApiGuard } from '@/app/lib/api-guard';

type LedgerEntry = { account_id: string; debit: number; credit: number };

type SnapshotRow = {
  by_account: Record<string, { debit: number; credit: number }>;
  snapshot_at: string;
};

export async function POST(request: Request) {
  const requestId = getOrCreateRequestId(request);
  const supabase = await getServiceSupabaseClient();
  let payload;
  try {
    payload = varianceRunSchema.parse(await request.json());
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
    resource: `variance:run:${payload.entityId}:${payload.periodId}`,
    rateLimit: { limit: 10, windowSeconds: 300 },
  });
  if (guard.rateLimitResponse) return guard.rateLimitResponse;
  if (guard.replayResponse) return guard.replayResponse;

  const { data: rules } = await supabase
    .from('variance_rules')
    .select('*')
    .eq('org_id', payload.orgId)
    .eq('active', true);

  const applicableRules = (rules ?? []).filter(
    (rule) => !rule.entity_id || rule.entity_id === payload.entityId,
  );

  if (applicableRules.length === 0) {
    return guard.respond({ results: [] });
  }

  const { data: periodEntries } = await supabase
    .from('ledger_entries')
    .select('account_id, debit, credit')
    .eq('org_id', payload.orgId)
    .eq('entity_id', payload.entityId)
    .eq('period_id', payload.periodId);

  const totalsByAccount = new Map<string, { debit: number; credit: number }>();
  for (const entry of (periodEntries as LedgerEntry[]) ?? []) {
    if (!totalsByAccount.has(entry.account_id)) {
      totalsByAccount.set(entry.account_id, { debit: 0, credit: 0 });
    }
    const acc = totalsByAccount.get(entry.account_id)!;
    acc.debit += entry.debit;
    acc.credit += entry.credit;
  }

  const { data: snapshot } = await supabase
    .from('trial_balance_snapshots')
    .select('by_account, snapshot_at')
    .eq('org_id', payload.orgId)
    .eq('entity_id', payload.entityId)
    .neq('period_id', payload.periodId)
    .order('snapshot_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const baselineByAccount = (snapshot as SnapshotRow | null)?.by_account ?? {};

  const { data: ledgerAccounts } = await supabase
    .from('ledger_accounts')
    .select('id, code')
    .eq('org_id', payload.orgId)
    .eq('entity_id', payload.entityId);
  const accountByCode = new Map((ledgerAccounts ?? []).map((acct) => [acct.code, acct.id]));

  const { data: fsLines } = await supabase
    .from('fs_lines')
    .select('id, code')
    .eq('org_id', payload.orgId);
  const fsLineByCode = new Map((fsLines ?? []).map((line) => [line.code, line.id]));

  const { data: mappings } = await supabase
    .from('coa_map')
    .select('fs_line_id, account_id')
    .eq('org_id', payload.orgId)
    .eq('entity_id', payload.entityId);

  const accountsByFsLine = new Map<string, string[]>(
    (mappings ?? []).reduce((acc, mapping) => {
      const list = acc.get(mapping.fs_line_id) ?? [];
      list.push(mapping.account_id);
      acc.set(mapping.fs_line_id, list);
      return acc;
    }, new Map<string, string[]>())
  );

  const results = [] as Array<{
    ruleId: string;
    targetCode: string;
    current: number;
    baseline: number;
    deltaAbs: number;
    deltaPct: number;
    status: string;
  }>;

  for (const rule of applicableRules) {
    const targetAccounts: string[] = [];
    if (rule.scope === 'ACCOUNT') {
      const accountId = accountByCode.get(rule.code);
      if (accountId) {
        targetAccounts.push(accountId);
      }
    } else {
      const fsLineId = fsLineByCode.get(rule.code);
      if (fsLineId) {
        const mappedAccounts = accountsByFsLine.get(fsLineId) ?? [];
        targetAccounts.push(...mappedAccounts);
      }
    }

    if (targetAccounts.length === 0) {
      continue;
    }

    const currentValue = targetAccounts.reduce((sum, accountId) => {
      const totals = totalsByAccount.get(accountId);
      if (!totals) return sum;
      return sum + totals.debit - totals.credit;
    }, 0);

    const baselineValue = targetAccounts.reduce((sum, accountId) => {
      const baselineEntry = baselineByAccount[accountId];
      if (!baselineEntry) return sum;
      return sum + baselineEntry.debit - baselineEntry.credit;
    }, 0);

    const deltaAbs = currentValue - baselineValue;
    const deltaPct = baselineValue === 0 ? (currentValue === 0 ? 0 : 100) : (deltaAbs / Math.abs(baselineValue)) * 100;

    const triggeredAbs = rule.threshold_abs !== null && rule.threshold_abs !== undefined && Math.abs(deltaAbs) >= rule.threshold_abs;
    const triggeredPct = rule.threshold_pct !== null && rule.threshold_pct !== undefined && Math.abs(deltaPct) >= rule.threshold_pct;
    const status = triggeredAbs || triggeredPct ? 'OPEN' : 'EXPLAINED';

    await supabase
      .from('variance_results')
      .delete()
      .eq('rule_id', rule.id)
      .eq('period_id', payload.periodId);

    const { error } = await supabase.from('variance_results').insert({
      org_id: payload.orgId,
      entity_id: payload.entityId,
      period_id: payload.periodId,
      rule_id: rule.id,
      target_code: rule.code,
      value: currentValue,
      baseline: baselineValue,
      delta_abs: deltaAbs,
      delta_pct: deltaPct,
      status,
    });

    if (!error) {
      results.push({
        ruleId: rule.id,
        targetCode: rule.code,
        current: currentValue,
        baseline: baselineValue,
        deltaAbs,
        deltaPct,
        status,
      });
    }
  }

  await logActivity(supabase, {
    orgId: payload.orgId,
    userId: payload.userId,
    action: 'VARIANCE_RUN',
    entityType: 'VARIANCE_ANALYSIS',
    entityId: payload.periodId,
    metadata: { rules: results.length, requestId },
  });

  return guard.respond({ results });
}
