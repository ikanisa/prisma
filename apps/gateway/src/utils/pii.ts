const SENSITIVE_KEY_PATTERN = /(email|phone|ssn|tax|passport|national|dob|birth|address|pii)/i;
const EMAIL_PATTERN = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const PHONE_PATTERN = /\+?\d[\d\s().-]{7,}/;
const SSN_PATTERN = /\b\d{3}-\d{2}-\d{4}\b/;

function redactScalar(value: unknown): unknown {
  if (typeof value === 'string') {
    if (EMAIL_PATTERN.test(value) || PHONE_PATTERN.test(value) || SSN_PATTERN.test(value)) {
      return '[REDACTED]';
    }
  }
  return value;
}

export function scrubPii<T>(payload: T): T {
  if (payload === null || typeof payload !== 'object') {
    return redactScalar(payload) as T;
  }

  if (Array.isArray(payload)) {
    return payload.map(scrubPii) as unknown as T;
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
    if (value && typeof value === 'object') {
      result[key] = scrubPii(value);
      continue;
    }
    if (SENSITIVE_KEY_PATTERN.test(key)) {
      result[key] = '[REDACTED]';
      continue;
    }
    result[key] = redactScalar(value);
  }
  return result as T;
}
