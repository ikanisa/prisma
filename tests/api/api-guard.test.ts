import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/server', () => ({
  NextResponse: {
    json: (data: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(data), {
        status: init?.status ?? 200,
        headers: {
          'content-type': 'application/json',
          ...((init?.headers instanceof Headers
            ? Object.fromEntries(init.headers.entries())
            : (init?.headers as Record<string, string> | undefined)) ?? {}),
        },
      }),
  },
}));

const mocks = vi.hoisted(() => {
  const enforceRateLimitMock = vi.fn();
  const findIdempotentResponseMock = vi.fn();
  const storeIdempotentResponseMock = vi.fn();
  const attachRequestIdMock = vi.fn((init: ResponseInit | undefined, requestId: string) => {
    const headers = new Headers(init?.headers);
    headers.set('x-request-id', requestId);
    return { ...init, headers };
  });
  const getOrCreateRequestIdMock = vi.fn(() => 'req-generated');
  return {
    enforceRateLimitMock,
    findIdempotentResponseMock,
    storeIdempotentResponseMock,
    attachRequestIdMock,
    getOrCreateRequestIdMock,
  };
});

vi.mock('../../apps/web/app/lib/rate-limit', () => ({
  enforceRateLimit: mocks.enforceRateLimitMock,
}));

vi.mock('../../apps/web/app/lib/idempotency', () => ({
  findIdempotentResponse: mocks.findIdempotentResponseMock,
  storeIdempotentResponse: mocks.storeIdempotentResponseMock,
}));

vi.mock('../../apps/web/app/lib/observability', () => ({
  attachRequestId: mocks.attachRequestIdMock,
  getOrCreateRequestId: mocks.getOrCreateRequestIdMock,
}));

import { createApiGuard } from '../../apps/web/app/lib/api-guard';

describe('createApiGuard', () => {
  beforeEach(() => {
    mocks.enforceRateLimitMock.mockReset();
    mocks.findIdempotentResponseMock.mockReset();
    mocks.storeIdempotentResponseMock.mockReset();
    mocks.attachRequestIdMock.mockClear();
    mocks.getOrCreateRequestIdMock.mockClear();
  });

  it('builds a 429 response when the rate limit is exceeded', async () => {
    mocks.enforceRateLimitMock.mockResolvedValueOnce({ allowed: false, requestCount: 61 });
    const request = new Request('https://example.com/api/demo', {
      method: 'POST',
      headers: { 'x-idempotency-key': 'abc123' },
    });

    const supabase = {} as any;
    const guard = await createApiGuard({
      request,
      supabase,
      orgId: 'org-1',
      resource: 'demo:resource',
      requestId: 'req-123',
      rateLimit: { limit: 1, windowSeconds: 60 },
    });

    expect(guard.rateLimitResponse).toBeDefined();
    expect(guard.replayResponse).toBeUndefined();

    const body = await guard.rateLimitResponse!.json();
    expect(body).toEqual({ error: 'rate_limit_exceeded', retryAfterSeconds: 60 });
    expect(guard.rateLimitResponse!.headers.get('x-request-id')).toBe('req-123');
    expect(mocks.enforceRateLimitMock).toHaveBeenCalledWith({
      client: supabase,
      orgId: 'org-1',
      resource: 'demo:resource',
      limit: 1,
      windowSeconds: 60,
    });
  });

  it('persists successful responses when idempotency is enabled', async () => {
    mocks.enforceRateLimitMock.mockResolvedValue({ allowed: true, requestCount: 1 });
    mocks.findIdempotentResponseMock.mockResolvedValue(null);
    mocks.storeIdempotentResponseMock.mockResolvedValue(undefined);

    const request = new Request('https://example.com/api/demo', {
      method: 'POST',
      headers: { 'x-idempotency-key': 'cache-key' },
    });

    const supabase = { rpc: vi.fn() } as any;
    const guard = await createApiGuard({
      request,
      supabase,
      orgId: 'org-42',
      resource: 'demo:resource',
      requestId: 'req-xyz',
      rateLimit: { limit: 10, windowSeconds: 60 },
    });

    expect(guard.rateLimitResponse).toBeUndefined();
    expect(guard.replayResponse).toBeUndefined();

    const response = await guard.respond({ ok: true });
    expect(response.status).toBe(200);
    expect(response.headers.get('x-request-id')).toBe('req-xyz');
    expect(mocks.storeIdempotentResponseMock).toHaveBeenCalledWith({
      client: supabase,
      orgId: 'org-42',
      resource: 'demo:resource',
      key: 'cache-key',
      status: 200,
      response: { ok: true },
      requestId: 'req-xyz',
    });
  });

  it('replays cached responses when present', async () => {
    mocks.enforceRateLimitMock.mockResolvedValue({ allowed: true, requestCount: 1 });
    mocks.findIdempotentResponseMock.mockResolvedValue({ status: 201, body: { cached: 'value' } });

    const request = new Request('https://example.com/api/demo', {
      method: 'POST',
      headers: { 'x-idempotency-key': 'cache-key' },
    });

    const guard = await createApiGuard({
      request,
      supabase: {} as any,
      orgId: 'org-cache',
      resource: 'demo:resource',
    });

    expect(guard.replayResponse).toBeDefined();
    const body = await guard.replayResponse!.json();
    expect(body).toEqual({ cached: 'value' });
    expect(guard.replayResponse!.status).toBe(201);
    expect(mocks.storeIdempotentResponseMock).not.toHaveBeenCalled();
  });
});
