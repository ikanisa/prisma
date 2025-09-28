import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getSessionMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: getSessionMock,
    },
  },
}));

describe('audit-plan-service request helper', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');

    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    getSessionMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('throws when not authenticated', async () => {
    getSessionMock.mockResolvedValue({ data: { session: null } });
    const { upsertPlanStrategy } = await import('@/lib/audit-plan-service');

    await expect(
      upsertPlanStrategy({ orgSlug: 'acme', engagementId: 'eng', basisFramework: 'IFRS', strategy: {} }),
    ).rejects.toThrowError('Not authenticated');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws when the API responds with an error payload', async () => {
    getSessionMock.mockResolvedValue({ data: { session: { access_token: 'token' } } });
    fetchMock.mockResolvedValue({
      ok: false,
      text: () => Promise.resolve(JSON.stringify({ error: 'plan_locked' })),
    });

    const { setMateriality } = await import('@/lib/audit-plan-service');

    await expect(
      setMateriality({
        orgSlug: 'acme',
        engagementId: 'eng',
        fsMateriality: 100000,
        performanceMateriality: 60000,
        clearlyTrivialThreshold: 5000,
      }),
    ).rejects.toThrowError('plan_locked');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.supabase.co/functions/v1/audit-plan/materiality/set',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('maps snapshot payload into typed structures', async () => {
    getSessionMock.mockResolvedValue({ data: { session: { access_token: 'token' } } });
    const apiPayload = {
      plan: {
        id: 'plan-1',
        basis_framework: 'IFRS',
        strategy: { cycles: ['Revenue'] },
        status: 'READY_FOR_APPROVAL',
        submitted_at: '2025-01-02T00:00:00Z',
        locked_at: null,
        approvals: [{ id: 'appr-1' }],
        updated_at: '2025-01-03T00:00:00Z',
      },
      materiality: {
        id: 'mat-1',
        fs_materiality: '100000',
        performance_materiality: '60000',
        clearly_trivial_threshold: '5000',
        benchmarks: [{ label: 'Revenue', amount: 1000000 }],
        rationale: 'Revenue volatility',
        prepared_at: '2025-01-02T12:00:00Z',
      },
      changeLog: [
        {
          id: 'chg-1',
          reason: 'Scope increase',
          impact: { hours: 40 },
          created_at: '2025-01-04T00:00:00Z',
          changed_by_user_id: 'user-1',
        },
      ],
      approvals: [
        {
          id: 'appr-1',
          stage: 'MANAGER',
          status: 'APPROVED',
          created_at: '2025-01-02T01:00:00Z',
          resolved_at: '2025-01-02T02:00:00Z',
          resolved_by_user_id: 'user-2',
          payload: { note: 'Looks good' },
        },
      ],
    };

    fetchMock.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify(apiPayload)),
    });

    const { fetchAuditPlanSnapshot } = await import('@/lib/audit-plan-service');

    const snapshot = await fetchAuditPlanSnapshot({ orgSlug: 'acme', engagementId: 'eng' });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.supabase.co/functions/v1/audit-plan/status?orgSlug=acme&engagementId=eng',
      expect.any(Object),
    );
    expect(snapshot.plan?.basisFramework).toBe('IFRS');
    expect(snapshot.plan?.strategy).toEqual({ cycles: ['Revenue'] });
    expect(snapshot.materiality?.fsMateriality).toBe(100000);
    expect(snapshot.changeLog[0].impact).toEqual({ hours: 40 });
    expect(snapshot.approvals[0].payload).toEqual({ note: 'Looks good' });
  });
});
