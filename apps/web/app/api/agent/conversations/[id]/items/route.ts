import { NextRequest, NextResponse } from 'next/server';
import { buildForwardHeaders, forwardJsonResponse, resolveAgentServiceUrl } from '../../../utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const baseUrl = resolveAgentServiceUrl();
  if (!baseUrl) {
    return NextResponse.json({ error: 'Agent service URL is not configured' }, { status: 500 });
  }

  const targetUrl = `${baseUrl}/api/agent/conversations/${encodeURIComponent(params.id)}/items${request.nextUrl.search}`;

  try {
    const upstream = await fetch(targetUrl, {
      method: 'GET',
      headers: buildForwardHeaders(request),
    });
    return forwardJsonResponse(upstream);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list conversation items';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const baseUrl = resolveAgentServiceUrl();
  if (!baseUrl) {
    return NextResponse.json({ error: 'Agent service URL is not configured' }, { status: 500 });
  }

  const targetUrl = `${baseUrl}/api/agent/conversations/${encodeURIComponent(params.id)}/items`;
  const body = await request.text();

  try {
    const upstream = await fetch(targetUrl, {
      method: 'POST',
      headers: buildForwardHeaders(request, { contentType: true }),
      body,
    });
    return forwardJsonResponse(upstream);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to append conversation items';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
