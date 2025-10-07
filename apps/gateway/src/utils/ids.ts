import { randomUUID } from 'crypto';

export function createRequestId(): string {
  try {
    return randomUUID();
  } catch {
    return `req_${Math.random().toString(36).slice(2, 12)}`;
  }
}

export function createTraceId(): string {
  try {
    return randomUUID();
  } catch {
    return `trace_${Math.random().toString(36).slice(2, 12)}`;
  }
}
