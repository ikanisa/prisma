import { logger } from '@prisma-glow/logging';

const SENSITIVE_KEYS = new Set(['authorization', 'api-key', 'api_key', 'token', 'password', 'secret']);

function scrubValue(value) {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }
    if (trimmed.length > 200) {
      return `${trimmed.slice(0, 197)}...`;
    }
    return trimmed;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (value instanceof Error) {
    return { message: value.message, stack: value.stack };
  }
  if (Array.isArray(value)) {
    return value.slice(0, 5).map((entry) => scrubValue(entry)).filter((entry) => entry !== undefined);
  }
  if (typeof value === 'object') {
    const output = {};
    for (const [key, entry] of Object.entries(value)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        continue;
      }
      const scrubbed = scrubValue(entry);
      if (scrubbed !== undefined) {
        output[key] = scrubbed;
      }
    }
    return output;
  }
  return undefined;
}

function scrubMeta(meta = {}) {
  const clean = {};
  for (const [key, value] of Object.entries(meta)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      continue;
    }
    const scrubbed = scrubValue(value);
    if (scrubbed !== undefined) {
      clean[key] = scrubbed;
    }
  }
  return clean;
}

export function logInfo(event, meta = {}) {
  logger.info(event, scrubMeta(meta));
}

export function logWarn(event, meta = {}) {
  logger.warn(event, scrubMeta(meta));
}

export function logError(event, error, meta = {}) {
  const scrubbedMeta = scrubMeta(meta);
  const errorDetails = scrubValue(error);
  const payload = errorDetails ? { ...scrubbedMeta, error: errorDetails } : scrubbedMeta;
  logger.error(event, payload);
}
