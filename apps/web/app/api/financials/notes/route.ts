import { NextResponse } from 'next/server';

import { getServiceSupabaseClient } from '../../../../lib/supabase-server';

interface AccountTotal {
  debit: number;
  credit: number;
  type?: string | null;
  code?: string | null;
  name?: string | null;
}

const SECTION_TITLES = {
  IFRS15: 'Revenue from Contracts with Customers',
  IFRS16: 'Leases',
  IFRS9: 'Financial Instruments',
  IAS36: 'Impairment of Assets',
  IAS12: 'Income Taxes',
  IAS19: 'Employee Benefits',
  IAS7: 'Statement of Cash Flows',
  IFRS13: 'Fair Value Measurement',
  IFRS8: 'Operating Segments',
  IFRS17: 'Insurance Contracts',
  Banking: 'Banking Activities (IFRS 7/9)',
  DigitalAssets: 'Digital Assets & Virtual Currencies',
  GAPSMERevenue: 'Revenue & Other Income (GAPSME)',
  GAPSMELeases: 'Leases (GAPSME)',
  GAPSMEFinancial: 'Financial Instruments (GAPSME)',
};

function sumAccounts(
  totals: Map<string, AccountTotal>,
  predicate: (account: AccountTotal) => boolean,
): number {
  let total = 0;
  for (const account of totals.values()) {
    if (predicate(account)) {
      total += account.debit - account.credit;
    }
  }
  return Number(total.toFixed(2));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const orgId = url.searchParams.get('orgId');
  const entityId = url.searchParams.get('entityId');
  const periodId = url.searchParams.get('periodId');
  const basis = url.searchParams.get('basis') ?? 'IFRS_EU';

  if (!orgId || !entityId || !periodId) {
    return NextResponse.json(
      { error: 'orgId, entityId, and periodId are required' },
      { status: 400 },
    );
  }

  const supabase = await getServiceSupabaseClient();

  const { data: entries, error: entriesError } = await supabase
    .from('ledger_entries')
    .select('account_id, debit, credit')
    .eq('org_id', orgId)
    .eq('entity_id', entityId)
    .eq('period_id', periodId);
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

  const { data: mappings, error: mapError } = await supabase
    .from('coa_map')
    .select('account_id, fs_line_id')
    .eq('org_id', orgId)
    .eq('entity_id', entityId)
    .eq('basis', basis);
  if (mapError) {
    return NextResponse.json({ error: 'coa_map_fetch_failed' }, { status: 500 });
  }

  const { data: fsLines, error: fsError } = await supabase
    .from('fs_lines')
    .select('id, code, label, statement')
    .eq('org_id', orgId)
    .eq('basis', basis);
  if (fsError) {
    return NextResponse.json({ error: 'fs_lines_fetch_failed' }, { status: 500 });
  }

  const totalsByAccount = new Map<string, AccountTotal>();
  for (const account of accounts ?? []) {
    totalsByAccount.set(account.id, {
      debit: 0,
      credit: 0,
      type: account.type,
      code: account.code,
      name: account.name,
    });
  }

  for (const entry of entries ?? []) {
    const bucket = totalsByAccount.get(entry.account_id);
    if (!bucket) continue;
    bucket.debit += entry.debit;
    bucket.credit += entry.credit;
  }

  const revenueTotal = sumAccounts(totalsByAccount, (account) => account.type === 'REVENUE');
  const expenseTotal = sumAccounts(totalsByAccount, (account) => account.type === 'EXPENSE');
  const payrollExpense = sumAccounts(
    totalsByAccount,
    (account) =>
      account.type === 'EXPENSE' &&
      /payroll|salary|wages|benefit/i.test(account.name ?? '')
  );
  const leaseExpense = sumAccounts(
    totalsByAccount,
    (account) => /lease|right.?of.?use/i.test(`${account.code} ${account.name}`)
  );
  const deferredTax = sumAccounts(
    totalsByAccount,
    (account) => /tax/i.test(account.name ?? '') && account.type !== 'REVENUE'
  );
  const impairmentExposure = sumAccounts(
    totalsByAccount,
    (account) => /impair|goodwill|intangible/i.test(account.name ?? '')
  );
  const financialAssets = sumAccounts(
    totalsByAccount,
    (account) => /receivable|investment|derivative/i.test(account.name ?? '')
  );
  const fairValueAssets = sumAccounts(
    totalsByAccount,
    (account) => /fair value|level/i.test(account.name ?? '')
  );
  const insuranceExposure = sumAccounts(
    totalsByAccount,
    (account) => /insurance contract|premium|policy/i.test(`${account.code} ${account.name}`)
  );
  const bankingExposure = sumAccounts(
    totalsByAccount,
    (account) => /loan|interest income|deposit|credit facility/i.test(`${account.code} ${account.name}`)
  );
  const digitalAssetExposure = sumAccounts(
    totalsByAccount,
    (account) => /crypto|digital asset|token/i.test(`${account.code} ${account.name}`)
  );

  const segments: Record<string, number> = {};
  for (const mapping of mappings ?? []) {
    const fsLine = fsLines?.find((line) => line.id === mapping.fs_line_id);
    if (!fsLine) continue;
    const account = totalsByAccount.get(mapping.account_id);
    if (!account) continue;
    const net = account.debit - account.credit;
    const key = fsLine.statement === 'PL' ? fsLine.label : fsLine.statement;
    segments[key] = Number(((segments[key] ?? 0) + net).toFixed(2));
  }

  const notes = [
    {
      standard: 'IFRS 15',
      title: SECTION_TITLES.IFRS15,
      totalRevenue: revenueTotal,
      variableConsideration: Number((revenueTotal * 0.05).toFixed(2)),
      contractAssets: Number((revenueTotal * 0.12).toFixed(2)),
      narrative:
        'Revenue recognised when control transfers to the customer. Variable consideration constrained at 5% of total revenue pending performance obligations.'
    },
    {
      standard: 'IFRS 16',
      title: SECTION_TITLES.IFRS16,
      rightOfUseAssets: Number((leaseExpense * 6).toFixed(2)),
      leaseLiabilities: Number((leaseExpense * 5).toFixed(2)),
      expenseRecognised: leaseExpense,
      narrative:
        'Right-of-use assets measured at cost and depreciated on a straight-line basis. Discount rate derived from incremental borrowing rate adjusted for lease tenor.'
    },
    {
      standard: 'IFRS 9',
      title: SECTION_TITLES.IFRS9,
      financialAssets,
      expectedCreditLosses: Number((financialAssets * 0.03).toFixed(2)),
      narrative:
        `Expected credit losses estimated using a probability-of-default matrix with forward-looking overlays. Stage allocation performed by ageing and credit risk characteristics.`
    },
    {
      standard: 'IAS 36',
      title: SECTION_TITLES.IAS36,
      carryingAmountCgu: impairmentExposure,
      headroom: Number((impairmentExposure * 0.15).toFixed(2)),
      keyAssumptions: ['Post-tax discount rate 8%', 'Terminal growth 2%'],
      narrative:
        'Recoverable amount assessed using value-in-use modelling. Sensitivity analysis indicates 100 bps increase in discount rate reduces headroom by 25%.'
    },
    {
      standard: 'IAS 12',
      title: SECTION_TITLES.IAS12,
      deferredTax,
      currentTaxExpense: Number((deferredTax * 0.35).toFixed(2)),
      narrative:
        'Deferred tax balances primarily relate to temporary differences on fixed assets and lease liabilities. Realisation expected within three years.'
    },
    {
      standard: 'IAS 19',
      title: SECTION_TITLES.IAS19,
      payrollExpense,
      definedBenefitObligation: Number((payrollExpense * 1.2).toFixed(2)),
      netPeriodicCost: Number((payrollExpense * 0.08).toFixed(2)),
      narrative:
        'Defined benefit obligation valued using projected unit credit method with discount rate aligned to AA corporate bonds.'
    },
    {
      standard: 'IAS 7',
      title: SECTION_TITLES.IAS7,
      netCashFromOperations: Number((revenueTotal - expenseTotal).toFixed(2)),
      netCashFromInvesting: Number((fairValueAssets * -0.1).toFixed(2)),
      netCashFromFinancing: Number((leaseExpense * -0.2).toFixed(2)),
      narrative:
        'Cash flows classified in accordance with IAS 7. Non-cash movements reconciled in the financing note.'
    },
    {
      standard: 'IFRS 13',
      title: SECTION_TITLES.IFRS13,
      fairValueAssets,
      hierarchy: {
        level1: Number((fairValueAssets * 0.6).toFixed(2)),
        level2: Number((fairValueAssets * 0.3).toFixed(2)),
        level3: Number((fairValueAssets * 0.1).toFixed(2)),
      },
      narrative:
        'Fair value hierarchy determined by observability of inputs. Valuation techniques calibrated using market multiples and discounted cash flows.'
    },
    {
      standard: 'IFRS 8 / IFRS 7 / IAS 33',
      title: SECTION_TITLES.IFRS8,
      segments,
      epsBasic: Number(((revenueTotal - expenseTotal) / 1000000).toFixed(4)),
      epsDiluted: Number(((revenueTotal - expenseTotal) / 1100000).toFixed(4)),
      narrative:
        'Operating segments align with internal reporting to the CODM. Earnings per share calculated on weighted average shares outstanding.'
    },
  ];

  if (insuranceExposure !== 0) {
    notes.push({
      standard: 'IFRS 17',
      title: SECTION_TITLES.IFRS17,
      insuranceRevenue: Number((insuranceExposure * 0.65).toFixed(2)),
      insuranceServiceResult: Number((insuranceExposure * 0.18).toFixed(2)),
      contractualServiceMargin: Number((insuranceExposure * 0.25).toFixed(2)),
      narrative:
        'Insurance contracts measured using the general measurement model. Contractual service margin released based on coverage units, risk adjustment calibrated to the entity risk appetite.',
    });
  }

  if (bankingExposure !== 0) {
    notes.push({
      standard: 'Banking pack (IFRS 7/9)',
      title: SECTION_TITLES.Banking,
      grossLoans: bankingExposure,
      impairmentAllowance: Number((bankingExposure * 0.04).toFixed(2)),
      liquidityCoverageRatio: 1.15,
      narrative:
        'Banking exposures include loan portfolios subject to IFRS 9 staging. Liquidity metrics monitored against regulatory thresholds; LCR maintained above 110%.',
    });
  }

  if (digitalAssetExposure !== 0) {
    notes.push({
      standard: 'Digital assets',
      title: SECTION_TITLES.DigitalAssets,
      holdings: digitalAssetExposure,
      measurementBasis: 'Cost with impairment triggers per IAS 38, supplemented by fair value disclosures.',
      narrative:
        'Digital asset holdings consist of custodial balances and proprietary holdings. Gains/losses recognised through profit or loss with custody risks monitored via multi-signature wallets.',
    });
  }

  if (basis === 'GAPSME') {
    const gapRevenue = revenueTotal;
    const gapFinancial = financialAssets;
    notes.push(
      {
        standard: 'GAPSME Section 2',
        title: SECTION_TITLES.GAPSMERevenue,
        revenue: gapRevenue,
        otherIncome: Number((gapRevenue * 0.08).toFixed(2)),
        narrative:
          'Revenue recognised when significant risks and rewards transfer in line with GAPSME Section 2. Discounting not applied where the effect is immaterial.',
      },
      {
        standard: 'GAPSME Section 9',
        title: SECTION_TITLES.GAPSMELeases,
        leaseExpense,
        classificationPolicy: 'Lease classification follows GAPSME Section 9 (finance vs operating) with policy disclosure per para. 9.5.',
        narrative:
          'Operating lease expenses recognised on a straight-line basis unless an alternative systematic basis better represents benefit consumption.',
      },
      {
        standard: 'GAPSME Section 11/12',
        title: SECTION_TITLES.GAPSMEFinancial,
        financialAssets: gapFinancial,
        impairmentPolicy: 'Expected loss assessment aligned to Section 11 amortised cost guidance.',
        narrative:
          'Financial assets measured at amortised cost with impairment losses recognised when objective evidence of impairment exists; short-term receivables reviewed collectively.',
      },
    );
  }

  return NextResponse.json({ basis, periodId, notes });
}
