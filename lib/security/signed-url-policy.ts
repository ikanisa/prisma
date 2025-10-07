const MIN_SIGNED_URL_TTL_SECONDS = 60;
const DEFAULT_TTL_SECONDS = 300; // 5 minutes baseline for evidence/doc URLs

const RESOURCE_ENV_MAP: Record<string, string[]> = {
  evidence: ['SIGNED_URL_EVIDENCE_TTL_SECONDS'],
  document: ['SIGNED_URL_DOCUMENT_TTL_SECONDS'],
  onboarding: ['SIGNED_URL_ONBOARDING_TTL_SECONDS'],
  default: [],
};

function parseTtl(value: string | undefined | null): number | null {
  if (!value) return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.max(MIN_SIGNED_URL_TTL_SECONDS, Math.floor(numeric));
}

export function getSignedUrlTTL(resource: 'evidence' | 'document' | 'onboarding' | 'default' = 'default'): number {
  const envCandidates = [
    ...RESOURCE_ENV_MAP[resource] ?? [],
    'SIGNED_URL_DEFAULT_TTL_SECONDS',
    'DOCUMENT_SIGN_TTL',
  ];

  for (const envName of envCandidates) {
    const ttl = parseTtl(process.env[envName]);
    if (ttl) return ttl;
  }

  return DEFAULT_TTL_SECONDS;
}

const SENSITIVE_KEY_PATTERN = /(email|phone|ssn|tax|pii|passport|national|dob|birth|address)/i;
const EMAIL_PATTERN = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const PHONE_PATTERN = /\+?\d[\d\s().-]{7,}/;
const SSN_PATTERN = /\b\d{3}-\d{2}-\d{4}\b/;

function redactValue(value: unknown): unknown {
  if (typeof value === 'string') {
    if (EMAIL_PATTERN.test(value) || PHONE_PATTERN.test(value) || SSN_PATTERN.test(value)) {
      return '[REDACTED]';
    }
  }
  return value;
}

export function sanitizeMetadata<T>(metadata: T): T {
  if (!metadata || typeof metadata !== 'object') {
    return metadata;
  }

  if (Array.isArray(metadata)) {
    return metadata.map((item) => sanitizeMetadata(item)) as unknown as T;
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata as Record<string, unknown>)) {
    if (value && typeof value === 'object') {
      result[key] = sanitizeMetadata(value);
      continue;
    }

    if (SENSITIVE_KEY_PATTERN.test(key)) {
      result[key] = '[REDACTED]';
      continue;
    }

    result[key] = redactValue(value);
  }

  return result as T;
}
