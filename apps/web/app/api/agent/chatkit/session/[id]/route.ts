import { NextRequest, NextResponse } from 'next/server';

import { buildForwardHeaders, forwardJsonResponse, resolveAgentServiceUrl } from '../../../utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, context: { params: { id: string } }) {
  const baseUrl = resolveAgentServiceUrl();
  if (!baseUrl) {
    return NextResponse.json({ error: 'Agent service URL is not configured' }, { status: 500 });
  }

  const chatkitSessionId = context.params.id;
  const targetUrl = `${baseUrl}/api/agent/chatkit/session/${encodeURIComponent(chatkitSessionId)}`;

  try {
    const upstream = await fetch(targetUrl, {
      method: 'GET',
      headers: buildForwardHeaders(request),
    });
    return forwardJsonResponse(upstream);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load ChatKit session';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
