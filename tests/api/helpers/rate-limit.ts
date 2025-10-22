import { vi } from 'vitest';

type RateLimitState = {
  allowed: boolean;
  requestCount: number;
};

type PartialState = Partial<RateLimitState> & { allowed?: boolean };

function resolveUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  if (typeof Request !== 'undefined' && input instanceof Request) {
    return input.url;
  }
  if (input && typeof input === 'object' && 'url' in input && typeof (input as any).url === 'string') {
    return (input as { url: string }).url;
  }
  return '';
}

export function installRateLimitFetchMock(initial?: PartialState) {
  const originalFetch = global.fetch;
  const state: RateLimitState = {
    allowed: initial?.allowed ?? true,
    requestCount: initial?.requestCount ?? 1,
  };

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = resolveUrl(input);
    if (url.includes('/rest/v1/rpc/enforce_rate_limit')) {
      return new Response(
        JSON.stringify({
          data: [
            {
              allowed: state.allowed,
              request_count: state.requestCount,
            },
          ],
          error: null,
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      );
    }

    if (typeof originalFetch === 'function') {
      return originalFetch(input as any, init);
    }

    throw new Error(`Unhandled fetch request for ${url}`);
  });

  global.fetch = fetchMock as unknown as typeof global.fetch;

  return {
    fetchMock,
    setRateLimit(result: PartialState) {
      if (typeof result.allowed === 'boolean') {
        state.allowed = result.allowed;
      }
      if (typeof result.requestCount === 'number') {
        state.requestCount = result.requestCount;
      }
    },
    restore() {
      if (typeof originalFetch === 'function') {
        global.fetch = originalFetch;
      } else {
        delete (global as any).fetch;
      }
    },
  };
}

export type RateLimitFetchMock = ReturnType<typeof installRateLimitFetchMock>;
