import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getSessionMock = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: getSessionMock,
    },
  },
}));

describe('notifyError', () => {
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

  it('throws when the user is not authenticated', async () => {
    getSessionMock.mockResolvedValue({ data: { session: null } });
    const { notifyError } = await import('@/lib/error-notify');

    await expect(
      notifyError({ orgSlug: 'acme', module: 'CTRL1', error: 'boom' }),
    ).rejects.toThrowError('Not authenticated');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('raises when the edge function responds with an error payload', async () => {
    getSessionMock.mockResolvedValue({ data: { session: { access_token: 'token' } } });
    fetchMock.mockResolvedValue({
      ok: false,
      text: () => Promise.resolve(JSON.stringify({ error: 'invalid_token' })),
    });

    const { notifyError } = await import('@/lib/error-notify');

    await expect(
      notifyError({ orgSlug: 'acme', module: 'CTRL1', error: 'boom' }),
    ).rejects.toThrowError('invalid_token');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.supabase.co/functions/v1/error-notify',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('returns success when the edge function accepts the request', async () => {
    getSessionMock.mockResolvedValue({ data: { session: { access_token: 'token' } } });
    fetchMock.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ success: true })),
    });

    const { notifyError } = await import('@/lib/error-notify');

    const result = await notifyError({
      orgSlug: 'acme',
      module: 'CTRL1',
      error: 'unexpected',
      context: { traceId: '123' },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.supabase.co/functions/v1/error-notify',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer token' }),
        body: JSON.stringify({ orgSlug: 'acme', module: 'CTRL1', error: 'unexpected', context: { traceId: '123' } }),
      }),
    );
    expect(result).toEqual({ success: true });
  });
});
