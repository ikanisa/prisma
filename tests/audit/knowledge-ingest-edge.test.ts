import { beforeEach, describe, expect, it, vi } from 'vitest';

let handler: (request: Request) => Promise<Response>;
let insertedRun: any;
let insertedEvent: any;

const hoisted = vi.hoisted(() => {
  const envGetMock = vi.fn((key: string) => {
    if (key === 'API_ALLOWED_ORIGINS') return 'https://app.prismaglow.example.com';
    return undefined;
  });
  const getServiceSupabaseClientMock = vi.fn();
  const serveMock = vi.fn((fn: (request: Request) => Promise<Response>) => {
    handler = fn;
  });
  return { envGetMock, getServiceSupabaseClientMock, serveMock };
});

vi.mock('https://deno.land/std@0.224.0/http/server.ts', () => ({
  serve: hoisted.serveMock,
}));

vi.mock('../../supabase/functions/_shared/supabase-client.ts', () => ({
  getServiceSupabaseClient: (...args: unknown[]) => hoisted.getServiceSupabaseClientMock(...args),
}));

function createSingleBuilder(result: { data: unknown; error: any }) {
  const builder: any = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => result),
  };
  return builder;
}

describe('knowledge-ingest edge function', () => {
  beforeEach(async () => {
    handler = undefined as unknown as typeof handler;
    vi.resetModules();
    vi.clearAllMocks();
    insertedRun = null;
    insertedEvent = null;

    (globalThis as any).Deno = {
      env: { get: hoisted.envGetMock },
      serve: hoisted.serveMock,
    };

    const supabaseClient = {
      from: vi.fn((table: string) => {
        if (table === 'knowledge_corpora') {
          return createSingleBuilder({ data: { org_id: 'org-1' }, error: null });
        }
        if (table === 'knowledge_sources') {
          return createSingleBuilder({ data: { id: 'source-1', corpus_id: 'corpus-1' }, error: null });
        }
        if (table === 'learning_runs') {
          return {
            insert: vi.fn((payload: unknown) => {
              insertedRun = payload;
              return {
                select: () => ({
                  single: vi.fn(async () => ({ data: { id: 'run-1', status: 'queued' }, error: null })),
                }),
              };
            }),
          };
        }
        if (table === 'knowledge_events') {
          return {
            insert: vi.fn(async (payload: unknown) => {
              insertedEvent = payload;
              return { error: null };
            }),
          };
        }
        throw new Error(`Unexpected table: ${table}`);
      }),
    };

    hoisted.getServiceSupabaseClientMock.mockResolvedValue(supabaseClient);

    await import('../../supabase/functions/knowledge-ingest/index.ts');

    if (!handler) {
      throw new Error('knowledge-ingest handler not registered');
    }
  });

  it('returns 202 when scheduling a learning run succeeds', async () => {
    const response = await handler(
      new Request('https://edge.test/knowledge-ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgId: 'org-1',
          agentKind: 'AUDIT',
          mode: 'INITIAL',
          corpusId: 'corpus-1',
          sourceId: 'source-1',
          initiatedBy: 'system',
        }),
      }),
    );

    expect(response.status).toBe(202);
    const body = await response.json();
    expect(body.run).toMatchObject({ id: 'run-1', status: 'queued' });
    expect(insertedRun).toMatchObject({ org_id: 'org-1', agent_kind: 'AUDIT', mode: 'INITIAL' });
    expect(insertedEvent).toMatchObject({
      org_id: 'org-1',
      run_id: 'run-1',
      type: 'INGEST',
    });
    expect(hoisted.getServiceSupabaseClientMock).toHaveBeenCalledTimes(1);
  });

  it('validates required fields', async () => {
    const response = await handler(
      new Request('https://edge.test/knowledge-ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'missing_fields' });
  });
});
