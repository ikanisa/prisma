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
  const listControlsMock = vi.fn(async () => ({ controls: [], coverage: [] }));
  const listItgcGroupsMock = vi.fn(async () => ({ groups: [] }));

  return {
    envGetMock,
    createSupabaseClientWithAuthMock,
    serveMock,
    listControlsMock,
    listItgcGroupsMock,
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

vi.mock('../../supabase/functions/_shared/controls.ts', () => ({
  listControls: (...args: unknown[]) => hoisted.listControlsMock(...args),
  listItgcGroups: (...args: unknown[]) => hoisted.listItgcGroupsMock(...args),
}));

const globalFetch = vi.fn();
vi.stubGlobal('fetch', globalFetch);

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
    maybeSingle: vi.fn(async () => result),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
  };
  builder.then = (resolve: (value: typeof result) => unknown) => resolve(result);
  builder.catch = () => builder;
  return builder;
}

describe('audit-controls edge function', () => {
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
      controls: makeResult({ id: 'ctrl-1', status: 'ACTIVE' }),
      control_tests: makeResult(null),
      control_walkthroughs: makeResult(null),
      deficiencies: makeResult(null),
      activity_log: makeResult(null),
    };

    const supabaseClient = {
      auth: {
        getUser: vi.fn(async () => ({ data: { user: { id: 'user-1' } }, error: null })),
      },
      from: vi.fn((table: string) => makeBuilder(tableResults[table] ?? makeResult(null))),
    };

    hoisted.setSupabaseClient(supabaseClient);

    await import('../../supabase/functions/audit-controls/index.ts');

    if (!handler) throw new Error('Edge handler not registered');
  });

  it('returns 401 when Authorization header is missing', async () => {
    const response = await handler(
      new Request('https://edge.test/audit-controls/list?orgSlug=acme&engagementId=eng-1', {
        method: 'GET',
      }),
    );

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toEqual({ error: 'missing_authorization' });
  });

  it('lists controls when called by a manager', async () => {
    hoisted.listControlsMock.mockResolvedValueOnce({ controls: [{ id: 'ctrl-1' }], coverage: [] });
    hoisted.listItgcGroupsMock.mockResolvedValueOnce({ groups: [] });

    const response = await handler(
      new Request('https://edge.test/audit-controls/list?orgSlug=acme&engagementId=eng-1', {
        method: 'GET',
        headers: { Authorization: 'Bearer token' },
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ controls: { controls: [{ id: 'ctrl-1' }], coverage: [] }, itgcGroups: { groups: [] }, deficiencies: [] });
    expect(hoisted.createSupabaseClientWithAuthMock).toHaveBeenCalledWith('Bearer token');
  });
});
