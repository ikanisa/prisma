import { NextRequest, NextResponse } from 'next/server';
import { resolveAgentServiceUrl } from '../../../utils';

const ALLOWED_DECISIONS = new Set(['APPROVED', 'CHANGES_REQUESTED', 'REJECTED', 'CANCELLED']);

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const approvalId = params.id;
  if (!approvalId) {
    return NextResponse.json({ error: 'approvalId is required' }, { status: 400 });
  }

  let payload: {
    decision?: string;
    comment?: string;
    evidence?: unknown;
    orgSlug?: string | null;
  };

  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const decision = typeof payload.decision === 'string' ? payload.decision.toUpperCase() : '';
  if (!ALLOWED_DECISIONS.has(decision)) {
    return NextResponse.json({ error: 'decision must be one of APPROVED, CHANGES_REQUESTED, REJECTED, CANCELLED' }, { status: 400 });
  }

  const baseUrl = resolveAgentServiceUrl();
  if (!baseUrl) {
    return NextResponse.json({ error: 'Agent service URL is not configured' }, { status: 500 });
  }

  const targetUrl = `${baseUrl}/v1/approvals/${encodeURIComponent(approvalId)}/decision`;

  const headers: Record<string, string> = { 'content-type': 'application/json' };
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) headers.cookie = cookieHeader;
  const authorizationHeader = request.headers.get('authorization');
  if (authorizationHeader) headers.authorization = authorizationHeader;

  const body = JSON.stringify({
    decision,
    comment: payload.comment ?? null,
    evidence: payload.evidence ?? undefined,
    orgSlug: payload.orgSlug ?? null,
  });

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body,
      redirect: 'manual',
    });
    const responseBody = await response.text();
    const contentType = response.headers.get('content-type') ?? 'application/json';
    const init: ResponseInit = {
      status: response.status,
      headers: {
        'content-type': contentType,
      },
    };
    return new NextResponse(responseBody, init);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to submit approval decision';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
