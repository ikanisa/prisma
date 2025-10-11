import { randomBytes } from 'crypto';

function toHex(buf: Buffer, expected: number): string {
  const hex = buf.toString('hex');
  return hex.length >= expected ? hex.slice(0, expected) : hex.padEnd(expected, '0');
}

export function generateTraceId(): string {
  return toHex(randomBytes(16), 32);
}

export function generateSpanId(): string {
  return toHex(randomBytes(8), 16);
}

export function isValidTraceparent(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const v = value.trim();
  return /^00-[0-9a-f]{32}-[0-9a-f]{16}-0[01]$/i.test(v);
}

export function buildTraceparent(traceId?: string): string {
  const id = (traceId || generateTraceId()).replace(/-/g, '').slice(0, 32);
  const spanId = generateSpanId();
  return `00-${id}-${spanId}-01`;
}

