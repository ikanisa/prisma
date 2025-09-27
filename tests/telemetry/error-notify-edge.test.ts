import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

let handler: (request: Request) => Promise<Response>;

const hoisted = vi.hoisted(() => {
  const envGetMock = vi.fn((key: string) => {
    if (key === 'ERROR_NOTIFY_WEBHOOK') return 'https://webhook.example.com/notify';
    if (key === 'API_ALLOWED_ORIGINS') return 'https://app.example.com';
    return undefined;
  });
  const createSupabaseClientWithAuthMock = vi.fn();
  const serveMock = vi.fn((fn: (request: Request) => Promise<Response>) => {
    handler = fn;
  });
  return { envGetMock, createSupabaseClientWithAuthMock, serveMock };
});

vi.mock('https://deno.land/std@0.224.0/http/server.ts', () => ({
  serve: hoisted.serveMock,
}));

vi.mock('../../supabase/functions/_shared/supabase-client.ts', () => ({
  createSupabaseClientWithAuth: (...args: unknown[]) => hoisted.createSupabaseClientWithAuthMock(...args),
}));

(globalThis as any).Deno = {
  env: {
    get: hoisted.envGetMock,
  },
};

const globalFetch = vi.fn();
vi.stubGlobal('fetch', globalFetch);

await import('../../supabase/functions/error-notify/index.ts');

type AuthResult = { data: { user: { id: string; email?: string } | null }; error: any };

let authResult: AuthResult;
let orgResult: { data: { id: string } | null; error: any };
let insertError: any;
let telemetryInsertPayloads: Array<Record<string, unknown>>;
let organizationsQuerySpy: { select: ReturnType<typeof vi.fn>; eq: ReturnType<typeof vi.fn>; maybeSingle: ReturnType<typeof vi.fn> };
let insertSpy: ReturnType<typeof vi.fn>;

function createSupabaseClient() {
  const authGetUser = vi.fn(async () => authResult);

  insertSpy = vi.fn(async (payload: Record<string, unknown>) => {
    telemetryInsertPayloads.push(payload);
    return { error: insertError };
  });

  const orgBuilder = {
    select: vi.fn(() => orgBuilder),
    eq: vi.fn(() => orgBuilder),
    maybeSingle: vi.fn(async () => orgResult),
  };
  organizationsQuerySpy = orgBuilder;

  return {
    auth: { getUser: authGetUser },
    from: vi.fn((table: string) => {
      if (table === 'organizations') {
        return orgBuilder;
      }
      if (table === 'telemetry_refusal_events') {
        return { insert: insertSpy };
      }
      throw new Error(`Unexpected table: ${table}`);
    }),
  };
}

beforeAll(() => {
  if (!handler) {
    throw new Error('Edge handler was not registered');
  }
});

beforeEach(() => {
  authResult = { data: { user: { id: 'user-1', email: 'auditor@example.com' } }, error: null };
  orgResult = { data: { id: 'org-1' }, error: null };
  insertError = null;
  telemetryInsertPayloads = [];
  globalFetch.mockReset().mockResolvedValue(new Response(null, { status: 200 }));
  hoisted.createSupabaseClientWithAuthMock.mockReset();
  hoisted.createSupabaseClientWithAuthMock.mockImplementation(() => createSupabaseClient());
});

describe('error-notify edge function', () => {
  it('allows CORS preflight', async () => {
    const response = await handler(new Request('https://example.com/error-notify', { method: 'OPTIONS' }));
    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://app.example.com');
  });

  it('rejects requests without authorization headers', async () => {
    const response = await handler(new Request('https://example.com/error-notify', { method: 'POST' }));
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toEqual({ error: 'missing_authorization' });
  });

  it('returns 401 when the access token is invalid', async () => {
    authResult = { data: { user: null }, error: new Error('invalid token') };

    const response = await handler(
      new Request('https://example.com/error-notify', {
        method: 'POST',
        headers: { Authorization: 'Bearer token' },
        body: JSON.stringify({ orgSlug: 'aurora' }),
      }),
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'invalid_token' });
  });

  it('requires an org slug in the payload', async () => {
    const response = await handler(
      new Request('https://example.com/error-notify', {
        method: 'POST',
        headers: { Authorization: 'Bearer token' },
        body: JSON.stringify({ module: 'REPORT_BUILDER', error: 'boom' }),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'org_slug_required' });
  });

  it('returns 404 when the organization is not found', async () => {
    orgResult = { data: null, error: null };

    const response = await handler(
      new Request('https://example.com/error-notify', {
        method: 'POST',
        headers: { Authorization: 'Bearer token' },
        body: JSON.stringify({ orgSlug: 'missing-org', module: 'REPORT', error: 'boom' }),
      }),
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'organization_not_found' });
  });

  it('logs telemetry refusal events and notifies the webhook', async () => {
    const response = await handler(
      new Request('https://example.com/error-notify', {
        method: 'POST',
        headers: { Authorization: 'Bearer session-token' },
        body: JSON.stringify({ orgSlug: 'aurora', module: 'REPORT', error: 'PDF failed', context: { retry: true } }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });

    expect(hoisted.createSupabaseClientWithAuthMock).toHaveBeenCalledWith('Bearer session-token');

    expect(telemetryInsertPayloads).toHaveLength(1);
    expect(telemetryInsertPayloads[0]).toMatchObject({
      org_id: 'org-1',
      module: 'REPORT',
      event: 'EDGE_FUNCTION_ERROR',
      reason: 'PDF failed',
      severity: 'ERROR',
    });

    expect(globalFetch).toHaveBeenCalledWith('https://webhook.example.com/notify', expect.any(Object));
  });
});
