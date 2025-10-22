import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServiceSupabaseClientMock } = vi.hoisted(() => ({
  getServiceSupabaseClientMock: vi.fn(),
}));

vi.mock('@/lib/supabase-server', () => ({
  getServiceSupabaseClient: getServiceSupabaseClientMock,
}));

vi.mock('../../apps/web/lib/supabase-server', () => ({
  getServiceSupabaseClient: getServiceSupabaseClientMock,
}));

import { GET } from '../../apps/web/app/api/financials/consolidation/route';

function createSupabase({
  entries,
  accounts,
  entriesError = null,
  accountsError = null,
}: {
  entries: Array<{
    entity_id: string;
    account_id: string;
    debit: number;
    credit: number;
    currency?: string | null;
    fx_rate?: number | null;
  }>;
  accounts: Array<{
    id: string;
    code: string;
    name: string;
    type: string | null;
  }>;
  entriesError?: { message: string } | null;
  accountsError?: { message: string } | null;
}) {
  const entriesIn = vi.fn(async () => ({ data: entries, error: entriesError }));
  const entriesEq = vi.fn(() => ({ in: entriesIn }));
  const entriesSelect = vi.fn(() => ({ eq: entriesEq }));

  const accountsIn = vi.fn(async () => ({ data: accounts, error: accountsError }));
  const accountsSelect = vi.fn(() => ({ in: accountsIn }));

  const from = vi.fn((table: string) => {
    if (table === 'ledger_entries') {
      return { select: entriesSelect };
    }
    if (table === 'ledger_accounts') {
      return { select: accountsSelect };
    }
    throw new Error(`Unexpected table ${table}`);
  });

  return {
    supabase: { from } as Record<string, unknown>,
    spies: { entriesIn, entriesEq, entriesSelect, accountsIn, accountsSelect, from },
  };
}

describe('GET /api/financials/consolidation', () => {
  beforeEach(() => {
    getServiceSupabaseClientMock.mockReset();
  });

  it('requires orgId and parentEntityId', async () => {
    const response = await GET(new Request('https://example.com/api/financials/consolidation'));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'orgId and parentEntityId are required' });
  });

  it('aggregates ledger data and removes intercompany balances', async () => {
    const { supabase } = createSupabase({
      entries: [
        { entity_id: 'parent', account_id: 'acct-assets', debit: 1000, credit: 0, currency: 'EUR', fx_rate: null },
        { entity_id: 'subsidiary', account_id: 'acct-liab', debit: 0, credit: 300, currency: 'EUR', fx_rate: null },
        { entity_id: 'parent', account_id: 'acct-ic', debit: 400, credit: 0, currency: 'EUR', fx_rate: null },
        { entity_id: 'subsidiary', account_id: 'acct-ic', debit: 0, credit: 400, currency: 'EUR', fx_rate: null },
      ],
      accounts: [
        { id: 'acct-assets', code: '1000', name: 'Cash', type: 'ASSET' },
        { id: 'acct-liab', code: '2000', name: 'Accounts Payable', type: 'LIABILITY' },
        { id: 'acct-ic', code: '3000', name: 'Due from parent', type: 'ASSET' },
      ],
    });
    getServiceSupabaseClientMock.mockResolvedValue(supabase);

    const response = await GET(
      new Request(
        'https://example.com/api/financials/consolidation?orgId=org-1&parentEntityId=parent&subsidiaries=subsidiary&currency=EUR',
      ),
    );

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.baseCurrency).toBe('EUR');
    expect(body.entityIds).toEqual(['parent', 'subsidiary']);

    expect(body.consolidatedTrialBalance).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ accountId: 'acct-assets', code: '1000', amount: 1000 }),
        expect.objectContaining({ accountId: 'acct-liab', code: '2000', amount: -300 }),
        expect.objectContaining({ accountId: 'acct-ic', code: '3000', amount: 0 }),
      ]),
    );

    expect(body.eliminations).toEqual([
      expect.objectContaining({ accountCode: '3000', amount: 0, description: expect.stringContaining('intercompany') }),
    ]);

    expect(body.summary).toEqual({ assets: 1000, liabilities: -300, equity: 0, check: 1300 });

    expect(body.byEntity.parent).toHaveLength(2);
    expect(body.byEntity.subsidiary).toHaveLength(2);
  });

  it('returns 500 when ledger entries cannot be fetched', async () => {
    const { supabase } = createSupabase({
      entries: [],
      accounts: [],
      entriesError: { message: 'boom' },
    });
    getServiceSupabaseClientMock.mockResolvedValue(supabase);

    const response = await GET(
      new Request('https://example.com/api/financials/consolidation?orgId=org-1&parentEntityId=parent'),
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'ledger_entries_fetch_failed' });
  });
});
