import 'server-only';

import { NextRequest, NextResponse } from 'next/server';
import { handleWebhook } from '@/lib/webhook';
import { evaluateCompliance, loadComplianceConfig } from '@/lib/compliance/evaluator';
import { getServiceSupabaseClient } from '@/lib/supabase-server';
import { attachRequestId, getOrCreateRequestId } from '@/app/lib/observability';
import { createApiGuard } from '@/app/lib/api-guard';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const webhookSecret =
  process.env.AUTOMATION_WEBHOOK_SECRET ?? process.env.N8N_WEBHOOK_SECRET ?? '';

async function processPayload(rawPayload: string, requestId: string): Promise<Response> {
  let payload: unknown;
  try {
    payload = JSON.parse(rawPayload);
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      attachRequestId({ status: 400 }, requestId)
    );
  }

  if (!isRecord(payload)) {
    return NextResponse.json(
      { error: 'Request body must be an object' },
      attachRequestId({ status: 400 }, requestId)
    );
  }

  const { packKey, values } = payload as Record<string, unknown>;

  if (typeof packKey !== 'string' || !packKey.trim()) {
    return NextResponse.json(
      { error: 'packKey is required' },
      attachRequestId({ status: 400 }, requestId)
    );
  }

  if (!isRecord(values)) {
    return NextResponse.json(
      { error: 'values must be an object' },
      attachRequestId({ status: 400 }, requestId)
    );
  }

  try {
    const config = await loadComplianceConfig(packKey.trim());
    const result = evaluateCompliance(config, values);

    return NextResponse.json(
      {
        outputs: result.outputs,
        errors: result.errors,
        provenance: result.provenance,
      },
      attachRequestId({ status: 200 }, requestId)
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return NextResponse.json(
        { error: 'Pack not found' },
        attachRequestId({ status: 404 }, requestId)
      );
    }
    return NextResponse.json(
      { error: (error as Error).message },
      attachRequestId({ status: 400 }, requestId)
    );
  }
}

export async function POST(request: NextRequest) {
  if (!webhookSecret) {
    console.error('automation.webhook_secret_missing');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  const requestId = getOrCreateRequestId(request);
  const payloadText = await request.text();
  const orgId = request.headers.get('x-org-id') ?? 'automation';

  const guard = await createApiGuard({
    request,
    supabase: await getServiceSupabaseClient(),
    requestId,
    orgId,
    resource: `compliance:webhook:${orgId}`,
    rateLimit: { limit: 120, windowSeconds: 60 },
    enableIdempotency: false,
  });
  if (guard.rateLimitResponse) return guard.rateLimitResponse;

  const response = await handleWebhook(
    new Request(request.url, {
      method: request.method,
      headers: request.headers,
      body: payloadText,
    }),
    webhookSecret,
    (payload) => processPayload(payload, requestId)
  );

  const headers = new Headers(response.headers);
  headers.set('x-request-id', requestId);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
