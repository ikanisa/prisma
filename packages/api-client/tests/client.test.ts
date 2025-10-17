import { describe, expect, it, vi } from 'vitest';
import ApiClient from '../index.js';

function createFetchMock() {
  const fn = vi.fn(async (input: RequestInfo, init?: RequestInit) => {
    // Echo back URL and method to validate path construction
    const url = String(input);
    const method = (init?.method || 'GET').toUpperCase();
    return new Response(
      JSON.stringify({ ok: true, url, method, body: init?.body ? JSON.parse(String(init.body)) : undefined }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  });
  return fn;
}

describe('ApiClient basic construction', () => {
  it('builds autonomy status url with query params', async () => {
    const mock = createFetchMock();
    const client = new ApiClient({ baseUrl: 'https://api.example.com', fetch: mock });
    const res = await client.getAutonomyStatus('acme');
    expect((res as any).url).toBe('https://api.example.com/v1/autonomy/status?orgSlug=acme');
    expect((res as any).method).toBe('GET');
  });

  it('posts release controls check payload', async () => {
    const mock = createFetchMock();
    const client = new ApiClient({ baseUrl: 'https://api.example.com', fetch: mock });
    const res = await client.checkReleaseControls({ orgSlug: 'acme', engagementId: 'eng-1' } as any);
    expect((res as any).url).toBe('https://api.example.com/api/release-controls/check');
    expect((res as any).method).toBe('POST');
    expect((res as any).body.orgSlug).toBe('acme');
  });

  it('retries on 503 and then succeeds', async () => {
    let calls = 0;
    const mock = vi.fn(async (input: RequestInfo, _init?: RequestInit) => {
      calls += 1;
      const url = String(input);
      if (calls < 2) {
        return new Response(JSON.stringify({ error: 'unavailable' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ ok: true, url }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    });
    const client = new ApiClient({ baseUrl: 'https://api.example.com', fetch: mock as any, retries: 2, retryDelayMs: 1 });
    const res = await client.getAutonomyStatus('acme');
    expect((res as any).ok).toBe(true);
    expect(calls).toBe(2);
  });
});
