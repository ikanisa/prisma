const DEFAULT_GLOBAL_TTL_SECONDS = parsePositiveInt(process.env.CACHE_TTL_DEFAULT_SECONDS, -1)

type CacheTtlEntry = {
  envVar: string
  defaultSeconds: number
}

type CacheTtlKey =
  | 'ragSearch'
  | 'ragIdempotency'
  | 'ragOrgLookup'
  | 'ragDriveUploader'

const TTL_TABLE: Record<CacheTtlKey, CacheTtlEntry> = {
  ragSearch: { envVar: 'CACHE_TTL_RAG_SEARCH_SECONDS', defaultSeconds: 60 },
  ragIdempotency: { envVar: 'CACHE_TTL_RAG_IDEMPOTENCY_SECONDS', defaultSeconds: 300 },
  ragOrgLookup: { envVar: 'CACHE_TTL_RAG_ORG_LOOKUP_SECONDS', defaultSeconds: 300 },
  ragDriveUploader: { envVar: 'CACHE_TTL_RAG_DRIVE_UPLOADER_SECONDS', defaultSeconds: 600 },
}

export function resolveCacheTtl(key: CacheTtlKey, fallbackSeconds?: number): number {
  const entry = TTL_TABLE[key]
  const preferredDefault = fallbackSeconds ?? entry?.defaultSeconds ?? 0
  const globalDefault = DEFAULT_GLOBAL_TTL_SECONDS >= 0 ? DEFAULT_GLOBAL_TTL_SECONDS : preferredDefault
  const envOverride = entry?.envVar ? parsePositiveInt(process.env[entry.envVar], -1) : -1

  if (envOverride >= 0) {
    return envOverride
  }

  return globalDefault
}

function parsePositiveInt(value: string | number | undefined, fallback: number): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= 0 ? Math.floor(value) : fallback
  }

  if (!value) {
    return fallback
  }

  const parsed = Number.parseInt(value, 10)
  if (Number.isNaN(parsed) || parsed < 0) {
    return fallback
  }

  return parsed
}

export type { CacheTtlKey }
