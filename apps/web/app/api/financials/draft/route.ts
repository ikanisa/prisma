import { NextResponse } from 'next/server';
import { getServiceSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const orgId = url.searchParams.get('orgId');
  const entityId = url.searchParams.get('entityId');
  const periodId = url.searchParams.get('periodId');
  const basis = url.searchParams.get('basis') ?? 'IFRS_EU';

  if (!orgId || !entityId || !periodId) {
    return NextResponse.json({ error: 'orgId, entityId, and periodId are required' }, { status: 400 });
  }

  const supabase = await getServiceSupabaseClient();

  const { data: entries } = await supabase
    .from('ledger_entries')
    .select('account_id, debit, credit')
    .eq('org_id', orgId)
    .eq('entity_id', entityId)
    .eq('period_id', periodId);

  const totalsByAccount = new Map<string, { debit: number; credit: number }>();
  for (const entry of entries ?? []) {
    if (!totalsByAccount.has(entry.account_id)) {
      totalsByAccount.set(entry.account_id, { debit: 0, credit: 0 });
    }
    const bucket = totalsByAccount.get(entry.account_id)!;
    bucket.debit += entry.debit;
    bucket.credit += entry.credit;
  }

  const { data: accounts } = await supabase
    .from('ledger_accounts')
    .select('id, code, name')
    .eq('org_id', orgId)
    .eq('entity_id', entityId);

  const { data: mappings } = await supabase
    .from('coa_map')
    .select('account_id, fs_line_id')
    .eq('org_id', orgId)
    .eq('entity_id', entityId)
    .eq('basis', basis);

  const { data: fsLines } = await supabase
    .from('fs_lines')
    .select('id, code, label, statement, sort_order')
    .eq('org_id', orgId)
    .eq('basis', basis)
    .order('sort_order');

  const accountsByFsLine = new Map<string, string[]>(
    (mappings ?? []).reduce((acc, mapping) => {
      const list = acc.get(mapping.fs_line_id) ?? [];
      list.push(mapping.account_id);
      acc.set(mapping.fs_line_id, list);
      return acc;
    }, new Map<string, string[]>())
  );

  const balanceSheet: Array<{ code: string; label: string; amount: number }> = [];
  const incomeStatement: Array<{ code: string; label: string; amount: number }> = [];

  for (const line of fsLines ?? []) {
    const accountIds = accountsByFsLine.get(line.id) ?? [];
    const amount = accountIds.reduce((sum, accountId) => {
      const totals = totalsByAccount.get(accountId);
      if (!totals) return sum;
      return sum + totals.debit - totals.credit;
    }, 0);

    const entry = { code: line.code, label: line.label, amount };
    if (line.statement === 'BS') {
      balanceSheet.push(entry);
    } else if (line.statement === 'PL') {
      incomeStatement.push(entry);
    }
  }

  const netIncome = incomeStatement.reduce((sum, item) => sum + item.amount, 0);
  const cashFlow = {
    operating: [{ label: 'Net income', amount: netIncome }],
    investing: [] as Array<{ label: string; amount: number }>,
    financing: [] as Array<{ label: string; amount: number }>,
    netChange: netIncome,
  };

  const trialBalance = (accounts ?? []).map((account) => {
    const totals = totalsByAccount.get(account.id) ?? { debit: 0, credit: 0 };
    return {
      accountId: account.id,
      code: account.code,
      name: account.name,
      debit: totals.debit,
      credit: totals.credit,
      net: totals.debit - totals.credit,
    };
  });

  return NextResponse.json({
    basis,
    balanceSheet,
    incomeStatement,
    cashFlow,
    trialBalance,
  });
}
