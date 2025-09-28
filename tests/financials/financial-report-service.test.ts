import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchFinancialNotes, requestEsefExport } from '@/lib/financial-report-service';

describe('financial-report-service', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches financial notes and returns JSON body', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ basis: 'IFRS_EU', periodId: 'per-1', notes: [] }),
    });

    const result = await fetchFinancialNotes({ orgId: 'org-1', entityId: 'ent-1', periodId: 'per-1' });

    expect(fetchMock).toHaveBeenCalledWith('/api/financials/notes?orgId=org-1&entityId=ent-1&periodId=per-1');
    expect(result.basis).toBe('IFRS_EU');
  });

  it('throws when financial notes request fails', async () => {
    fetchMock.mockResolvedValue({ ok: false });

    await expect(
      fetchFinancialNotes({ orgId: 'org-1', entityId: 'ent-1', periodId: 'per-1' }),
    ).rejects.toThrowError('Failed to load financial notes');
  });

  it('returns raw response when requesting ESEF export', async () => {
    const response = new Response('test');
    fetchMock.mockResolvedValue(response);

    const result = await requestEsefExport({ orgId: 'org-1', entityId: 'ent-1', periodId: 'per-1', periodLabel: 'FY2025' });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/financials/esef?orgId=org-1&entityId=ent-1&periodId=per-1&periodLabel=FY2025',
    );
    expect(result).toBe(response);
  });
});
