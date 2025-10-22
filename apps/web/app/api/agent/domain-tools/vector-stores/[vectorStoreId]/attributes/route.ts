import { NextRequest, NextResponse } from 'next/server';

import { buildForwardHeaders, forwardJsonResponse, resolveAgentServiceUrl } from '../../../../utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { vectorStoreId: string } }) {
  const baseUrl = resolveAgentServiceUrl();
  if (!baseUrl) {
    return NextResponse.json({ error: 'Agent service URL is not configured' }, { status: 500 });
  }

  const vectorStoreId = params?.vectorStoreId;
  if (!vectorStoreId) {
    return NextResponse.json({ error: 'vectorStoreId is required' }, { status: 400 });
  }

  const upstreamUrl = new URL(
    `${baseUrl}/api/agent/domain-tools/vector-stores/${encodeURIComponent(vectorStoreId)}/attributes`,
  );
  const incomingUrl = new URL(request.url);
  upstreamUrl.search = incomingUrl.search;

  try {
    const upstream = await fetch(upstreamUrl.toString(), {
      method: 'GET',
      headers: buildForwardHeaders(request),
    });
    return forwardJsonResponse(upstream);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load vector store attributes';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
