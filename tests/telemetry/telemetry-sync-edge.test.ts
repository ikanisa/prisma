import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

let handler: (request: Request) => Promise<Response>;

const hoisted = vi.hoisted(() => {
  const envGetMock = vi.fn();
  const createSupabaseClientWithAuthMock = vi.fn();
  const logEdgeErrorMock = vi.fn();
  const serveMock = vi.fn((fn: (request: Request) => Promise<Response>) => {
    handler = fn;
  });
  return { envGetMock, createSupabaseClientWithAuthMock, logEdgeErrorMock, serveMock };
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

const envGetMock = hoisted.envGetMock;
const createSupabaseClientWithAuthMock = hoisted.createSupabaseClientWithAuthMock;
const logEdgeErrorMock = hoisted.logEdgeErrorMock;
const serveMock = hoisted.serveMock;

(globalThis as any).Deno = {
  env: {
    get: envGetMock,
  },
};

envGetMock.mockImplementation((key: string) => {
  if (key === 'SUPABASE_URL') return 'https://supabase.test';
  if (key === 'SUPABASE_SERVICE_ROLE_KEY') return 'service-role-key';
  if (key === 'API_ALLOWED_ORIGINS') return 'https://app.example.com';
  if (key === 'WEB_FETCH_CACHE_RETENTION_DAYS') return '14';
  return undefined;
});

const singleResults: Record<string, { data: any; error: any }> = {};
const countResults: Record<string, number> = {};
const countErrors: Record<string, any> = {};
const upsertErrors: Record<string, any> = {};
const upsertPayloads: Record<string, any[]> = {};
const insertPayloads: Record<string, any[]> = {};
let authResult: { data: { user: { id: string } | null }; error: any } = {
  data: { user: { id: 'user-1' } },
  error: null,
};

function createQueryBuilder(table: string) {
  const promise = Promise.resolve({
    count: countResults[table] ?? 0,
    error: countErrors[table] ?? null,
  });

  const builder: any = Object.assign(promise, {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    in: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    lte: vi.fn(() => builder),
    maybeSingle: vi.fn(() => Promise.resolve(singleResults[table] ?? { data: null, error: null })),
    upsert: vi.fn((payload: unknown, options?: unknown) => {
      upsertPayloads[table] = [...(upsertPayloads[table] ?? []), { payload, options }];
      const error = upsertErrors[table] ?? null;
      return Promise.resolve({ error });
    }),
  });

  return builder;
}

function createSupabaseClient() {
  return {
    auth: {
      getUser: vi.fn(async () => authResult),
    },
    from: vi.fn((table: string) => {
    if (table === 'telemetry_alerts') {
      return {
        insert: vi.fn(async (payload: unknown) => {
          insertPayloads[table] = [...(insertPayloads[table] ?? []), { payload }];
          return { error: null };
        }),
      };
    }
      return createQueryBuilder(table);
    }),
  };
}

beforeAll(async () => {
  await import('../../supabase/functions/telemetry-sync/index.ts');
  if (!handler) {
    throw new Error('Edge function handler was not registered');
  }
});

beforeEach(() => {
  createSupabaseClientWithAuthMock.mockReset();
  logEdgeErrorMock.mockReset();
  authResult = { data: { user: { id: 'user-1' } }, error: null };
  for (const map of [singleResults, countResults, countErrors, upsertErrors, upsertPayloads]) {
    for (const key of Object.keys(map)) {
      // @ts-expect-error deliberate mutation for test setup
      delete map[key];
    }
  }
  for (const key of Object.keys(insertPayloads)) {
    delete insertPayloads[key];
  }

  singleResults.web_fetch_cache_metrics = {
    data: {
      total_rows: 0,
      total_bytes: 0,
      total_chars: 0,
      fetched_last_24h: 0,
      used_last_24h: 0,
      newest_fetched_at: null,
      oldest_fetched_at: null,
      newest_last_used_at: null,
      oldest_last_used_at: null,
    },
    error: null,
  };

  createSupabaseClientWithAuthMock.mockImplementation(() => createSupabaseClient());
});

describe('telemetry-sync edge function', () => {
  it('requires an authorization header', async () => {
    const response = await handler(new Request('https://example.com', { method: 'POST' }));
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toEqual({ error: 'missing_authorization' });
    expect(createSupabaseClientWithAuthMock).not.toHaveBeenCalled();
  });

  it('responds to CORS preflight requests', async () => {
    const response = await handler(new Request('https://example.com', { method: 'OPTIONS' }));
    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://app.example.com');
    expect(await response.text()).toBe('');
  });

  it('aggregates telemetry metrics and writes coverage/SLA rows', async () => {
    singleResults.organizations = { data: { id: 'org-1' }, error: null };
    singleResults.memberships = { data: { role: 'MANAGER' }, error: null };
    countResults.engagements = 4;
    countResults.tax_dispute_cases = 1;
    countResults.treaty_wht_calculations = 2;
    countResults.us_tax_overlay_calculations = 3;
    const newest = new Date();
    const oldest = new Date(newest.getTime() - 2 * 24 * 60 * 60 * 1000);
    singleResults.web_fetch_cache_metrics = {
      data: {
        total_rows: 5,
        total_bytes: 2048,
        total_chars: 8192,
        fetched_last_24h: 2,
        used_last_24h: 1,
        newest_fetched_at: newest.toISOString(),
        oldest_fetched_at: oldest.toISOString(),
        newest_last_used_at: newest.toISOString(),
        oldest_last_used_at: oldest.toISOString(),
      },
      error: null,
    };

    const response = await handler(
      new Request('https://example.com', {
        method: 'POST',
        headers: { Authorization: 'Bearer session-token' },
        body: JSON.stringify({ orgSlug: 'prisma-glow', periodStart: '2025-01-01', periodEnd: '2025-01-31' }),
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.coverage).toHaveLength(2);
    expect(body.coverage[0]).toMatchObject({ module: 'TAX_TREATY_WHT', measured_value: 2, population: 4 });
    expect(body.sla).toMatchObject({ module: 'TAX_TREATY_WHT', open_breaches: 1, status: 'AT_RISK' });
    expect(body.webCache).toMatchObject({ retentionDays: 14, status: 'HEALTHY' });
    expect(body.webCache.metrics.totalRows).toBe(5);

    expect(upsertPayloads.telemetry_coverage_metrics?.[0].payload).toHaveLength(2);
    expect(upsertPayloads.telemetry_service_levels?.[0].payload).toMatchObject({ module: 'TAX_TREATY_WHT' });

    expect(createSupabaseClientWithAuthMock).toHaveBeenCalledWith('Bearer session-token');
    expect(logEdgeErrorMock).not.toHaveBeenCalled();
  });

  it('emits a telemetry alert when cache retention exceeds the configured window', async () => {
    singleResults.organizations = { data: { id: 'org-1' }, error: null };
    singleResults.memberships = { data: { role: 'MANAGER' }, error: null };
    countResults.engagements = 1;
    countResults.tax_dispute_cases = 0;
    countResults.treaty_wht_calculations = 0;
    countResults.us_tax_overlay_calculations = 0;
    const now = new Date('2025-02-01T00:00:00Z');
    const oldest = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString();
    singleResults.web_fetch_cache_metrics = {
      data: {
        total_rows: 12,
        total_bytes: 4096,
        total_chars: 16384,
        fetched_last_24h: 0,
        used_last_24h: 0,
        newest_fetched_at: now.toISOString(),
        oldest_fetched_at: oldest,
        newest_last_used_at: now.toISOString(),
        oldest_last_used_at: oldest,
      },
      error: null,
    };

    const response = await handler(
      new Request('https://example.com', {
        method: 'POST',
        headers: { Authorization: 'Bearer token' },
        body: JSON.stringify({ orgSlug: 'prisma-glow', periodStart: '2025-01-01', periodEnd: '2025-01-31' }),
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.webCache.status).toBe('STALE');
    expect(insertPayloads.telemetry_alerts?.[0].payload).toMatchObject({
      alert_type: 'WEB_CACHE_RETENTION',
      severity: 'WARNING',
    });
    expect(insertPayloads.telemetry_alerts?.[0].payload).toHaveProperty('context');
  });

  it('rejects members without sufficient role', async () => {
    singleResults.organizations = { data: { id: 'org-1' }, error: null };
    singleResults.memberships = { data: { role: 'EMPLOYEE' }, error: null };

    const response = await handler(
      new Request('https://example.com', {
        method: 'POST',
        headers: { Authorization: 'Bearer token' },
        body: JSON.stringify({ orgSlug: 'prisma-glow' }),
      }),
    );

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body).toEqual({ error: 'insufficient_role' });
  });

  it('logs edge failures and returns a 500 when inserts fail', async () => {
    singleResults.organizations = { data: { id: 'org-1' }, error: null };
    singleResults.memberships = { data: { role: 'MANAGER' }, error: null };
    countResults.engagements = 1;
    countResults.tax_dispute_cases = 0;
    countResults.treaty_wht_calculations = 0;
    countResults.us_tax_overlay_calculations = 0;
    upsertErrors.telemetry_coverage_metrics = { message: 'fail_upsert' };

    const response = await handler(
      new Request('https://example.com', {
        method: 'POST',
        headers: { Authorization: 'Bearer token' },
        body: JSON.stringify({ orgSlug: 'prisma-glow' }),
      }),
    );

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body).toEqual({ error: 'fail_upsert' });

    expect(logEdgeErrorMock).toHaveBeenCalledWith(expect.anything(), {
      module: 'TELEMETRY_SYNC',
      message: 'fail_upsert',
      orgId: 'org-1',
      orgSlug: 'prisma-glow',
      context: expect.objectContaining({ periodStart: undefined, periodEnd: undefined }),
    });
  });
});
