import { NextRequest, NextResponse } from 'next/server';
import { buildForwardHeaders, forwardJsonResponse, resolveAgentServiceUrl } from '../../utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const baseUrl = resolveAgentServiceUrl();
  if (!baseUrl) {
    return NextResponse.json({ error: 'Agent service URL is not configured' }, { status: 500 });
  }

  const targetUrl = `${baseUrl}/api/agent/orchestrator/session`;

  try {
    const body = await request.text();
    const upstream = await fetch(targetUrl, {
      method: 'POST',
      headers: buildForwardHeaders(request, { contentType: true }),
      body,
    });
    return forwardJsonResponse(upstream);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to proxy orchestrator session request';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

