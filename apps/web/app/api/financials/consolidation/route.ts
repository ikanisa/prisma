import { NextResponse } from 'next/server';

import { getServiceSupabaseClient } from '../../../../lib/supabase-server';

interface LedgerEntry {
  entity_id: string;
  account_id: string;
  debit: number;
  credit: number;
  currency: string | null;
  fx_rate: number | null;
}

interface AccountInfo {
  id: string;
  code: string;
  name: string;
  type: string | null;
}

function normaliseAmount(entry: LedgerEntry, baseCurrency: string, entityCurrency: string | null) {
  const net = entry.debit - entry.credit;
  if (!entityCurrency || entityCurrency === baseCurrency) {
    return net;
  }
  const rate = entry.fx_rate ?? 1;
  return Number((net * rate).toFixed(2));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const orgId = url.searchParams.get('orgId');
  const parentEntityId = url.searchParams.get('parentEntityId');
  const baseCurrency = url.searchParams.get('currency') ?? 'EUR';
  const subsidiaries = url.searchParams.get('subsidiaries')
    ?.split(',')
    .map((value) => value.trim())
    .filter(Boolean) ?? [];

  if (!orgId || !parentEntityId) {
    return NextResponse.json(
      { error: 'orgId and parentEntityId are required' },
      { status: 400 },
    );
  }

  const supabase = await getServiceSupabaseClient();

  const entityIds = [parentEntityId, ...subsidiaries];

  const { data: entries, error: entriesError } = await supabase
    .from('ledger_entries')
    .select('entity_id, account_id, debit, credit, currency, fx_rate')
    .eq('org_id', orgId)
    .in('entity_id', entityIds.length ? entityIds : ['00000000-0000-0000-0000-000000000000']);
  if (entriesError) {
    return NextResponse.json({ error: 'ledger_entries_fetch_failed' }, { status: 500 });
  }

  const accountIds = Array.from(new Set((entries ?? []).map((entry) => entry.account_id)));
  const { data: accounts, error: accountsError } = await supabase
    .from('ledger_accounts')
    .select('id, code, name, type')
    .in('id', accountIds.length ? accountIds : ['00000000-0000-0000-0000-000000000000']);
  if (accountsError) {
    return NextResponse.json({ error: 'ledger_accounts_fetch_failed' }, { status: 500 });
  }

  const accountsById = new Map<string, AccountInfo>();
  for (const account of accounts ?? []) {
    accountsById.set(account.id, account);
  }

  const consolidated = new Map<string, { amount: number; account: AccountInfo | null }>();
  const byEntity: Record<string, { accountId: string; amount: number; account: AccountInfo | null }[]> = {};

  for (const entry of entries ?? []) {
    const amount = normaliseAmount(entry, baseCurrency, entry.currency);
    if (!byEntity[entry.entity_id]) {
      byEntity[entry.entity_id] = [];
    }

    const account = accountsById.get(entry.account_id) ?? null;
    byEntity[entry.entity_id].push({ accountId: entry.account_id, amount, account });

    const bucket = consolidated.get(entry.account_id) ?? { amount: 0, account };
    bucket.amount += amount;
    consolidated.set(entry.account_id, bucket);
  }

  const eliminations: Array<{ description: string; amount: number; accountCode?: string }> = [];
  for (const [accountId, bucket] of consolidated.entries()) {
    const account = bucket.account;
    if (!account) continue;
    if (/intercompany|due to|due from|loan to subsidiary|loan from parent/i.test(`${account.code} ${account.name}`)) {
      eliminations.push({
        description: `Eliminate intercompany balance for ${account.code} ${account.name}`,
        amount: Number(bucket.amount.toFixed(2)),
        accountCode: account.code,
      });
      bucket.amount = 0;
    }
  }

  const consolidatedTrialBalance = Array.from(consolidated.entries()).map(([accountId, bucket]) => ({
    accountId,
    code: bucket.account?.code ?? accountId,
    name: bucket.account?.name ?? 'Unknown account',
    amount: Number(bucket.amount.toFixed(2)),
    type: bucket.account?.type ?? null,
  }));

  const equity = consolidatedTrialBalance.filter((item) => item.type === 'EQUITY').reduce((sum, item) => sum + item.amount, 0);
  const assets = consolidatedTrialBalance.filter((item) => item.type === 'ASSET').reduce((sum, item) => sum + item.amount, 0);
  const liabilities = consolidatedTrialBalance.filter((item) => item.type === 'LIABILITY').reduce((sum, item) => sum + item.amount, 0);

  const summary = {
    assets: Number(assets.toFixed(2)),
    liabilities: Number(liabilities.toFixed(2)),
    equity: Number(equity.toFixed(2)),
    check: Number((assets - liabilities - equity).toFixed(2)),
  };

  return NextResponse.json({
    baseCurrency,
    entityIds,
    consolidatedTrialBalance,
    byEntity,
    eliminations,
    summary,
  });
}
