import type { NextRequest } from 'next/server';
import { env } from '@/src/env.server';

function stripTrailingSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

export function resolveAgentServiceUrl(): string | null {
  const value = env.AGENT_SERVICE_URL ?? env.NEXT_PUBLIC_API_BASE ?? null;
  if (!value) return null;
  return stripTrailingSlash(value.trim());
}

export function buildForwardHeaders(request: NextRequest, init?: { contentType?: boolean }): Headers {
  const headers = new Headers();
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) headers.set('cookie', cookieHeader);
  const authHeader = request.headers.get('authorization');
  if (authHeader) headers.set('authorization', authHeader);
  if (init?.contentType) {
    const contentType = request.headers.get('content-type');
    if (contentType) headers.set('content-type', contentType);
  }
  return headers;
}

export function forwardJsonResponse(upstream: Response): Response {
  const headers = new Headers();
  const contentType = upstream.headers.get('content-type') ?? 'application/json';
  headers.set('content-type', contentType);

  const cacheControl = upstream.headers.get('cache-control') ?? 'private, max-age=5, stale-while-revalidate=30';
  headers.set('cache-control', cacheControl);

  const etag = upstream.headers.get('etag');
  if (etag) {
    headers.set('etag', etag);
  }

  const vary = upstream.headers.get('vary');
  if (vary) {
    headers.set('vary', vary);
  }

  const rateLimitHeaders = [
    'x-ratelimit-limit',
    'x-ratelimit-remaining',
    'x-ratelimit-reset',
    'retry-after',
  ];
  for (const header of rateLimitHeaders) {
    const value = upstream.headers.get(header);
    if (value) {
      headers.set(header, value);
    }
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  });
}
