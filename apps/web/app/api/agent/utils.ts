import type { NextRequest } from 'next/server';

function stripTrailingSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

export function resolveAgentServiceUrl(): string | null {
  const value = process.env.AGENT_SERVICE_URL ?? process.env.NEXT_PUBLIC_API_BASE ?? null;
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
  const contentType = upstream.headers.get('content-type') ?? 'application/json';
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'content-type': contentType,
    },
  });
}
