import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchConsolidatedTrialBalance } from '@/lib/consolidation-service';
import { fetchFinancialNotes, requestEsefExport } from '@/lib/financial-report-service';

describe('financial reporting client helpers', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('serialises consolidation parameters and returns parsed payload', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          baseCurrency: 'EUR',
          entityIds: ['ent-parent', 'ent-sub'],
          consolidatedTrialBalance: [],
          byEntity: {},
          eliminations: [],
          summary: { assets: 0, liabilities: 0, equity: 0, check: 0 },
        }),
    });

    const result = await fetchConsolidatedTrialBalance({
      orgId: 'org',
      parentEntityId: 'ent-parent',
      subsidiaries: ['ent-sub'],
      currency: 'EUR',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/financials/consolidation?orgId=org&parentEntityId=ent-parent&subsidiaries=ent-sub&currency=EUR',
    );
    expect(result.summary.check).toBe(0);
    expect(result.entityIds).toContain('ent-sub');
  });

  it('fetches disclosure notes for a given period', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          basis: 'IFRS_EU',
          periodId: 'per-1',
          notes: [{ standard: 'IFRS 15', totalRevenue: 100 }],
        }),
    });

    const result = await fetchFinancialNotes({
      orgId: 'org',
      entityId: 'ent',
      periodId: 'per-1',
    });

    expect(fetchMock).toHaveBeenCalledWith('/api/financials/notes?orgId=org&entityId=ent&periodId=per-1');
    expect(result.notes[0].standard).toBe('IFRS 15');
  });

  it('requests Inline XBRL export and returns fetch response', async () => {
    const response = new Response('mock');
    fetchMock.mockResolvedValue(response);

    const result = await requestEsefExport({
      orgId: 'org',
      entityId: 'ent',
      periodId: 'per-1',
      periodLabel: 'FY2025',
      basis: 'IFRS_EU',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/financials/esef?orgId=org&entityId=ent&periodId=per-1&periodLabel=FY2025&basis=IFRS_EU',
    );
    expect(result).toBe(response);
  });

  it('propagates fetch errors from disclosure helper', async () => {
    fetchMock.mockResolvedValue({ ok: false });

    await expect(
      fetchFinancialNotes({ orgId: 'org', entityId: 'ent', periodId: 'per-1' }),
    ).rejects.toThrowError('Failed to load financial notes');
  });
});
