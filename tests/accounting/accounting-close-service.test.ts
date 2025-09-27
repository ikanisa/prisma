import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

let getSessionMock: ReturnType<typeof vi.fn>;

vi.mock('@/integrations/supabase/client', () => {
  getSessionMock = vi.fn();
  return {
    supabase: {
      auth: {
        getSession: getSessionMock,
      },
    },
  };
});

let accountingClose: typeof import('@/lib/accounting-close-service');

beforeAll(async () => {
  accountingClose = await import('@/lib/accounting-close-service');
});

describe('accounting-close-service request helpers', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    getSessionMock.mockResolvedValue({ data: { session: { access_token: 'token' } } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    getSessionMock.mockReset();
  });

  it('throws when not authenticated', async () => {
    getSessionMock.mockResolvedValueOnce({ data: { session: null } });

    await expect(
      accountingClose.importAccounts({ orgSlug: 'acme', accounts: [] }),
    ).rejects.toThrowError('Not authenticated');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('imports accounts and handles JSON response', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ imported: 3 })),
    });

    const result = await accountingClose.importAccounts({
      orgSlug: 'acme',
      accounts: [{ code: '1000', name: 'Cash', type: 'ASSET' }],
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/functions/v1/accounting-close/accounts/import'),
      expect.objectContaining({ method: 'POST' }),
    );
    expect(result.imported).toBe(3);
  });

  it('imports ledger entries', async () => {
    fetchMock.mockResolvedValue({ ok: true, text: () => Promise.resolve(JSON.stringify({ inserted: 5 })) });

    const result = await accountingClose.importEntries({ orgSlug: 'acme', entries: [{ accountId: 'acct', debit: 10 }] });
    expect(result.inserted).toBe(5);
  });

  it('runs journal lifecycle helpers', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(JSON.stringify({ batchId: 'batch-1' })) })
      .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(JSON.stringify({ linesInserted: 2 })) })
      .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(JSON.stringify({ batchId: 'batch-1', alerts: 0 })) })
      .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(JSON.stringify({ status: 'APPROVED' })) })
      .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(JSON.stringify({ status: 'POSTED' })) });

    const create = await accountingClose.createJournalBatch({ orgSlug: 'acme', entityId: 'entity' });
    expect(create.batchId).toBe('batch-1');

    const lines = await accountingClose.addJournalLines({ orgSlug: 'acme', batchId: 'batch-1', lines: [] });
    expect(lines.linesInserted).toBe(2);

    const submit = await accountingClose.submitJournal({ orgSlug: 'acme', batchId: 'batch-1' });
    expect(submit.alerts).toBe(0);

    const approve = await accountingClose.approveJournal({ orgSlug: 'acme', batchId: 'batch-1' });
    expect(approve.status).toBe('APPROVED');

    const posted = await accountingClose.postJournal({ orgSlug: 'acme', batchId: 'batch-1' });
    expect(posted.status).toBe('POSTED');
  });

  it('handles reconciliation helpers', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(JSON.stringify({ reconciliationId: 'rec-1', difference: 0 })) })
      .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(JSON.stringify({ success: true })) })
      .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(JSON.stringify({ status: 'CLOSED' })) });

    const rec = await accountingClose.createReconciliation({ orgSlug: 'acme', type: 'BANK', glBalance: 0, externalBalance: 0 });
    expect(rec.reconciliationId).toBe('rec-1');

    const add = await accountingClose.addReconciliationItem({ orgSlug: 'acme', reconciliationId: 'rec-1', category: 'DIT', amount: 10 });
    expect(add.success).toBe(true);

    const close = await accountingClose.closeReconciliation({ orgSlug: 'acme', reconciliationId: 'rec-1' });
    expect(close.status).toBe('CLOSED');
  });

  it('handles trial balance snapshot, variance, PBC, and close advance', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(JSON.stringify({ snapshotId: 'tb-1', totalDebit: 100, totalCredit: 100 })) })
      .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(JSON.stringify({ triggered: 3 })) })
      .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(JSON.stringify({ inserted: 4 })) })
      .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(JSON.stringify({ status: 'SUBSTANTIVE_REVIEW' })) })
      .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve(JSON.stringify({ status: 'LOCKED' })) });

    const snapshot = await accountingClose.snapshotTrialBalance({ orgSlug: 'acme' });
    expect(snapshot.snapshotId).toBe('tb-1');

    const variance = await accountingClose.runVariance({ orgSlug: 'acme' });
    expect(variance.triggered).toBe(3);

    const pbc = await accountingClose.instantiatePbc({ orgSlug: 'acme', area: 'BANK', items: [] });
    expect(pbc.inserted).toBe(4);

    const advance = await accountingClose.advanceClosePeriod({ orgSlug: 'acme', closePeriodId: 'close-1' });
    expect(advance.status).toBe('SUBSTANTIVE_REVIEW');

    const lock = await accountingClose.lockClosePeriod({ orgSlug: 'acme', closePeriodId: 'close-1' });
    expect(lock.status).toBe('LOCKED');
  });
});
