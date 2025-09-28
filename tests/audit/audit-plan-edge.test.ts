import { beforeEach, describe, expect, it, vi } from 'vitest';

let handler: (request: Request) => Promise<Response>;

const hoisted = vi.hoisted(() => {
  const envGetMock = vi.fn((key: string) => {
    if (key === 'API_ALLOWED_ORIGINS') return 'https://app.example.com';
    return undefined;
  });

  let supabaseClient: any = null;
  const createSupabaseClientWithAuthMock = vi.fn(() => supabaseClient);
  const serveMock = vi.fn((fn: (request: Request) => Promise<Response>) => {
    handler = fn;
  });

  return {
    envGetMock,
    createSupabaseClientWithAuthMock,
    serveMock,
    setSupabaseClient(client: any) {
      supabaseClient = client;
    },
  };
});

declare const Deno: {
  env: { get: (key: string) => string | undefined };
  serve: (handler: (request: Request) => Promise<Response>) => void;
};

vi.mock('https://deno.land/std@0.224.0/http/server.ts', () => ({
  serve: hoisted.serveMock,
}));

vi.mock('../../supabase/functions/_shared/supabase-client.ts', () => ({
  createSupabaseClientWithAuth: (...args: unknown[]) => hoisted.createSupabaseClientWithAuthMock(...args),
}));

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
    update: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    upsert: vi.fn(() => builder),
  };
  builder.then = (resolve: (value: typeof result) => unknown) => resolve(result);
  builder.catch = () => builder;
  return builder;
}

describe('audit-plan edge function', () => {
  beforeEach(async () => {
    handler = undefined as unknown as typeof handler;
    vi.resetModules();
    vi.clearAllMocks();

    (globalThis as any).Deno = {
      env: { get: hoisted.envGetMock },
      serve: hoisted.serveMock,
    };

    const tableResults: Record<string, { data: unknown; error: any }> = {
      organizations: makeResult({ id: 'org-1' }),
      memberships: makeResult({ role: 'MANAGER' }),
      engagements: makeResult({ id: 'eng-1', org_id: 'org-1' }),
      audit_plans: makeResult({ id: 'plan-1', status: 'DRAFT' }),
      materiality_sets: makeResult({ id: 'mat-1' }),
      plan_change_log: makeResult([{ id: 'change-1' }]),
      approval_queue: makeResult([{ id: 'approval-1', status: 'PENDING' }]),
    };

    const supabaseClient = {
      auth: {
        getUser: vi.fn(async () => ({ data: { user: { id: 'user-1' } }, error: null })),
      },
      from: vi.fn((table: string) => {
        if (table === 'activity_log') {
          return {
            insert: vi.fn(async () => ({ error: null })),
          };
        }

        const result = tableResults[table] ?? makeResult(null);
        return makeBuilder(result);
      }),
    };

    hoisted.setSupabaseClient(supabaseClient);

    await import('../../supabase/functions/audit-plan/index.ts');

    if (!handler) {
      throw new Error('Edge handler not registered');
    }
  });

  it('returns plan status data for GET requests', async () => {
    const response = await handler(
      new Request('https://edge.test/audit-plan/status?orgSlug=acme&engagementId=eng-1', {
        method: 'GET',
        headers: {
          Authorization: 'Bearer token',
        },
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.plan).toEqual({ id: 'plan-1', status: 'DRAFT' });
    expect(body.materiality).toEqual({ id: 'mat-1' });
    expect(body.changeLog).toEqual([{ id: 'change-1' }]);
    expect(body.approvals).toEqual([{ id: 'approval-1', status: 'PENDING' }]);

    expect(hoisted.createSupabaseClientWithAuthMock).toHaveBeenCalledWith('Bearer token');
  });

  it('rejects requests missing Authorization header', async () => {
    const response = await handler(
      new Request('https://edge.test/audit-plan/status?orgSlug=acme&engagementId=eng-1'),
    );

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toEqual({ error: 'missing_auth_header' });
  });
});
