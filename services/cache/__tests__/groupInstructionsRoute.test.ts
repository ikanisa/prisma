import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryCacheAdapter } from '../memoryAdapter';
import type { CacheClient } from '../types';

type RouteModule = typeof import('../../../apps/web/app/api/group/instructions/route');

type SupabaseStub = ReturnType<typeof createSupabaseStub>;

function createSupabaseStub() {
  const fixture = [{ id: 'instruction-1', status: 'sent' }];
  let getCalls = 0;
  const insertResult = { id: 'instruction-2', status: 'sent', component_id: 'component-1' };

  const selectBuilderFactory = () => {
    const builder = {
      eq: vi.fn(() => builder),
      order: vi.fn(() => builder),
      then(onFulfilled: (value: { data: unknown; error: null }) => unknown, onRejected?: (reason: unknown) => unknown) {
        getCalls += 1;
        const result = { data: fixture, error: null } as const;
        return Promise.resolve(result).then(onFulfilled, onRejected);
      },
      catch(onRejected?: (reason: unknown) => unknown) {
        const result = { data: fixture, error: null } as const;
        return Promise.resolve(result).catch(onRejected);
      },
    };
    return builder;
  };

  const client = {
    from: vi.fn(() => ({
      select: vi.fn(() => selectBuilderFactory()),
      insert: vi.fn((payload: Record<string, unknown>) => {
        Object.assign(insertResult, {
          component_id: payload?.component_id ?? null,
          status: payload?.status ?? 'sent',
        });
        return {
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: insertResult, error: null })),
          })),
        };
      }),
    })),
  };

  return {
    client,
    fixture,
    insertResult,
    getCallCount: () => getCalls,
  };
}

describe('group instructions route cache integration', () => {
  let routeModule: RouteModule;
  let supabaseStub: SupabaseStub;
  let setCacheClient: (client: CacheClient | null) => void;

  beforeEach(async () => {
    vi.resetModules();
    process.env.CACHE_TTL_GROUP_INSTRUCTIONS = '5';
    process.env.CACHE_TTL_GROUP_INSTRUCTIONS_INDEX = '5';
    supabaseStub = createSupabaseStub();

    vi.doMock('@/lib/group/request', () => ({
      getOrgIdFromRequest: vi.fn(() => 'org-123'),
      isUuid: vi.fn(() => true),
      resolveUserId: vi.fn(async () => 'user-123'),
      toJsonRecord: vi.fn(() => null),
    }));

    vi.doMock('@/lib/group/activity', () => ({
      logGroupActivity: vi.fn(async () => undefined),
    }));

    vi.doMock('@/lib/supabase/server', () => ({
      getSupabaseServerClient: () => supabaseStub.client,
    }));

    const cacheModule = await import('../index');
    setCacheClient = cacheModule.setCacheClient;
    setCacheClient(new MemoryCacheAdapter({ defaultTtlSeconds: 60 }));

    routeModule = await import('../../../apps/web/app/api/group/instructions/route');
  });

  afterEach(() => {
    setCacheClient?.(null);
    delete process.env.CACHE_TTL_GROUP_INSTRUCTIONS;
    delete process.env.CACHE_TTL_GROUP_INSTRUCTIONS_INDEX;
    vi.resetAllMocks();
  });

  it('returns cached responses for repeated GET calls', async () => {
    const request = new Request('https://example.com/api/group/instructions');
    const first = await routeModule.GET(request as any);
    expect(await first.json()).toEqual({ instructions: supabaseStub.fixture });
    expect(supabaseStub.getCallCount()).toBe(1);

    const second = await routeModule.GET(request as any);
    expect(await second.json()).toEqual({ instructions: supabaseStub.fixture });
    expect(supabaseStub.getCallCount()).toBe(1);
  });

  it('invalidates cached instructions after a POST mutation', async () => {
    const listRequest = new Request('https://example.com/api/group/instructions');
    await routeModule.GET(listRequest as any);
    await routeModule.GET(listRequest as any);
    expect(supabaseStub.getCallCount()).toBe(1);

    const payload = {
      orgId: 'org-123',
      engagementId: 'eng-1',
      componentId: 'component-1',
      title: 'Prepare documentation',
      status: 'sent',
      userId: 'user-123',
    };
    const createRequest = new Request('https://example.com/api/group/instructions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const createResponse = await routeModule.POST(createRequest as any);
    expect(createResponse.status).toBe(200);
    expect(await createResponse.json()).toEqual({ instruction: supabaseStub.insertResult });

    const afterMutation = await routeModule.GET(listRequest as any);
    expect(await afterMutation.json()).toEqual({ instructions: supabaseStub.fixture });
    expect(supabaseStub.getCallCount()).toBe(2);
  });
});
