const TTL_ENV_PREFIX = 'CACHE_TTL_';
const DEFAULT_TTL_SECONDS = (() => {
  const value = process.env.CACHE_DEFAULT_TTL_SECONDS;
  const parsed = value ? Number.parseInt(value, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 60;
})();

function normaliseKey(name: string): string {
  return name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_');
}

export function getDefaultTtlSeconds(): number {
  return DEFAULT_TTL_SECONDS;
}

export function getCacheTtlSeconds(name: string, fallback?: number): number {
  const normalised = normaliseKey(name);
  const envKey = `${TTL_ENV_PREFIX}${normalised}`;
  const raw = process.env[envKey];
  if (raw) {
    const parsed = Number.parseInt(raw, 10);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
  }
  if (typeof fallback === 'number') {
    return fallback;
  }
  return DEFAULT_TTL_SECONDS;
}

export function isCachingEnabled(): boolean {
  const value = process.env.CACHE_DISABLED;
  if (!value) {
    return true;
  }
  return !['1', 'true', 'yes'].includes(value.toLowerCase());
}
