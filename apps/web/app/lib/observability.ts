import { NextResponse } from 'next/server';
import crypto from 'node:crypto';

const REQUEST_ID_HEADER = 'x-request-id';
const CORRELATION_ID_HEADER = 'x-correlation-id';

export function getOrCreateRequestId(request: Request): string {
  const fromReq =
    request.headers.get(REQUEST_ID_HEADER) || request.headers.get(CORRELATION_ID_HEADER);
  if (fromReq) return fromReq;
  try {
    return crypto.randomUUID();
  } catch {
    return `req_${Math.random().toString(36).slice(2, 10)}`;
  }
}

export function jsonWithRequestId(
  data: unknown,
  init: ResponseInit | undefined,
  requestId: string,
): Response {
  const headers = new Headers(init?.headers);
  headers.set(REQUEST_ID_HEADER, requestId);
  return NextResponse.json(data, { ...init, headers });
}

export function attachRequestId(init: ResponseInit | undefined, requestId: string): ResponseInit {
  const headers = new Headers(init?.headers);
  headers.set(REQUEST_ID_HEADER, requestId);
  return { ...init, headers };
}

