import { beforeEach, describe, expect, it, vi } from 'vitest';

let handler: (request: Request) => Promise<Response>;

const hoisted = vi.hoisted(() => {
  const envGetMock = vi.fn((key: string) => {
    if (key === 'API_ALLOWED_ORIGINS') return 'https://app.prisma-cpa.vercel.app';
    return undefined;
  });

  let supabaseClient: any = null;
  const createSupabaseClientWithAuthMock = vi.fn(() => supabaseClient);
  const serveMock = vi.fn((fn: (request: Request) => Promise<Response>) => {
    handler = fn;
  });
  const logEdgeErrorMock = vi.fn();

  return {
    envGetMock,
    createSupabaseClientWithAuthMock,
    serveMock,
    logEdgeErrorMock,
    setSupabaseClient(client: any) {
      supabaseClient = client;
    },
  };
});

vi.mock('https://deno.land/std@0.224.0/http/server.ts', () => ({
  serve: hoisted.serveMock,
}));

vi.mock('../../supabase/functions/_shared/supabase-client.ts', () => ({
  createSupabaseClientWithAuth: (...args: unknown[]) => hoisted.createSupabaseClientWithAuthMock(...args),
}));

vi.mock('../../supabase/functions/_shared/error-notify.ts', () => ({
  logEdgeError: (...args: unknown[]) => hoisted.logEdgeErrorMock(...args),
}));

declare const Deno: {
  env: { get: (key: string) => string | undefined };
};

function makeResult<T>(data: T, error: any = null) {
  return { data, error };
}

function makeBuilder(result: { data: unknown; error: any }) {
  const builder: any = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    single: vi.fn(async () => result),
    maybeSingle: vi.fn(async () => result),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    lte: vi.fn(() => builder),
    in: vi.fn(() => builder),
    upsert: vi.fn(() => builder),
  };
  builder.then = (resolve: (value: typeof result) => unknown) => resolve(result);
  builder.catch = () => builder;
  return builder;
}

describe('telemetry-sync edge function', () => {
  beforeEach(async () => {
    handler = undefined as unknown as typeof handler;
    vi.resetModules();
    vi.clearAllMocks();

    (globalThis as any).Deno = { env: { get: hoisted.envGetMock } };

    const tableResults: Record<string, { data: unknown; error: any }> = {
      organizations: makeResult({ id: 'org-1' }),
      memberships: makeResult({ role: 'MANAGER' }),
      engagements: makeResult({ id: 'eng-1', org_id: 'org-1' }),
      telemetry_coverage_metrics: makeResult(null),
      telemetry_service_levels: makeResult(null),
      telemetry_refusal_events: makeResult(null),
      activity_log: makeResult(null),
    };

    const supabaseClient = {
      auth: {
        getUser: vi.fn(async () => ({ data: { user: { id: 'user-1' } }, error: null })),
      },
      from: vi.fn((table: string) => makeBuilder(tableResults[table] ?? makeResult(null))),
      rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
    };

    hoisted.setSupabaseClient(supabaseClient);

    await import('../../supabase/functions/telemetry-sync/index.ts');

    if (!handler) throw new Error('Edge handler not registered');
  });

  it('accumulates telemetry when invoked by a manager', async () => {
    const response = await handler(
      new Request('https://edge.test/telemetry-sync', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orgSlug: 'acme', engagementId: 'eng-1' }),
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.coverage).toHaveLength(2);
    expect(body.sla).toMatchObject({ module: 'TAX_TREATY_WHT', status: 'ON_TRACK' });
    expect(body.webCache).toMatchObject({ retentionDays: 14 });
    expect(hoisted.createSupabaseClientWithAuthMock).toHaveBeenCalledWith('Bearer token');
  });

  it('returns 401 when Authorization header is missing', async () => {
    const response = await handler(
      new Request('https://edge.test/telemetry-sync', {
        method: 'POST',
        body: JSON.stringify({ orgSlug: 'acme', engagementId: 'eng-1' }),
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toEqual({ error: 'missing_authorization' });
  });
});
