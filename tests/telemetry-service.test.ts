import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getSessionMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: getSessionMock,
    },
  },
}));

describe('syncTelemetry', () => {
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
    const { syncTelemetry } = await import('@/lib/telemetry-service');

    await expect(syncTelemetry({ orgSlug: 'acme' })).rejects.toThrowError('Not authenticated');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws when the edge function returns an error', async () => {
    getSessionMock.mockResolvedValue({ data: { session: { access_token: 'token' } } });
    fetchMock.mockResolvedValue({
      ok: false,
      text: () => Promise.resolve(JSON.stringify({ error: 'invalid_period' })),
    });

    const { syncTelemetry } = await import('@/lib/telemetry-service');

    await expect(syncTelemetry({ orgSlug: 'acme', periodStart: '2025-01-01' })).rejects.toThrowError(
      'invalid_period',
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.supabase.co/functions/v1/telemetry-sync',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('returns structured payload when the sync succeeds', async () => {
    getSessionMock.mockResolvedValue({ data: { session: { access_token: 'token' } } });
    fetchMock.mockResolvedValue({
      ok: true,
      text: () =>
        Promise.resolve(
          JSON.stringify({
            coverage: [
              { module: 'TAX_US_OVERLAY', metric: 'coverage_ratio', measured_value: 5, population: 8 },
            ],
            sla: { module: 'TAX_US_OVERLAY', workflow_event: 'MAP_CASE_RESPONSE', status: 'ON_TRACK', open_breaches: 0 },
          }),
        ),
    });

    const { syncTelemetry } = await import('@/lib/telemetry-service');

    const payload = { orgSlug: 'acme', periodStart: '2025-01-01', periodEnd: '2025-01-31' };
    const result = await syncTelemetry(payload);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.supabase.co/functions/v1/telemetry-sync',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer token' }),
        body: JSON.stringify(payload),
      }),
    );
    expect(result.coverage[0].module).toBe('TAX_US_OVERLAY');
    expect(result.sla.status).toBe('ON_TRACK');
  });
});
