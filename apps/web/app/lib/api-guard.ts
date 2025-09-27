import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { attachRequestId, getOrCreateRequestId } from './observability';
import { enforceRateLimit } from './rate-limit';
import { findIdempotentResponse, storeIdempotentResponse } from './idempotency';

const IDEMPOTENCY_HEADER_CANDIDATES = ['x-idempotency-key', 'idempotency-key'];

export type RateLimitOptions = {
  limit?: number;
  windowSeconds?: number;
  retryAfterSeconds?: number;
};

export type ApiGuardOptions = {
  request: Request;
  supabase: SupabaseClient<any>;
  orgId: string;
  resource: string;
  requestId?: string;
  enableIdempotency?: boolean;
  rateLimit?: RateLimitOptions;
};

export type ApiGuard = {
  requestId: string;
  idempotencyKey: string | null;
  rateLimitResponse?: Response;
  replayResponse?: Response;
  json: (body: unknown, init?: ResponseInit) => Response;
  respond: (body: Record<string, unknown>, init?: ResponseInit) => Promise<Response>;
};

function pickIdempotencyKey(request: Request): string | null {
  for (const header of IDEMPOTENCY_HEADER_CANDIDATES) {
    const value = request.headers.get(header);
    if (value) return value;
  }
  return null;
}

function resolveStatus(init?: ResponseInit): number {
  const maybeNumber = init?.status;
  return typeof maybeNumber === 'number' ? maybeNumber : 200;
}

export async function createApiGuard(options: ApiGuardOptions): Promise<ApiGuard> {
  const requestId = options.requestId ?? getOrCreateRequestId(options.request);
  const idempotencyKey = pickIdempotencyKey(options.request);

  let rateLimitResponse: Response | undefined;
  if (options.rateLimit) {
    const { limit = 60, windowSeconds = 60, retryAfterSeconds } = options.rateLimit;
    const rate = await enforceRateLimit({
      client: options.supabase,
      orgId: options.orgId,
      resource: options.resource,
      limit,
      windowSeconds,
    });
    if (!rate.allowed) {
      rateLimitResponse = NextResponse.json(
        { error: 'rate_limit_exceeded', retryAfterSeconds: retryAfterSeconds ?? windowSeconds },
        attachRequestId({ status: 429 }, requestId),
      );
    }
  }

  let replayResponse: Response | undefined;
  if (!rateLimitResponse && options.enableIdempotency !== false && idempotencyKey) {
    const replay = await findIdempotentResponse({
      client: options.supabase,
      orgId: options.orgId,
      resource: options.resource,
      key: idempotencyKey,
    });
    if (replay) {
      replayResponse = NextResponse.json(
        replay.body,
        attachRequestId({ status: replay.status }, requestId),
      );
    }
  }

  const json = (body: unknown, init?: ResponseInit) => NextResponse.json(body, attachRequestId(init, requestId));

  const respond = async (body: Record<string, unknown>, init?: ResponseInit) => {
    const status = resolveStatus(init);
    const shouldStore =
      options.enableIdempotency !== false &&
      idempotencyKey &&
      status >= 200 &&
      status < 500;
    if (shouldStore) {
      await storeIdempotentResponse({
        client: options.supabase,
        orgId: options.orgId,
        resource: options.resource,
        key: idempotencyKey,
        status,
        response: body,
        requestId,
      });
    }

    return json(body, { ...init, status });
  };

  return {
    requestId,
    idempotencyKey,
    rateLimitResponse,
    replayResponse,
    json,
    respond,
  };
}
