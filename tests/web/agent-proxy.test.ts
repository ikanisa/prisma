import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

class MockNextResponse extends Response {
  static json(data: unknown, init?: ResponseInit & { headers?: Record<string, string> }) {
    return new MockNextResponse(JSON.stringify(data), {
      status: init?.status ?? 200,
      headers: {
        'content-type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
  }
}

vi.mock('next/server', () => ({
  NextResponse: MockNextResponse,
}));

const originalFetch = global.fetch;

describe('agent proxy routes', () => {
  beforeEach(() => {
    process.env.AUTH_CLIENT_ID = 'client-id';
    process.env.AUTH_CLIENT_SECRET = 'client-secret';
    process.env.AUTH_ISSUER = 'https://auth.example.com';
    process.env.SUPABASE_URL = 'https://supabase.example.com';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://supabase.example.com';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.AGENT_SERVICE_URL;
    delete process.env.NEXT_PUBLIC_API_BASE;
    delete process.env.AUTH_CLIENT_ID;
    delete process.env.AUTH_CLIENT_SECRET;
    delete process.env.AUTH_ISSUER;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it('proxies SSE stream requests', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response('data: test\n\n', {
          status: 200,
          headers: { 'content-type': 'text/event-stream' },
        }),
      );
    global.fetch = fetchMock as unknown as typeof global.fetch;
    process.env.AGENT_SERVICE_URL = 'https://agent.example.com';

    const { GET } = await import('../../apps/web/app/api/agent/stream/route');

    const request = Object.assign(
      new Request('https://app.prisma-cpa.vercel.app/api/agent/stream?orgSlug=demo&question=Hi'),
      { nextUrl: new URL('https://app.prisma-cpa.vercel.app/api/agent/stream?orgSlug=demo&question=Hi') },
    );

    const response = await GET(request as any);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://agent.example.com/api/agent/stream?orgSlug=demo&question=Hi',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/event-stream');
    expect(await response.text()).toContain('data: test');
  });

  it('returns error when agent service URL missing', async () => {
    const { GET } = await import('../../apps/web/app/api/agent/stream/route');
    const request = Object.assign(new Request('https://app.prisma-cpa.vercel.app/api/agent/stream'), {
      nextUrl: new URL('https://app.prisma-cpa.vercel.app/api/agent/stream'),
    });
    const response = await GET(request as any);
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toMatch(/not configured/i);
  });

  it('proxies orchestrator plan requests', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ plan: { tasks: [] } }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
    global.fetch = fetchMock as unknown as typeof global.fetch;
    process.env.AGENT_SERVICE_URL = 'https://agent.example.com';

    const { POST } = await import('../../apps/web/app/api/agent/orchestrator/plan/route');

    const payload = { orgSlug: 'demo', objective: 'Test objective' };
    const request = Object.assign(
      new Request('https://app.prisma-cpa.vercel.app/api/agent/orchestrator/plan', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
          'content-type': 'application/json',
          cookie: 'session=abc',
          authorization: 'Bearer token',
        },
      }),
      { nextUrl: new URL('https://app.prisma-cpa.vercel.app/api/agent/orchestrator/plan') },
    );

    const response = await POST(request as any);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://agent.example.com/api/agent/orchestrator/plan',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    );
    const forwardedHeaders = (fetchMock.mock.calls[0]?.[1] as RequestInit)?.headers as Headers;
    expect(forwardedHeaders.get('cookie')).toBe('session=abc');
    expect(forwardedHeaders.get('authorization')).toBe('Bearer token');
    expect(await response.json()).toEqual({ plan: { tasks: [] } });
  });

  it('proxies model response creation requests', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ response: { id: 'resp_123' } }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
    global.fetch = fetchMock as unknown as typeof global.fetch;
    process.env.AGENT_SERVICE_URL = 'https://agent.example.com';

    const { POST } = await import('../../apps/web/app/api/agent/respond/route');

