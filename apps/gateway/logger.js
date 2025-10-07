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
  const payload = {
    level: 'info',
    event,
    ...scrubMeta(meta),
    timestamp: new Date().toISOString(),
  };
  console.log(JSON.stringify(payload));
}

export function logWarn(event, meta = {}) {
  const payload = {
    level: 'warn',
    event,
    ...scrubMeta(meta),
    timestamp: new Date().toISOString(),
  };
  console.warn(JSON.stringify(payload));
}

export function logError(event, error, meta = {}) {
  const payload = {
    level: 'error',
    event,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    ...scrubMeta(meta),
    timestamp: new Date().toISOString(),
  };
  console.error(JSON.stringify(payload));
}
