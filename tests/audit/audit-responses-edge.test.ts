import { beforeEach, describe, expect, it, vi } from 'vitest';

let handler: (request: Request) => Promise<Response>;
let insertedResponse: any;
let activityLogs: any[];

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

function createSelectChain(result: { data: unknown; error: any }) {
  const chain: any = {
    eq: vi.fn(() => chain),
    order: vi.fn(async () => result),
  };
  return chain;
}

function createMaybeSingleBuilder(result: { data: unknown; error: any }) {
  const builder: any = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => result),
  };
  return builder;
}

describe('audit-responses edge function', () => {
  beforeEach(async () => {
    handler = undefined as unknown as typeof handler;
    vi.resetModules();
    vi.clearAllMocks();

    (globalThis as any).Deno = {
      env: { get: hoisted.envGetMock },
      serve: hoisted.serveMock,
    };

    const responsesResult = { data: [{ id: 'resp-1', title: 'Planned response' }], error: null };
    const checksResult = { data: [{ id: 'check-1', response_id: 'resp-1' }], error: null };
    insertedResponse = null;
    activityLogs = [];

    const auditResponsesSelectChain = createSelectChain(responsesResult);

    const supabaseClient = {
      auth: {
        getUser: vi.fn(async () => ({ data: { user: { id: 'user-1' } }, error: null })),
      },
      from: vi.fn((table: string) => {
        if (table === 'audit_responses') {
          return {
            select: vi.fn(() => auditResponsesSelectChain),
            insert: vi.fn((payload: any) => {
              insertedResponse = payload;
              return {
                select: () => ({
                  single: vi.fn(async () => ({ data: { id: 'new-response' }, error: null })),
                }),
              };
            }),
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  select: vi.fn(() => ({ single: vi.fn(async () => ({ data: { id: 'resp-1' }, error: null })) })),
                })),
              })),
            })),
          };
        }

        if (table === 'audit_response_checks') {
          return {
            select: vi.fn(() => createSelectChain(checksResult)),
          };
        }

        if (table === 'activity_log') {
          return {
            insert: vi.fn(async (payload: any) => {
              activityLogs.push(payload);
              return { error: null };
            }),
          };
        }

        if (table === 'organizations') {
          return createMaybeSingleBuilder({ data: { id: 'org-1' }, error: null });
        }

        if (table === 'memberships') {
          return createMaybeSingleBuilder({ data: { role: 'MANAGER' }, error: null });
        }

        if (table === 'engagements') {
          return createMaybeSingleBuilder({ data: { id: 'eng-1', org_id: 'org-1' }, error: null });
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    };

    hoisted.setSupabaseClient(supabaseClient);

    await import('../../supabase/functions/audit-responses/index.ts');

    if (!handler) {
      throw new Error('Edge handler not registered');
    }
  });

  it('rejects requests without Authorization header', async () => {
    const response = await handler(new Request('https://edge.test/audit-responses?orgSlug=acme&engagementId=eng-1', { method: 'GET' }));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'missing_auth_header' });
  });

  it('lists responses and checks for GET requests', async () => {
    const response = await handler(
      new Request('https://edge.test/audit-responses?orgSlug=acme&engagementId=eng-1', {
        method: 'GET',
        headers: { Authorization: 'Bearer token' },
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      responses: [{ id: 'resp-1', title: 'Planned response' }],
      checks: [{ id: 'check-1', response_id: 'resp-1' }],
    });
    expect(hoisted.createSupabaseClientWithAuthMock).toHaveBeenCalledWith('Bearer token');
  });

  it('creates a new response via POST', async () => {
    const response = await handler(
      new Request('https://edge.test/audit-responses/response/upsert?orgSlug=acme&engagementId=eng-1', {
        method: 'POST',
        headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
        body: JSON.stringify({ riskId: 'risk-1', title: 'New response' }),
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ id: 'new-response' });
    expect(hoisted.createSupabaseClientWithAuthMock).toHaveBeenCalledWith('Bearer token');
    expect(insertedResponse).toMatchObject({
      org_id: 'org-1',
      engagement_id: 'eng-1',
      risk_id: 'risk-1',
      title: 'New response',
    });
    expect(activityLogs).toHaveLength(1);
  });
});
