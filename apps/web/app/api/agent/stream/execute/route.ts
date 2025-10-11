import { NextRequest, NextResponse } from 'next/server';
import { buildForwardHeaders, resolveAgentServiceUrl } from '../../utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const baseUrl = resolveAgentServiceUrl();
  if (!baseUrl) {
    return NextResponse.json({ error: 'Agent service URL is not configured' }, { status: 500 });
  }

  const targetUrl = `${baseUrl}/api/agent/stream/execute${request.nextUrl.search}`;

  try {
    const upstream = await fetch(targetUrl, {
      method: 'GET',
      headers: buildForwardHeaders(request),
    });

    const headers = new Headers(upstream.headers);
    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to proxy tool stream request';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