    const payload = { orgSlug: 'demo', request: { input: 'Hello world' } };
    const request = Object.assign(
      new Request('https://app.example.com/api/agent/respond', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'content-type': 'application/json' },
      }),
      { nextUrl: new URL('https://app.example.com/api/agent/respond') },
    );

    const response = await POST(request as any);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://agent.example.com/api/agent/respond',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    );
    const forwardedHeaders = (fetchMock.mock.calls[0]?.[1] as RequestInit)?.headers as Headers;
    expect(forwardedHeaders.get('content-type')).toBe('application/json');
    expect(await response.json()).toEqual({ response: { id: 'resp_123' } });
  });

  it('proxies realtime session requests', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ clientSecret: 'secret' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
    global.fetch = fetchMock as unknown as typeof global.fetch;
    process.env.AGENT_SERVICE_URL = 'https://agent.example.com';

    const { POST } = await import('../../apps/web/app/api/agent/realtime/session/route');

    const request = Object.assign(
      new Request('https://app.prisma-cpa.vercel.app/api/agent/realtime/session', {
        method: 'POST',
        body: JSON.stringify({ orgSlug: 'demo' }),
        headers: { 'content-type': 'application/json' },
      }),
      { nextUrl: new URL('https://app.prisma-cpa.vercel.app/api/agent/realtime/session') },
    );

    const response = await POST(request as any);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://agent.example.com/api/agent/realtime/session',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(await response.json()).toEqual({ clientSecret: 'secret' });
  });

  it('proxies orchestrator session creation', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ session: { id: 'session-1' }, tasks: [] }), {
          status: 201,
          headers: { 'content-type': 'application/json' },
        }),
      );
    global.fetch = fetchMock as unknown as typeof global.fetch;
    process.env.AGENT_SERVICE_URL = 'https://agent.example.com';

    const { POST } = await import('../../apps/web/app/api/agent/orchestrator/session/route');

    const payload = { orgSlug: 'demo', objective: 'Automate close', tasks: [{ title: 'Gather data' }] };
    const request = Object.assign(
      new Request('https://app.prisma-cpa.vercel.app/api/agent/orchestrator/session', {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: { 'content-type': 'application/json', cookie: 'session=xyz' },
      }),
      { nextUrl: new URL('https://app.prisma-cpa.vercel.app/api/agent/orchestrator/session') },
    );

    const response = await POST(request as any);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://agent.example.com/api/agent/orchestrator/session',
      expect.objectContaining({ method: 'POST' }),
    );
    const forwardedHeaders = (fetchMock.mock.calls[0]?.[1] as RequestInit)?.headers as Headers;
    expect(forwardedHeaders.get('cookie')).toBe('session=xyz');
    expect(await response.json()).toEqual({ session: { id: 'session-1' }, tasks: [] });
  });

  it('proxies orchestrator session board fetch', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ session: { id: 'session-1' }, tasks: [] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
    global.fetch = fetchMock as unknown as typeof global.fetch;
    process.env.AGENT_SERVICE_URL = 'https://agent.example.com';

    const { GET } = await import('../../apps/web/app/api/agent/orchestrator/session/[id]/route');

    const request = Object.assign(new Request('https://app.prisma-cpa.vercel.app/api/agent/orchestrator/session/session-1'), {
      nextUrl: new URL('https://app.prisma-cpa.vercel.app/api/agent/orchestrator/session/session-1'),
    });

    const response = await GET(request as any, { params: { id: 'session-1' } });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://agent.example.com/api/agent/orchestrator/session/session-1',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(await response.json()).toEqual({ session: { id: 'session-1' }, tasks: [] });
  });

  it('proxies orchestrator task completion', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ task: { id: 'task-1' } }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
    global.fetch = fetchMock as unknown as typeof global.fetch;
    process.env.AGENT_SERVICE_URL = 'https://agent.example.com';

    const { POST } = await import('../../apps/web/app/api/agent/orchestrator/tasks/[id]/complete/route');

    const request = Object.assign(
      new Request('https://app.prisma-cpa.vercel.app/api/agent/orchestrator/tasks/task-1/complete', {
        method: 'POST',
        body: JSON.stringify({ status: 'COMPLETED' }),
        headers: { 'content-type': 'application/json' },
      }),
      { nextUrl: new URL('https://app.prisma-cpa.vercel.app/api/agent/orchestrator/tasks/task-1/complete') },
    );

    const response = await POST(request as any, { params: { id: 'task-1' } });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://agent.example.com/api/agent/orchestrator/tasks/task-1/complete',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(await response.json()).toEqual({ task: { id: 'task-1' } });
  });

  it('proxies orchestrator session list', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ sessions: [{ id: 'session-1' }] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );
    global.fetch = fetchMock as unknown as typeof global.fetch;
    process.env.AGENT_SERVICE_URL = 'https://agent.example.com';

    const { GET } = await import('../../apps/web/app/api/agent/orchestrator/sessions/route');

    const request = Object.assign(
      new Request('https://app.prisma-cpa.vercel.app/api/agent/orchestrator/sessions?orgSlug=demo'),
      { nextUrl: new URL('https://app.prisma-cpa.vercel.app/api/agent/orchestrator/sessions?orgSlug=demo') },
    );

    const response = await GET(request as any);

    expect(fetchMock).toHaveBeenCalledWith(
      'https://agent.example.com/api/agent/orchestrator/sessions?orgSlug=demo',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(await response.json()).toEqual({ sessions: [{ id: 'session-1' }] });
  });
});
