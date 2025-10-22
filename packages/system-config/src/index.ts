import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const ENV_CONFIG_PATH = 'SYSTEM_CONFIG_PATH';
const DEFAULT_CONFIG_PATH = path.resolve(process.cwd(), 'config/system.yaml');

const moduleDefaultPath = (() => {
  try {
    return path.resolve(fileURLToPath(new URL('../../config/system.yaml', import.meta.url)));
  } catch {
    return DEFAULT_CONFIG_PATH;
  }
})();

const DEFAULT_GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
] as const;
const DEFAULT_FOLDER_MAPPING = 'org-{orgId}/entity-{entityId}/{repoFolder}' as const;
const DEFAULT_URL_ALLOWED_DOMAINS = ['*'] as const;
const DEFAULT_URL_POLICY = {
  obeyRobots: true,
  maxDepth: 1,
  cacheTtlMinutes: 1440,
} as const;

export const DEFAULT_BEFORE_ASKING_SEQUENCE: ReadonlyArray<string> = Object.freeze([
  'documents',
  'google_drive',
  'url_sources',
]);

export const DEFAULT_ROLE_HIERARCHY: ReadonlyArray<string> = Object.freeze([
  'SERVICE_ACCOUNT',
  'READONLY',
  'CLIENT',
  'EMPLOYEE',
  'MANAGER',
  'EQR',
  'PARTNER',
  'SYSTEM_ADMIN',
]);

export interface RawSystemConfig {
  data_sources?: Record<string, unknown>;
  datasources?: Record<string, unknown>;
  knowledge?: {
    retrieval?: {
      policy?: Record<string, unknown>;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  rag?: {
    before_asking_user?: unknown;
    policy?: Record<string, unknown>;
    [key: string]: unknown;
  };
  rbac?: {
    roles?: unknown;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface GoogleDriveSettings {
  enabled: boolean;
  oauthScopes: string[];
  folderMappingPattern: string;
  mirrorToStorage: boolean;
}

export interface UrlSourceSettings {
  allowedDomains: string[];
  fetchPolicy: {
    obeyRobots: boolean;
    maxDepth: number;
    cacheTtlMinutes: number;
  };
}

type CacheEntry<T> = {
  value: T;
  loadedAt: number;
  path: string;
};

class ExpiringAsyncCache<T> {
  private entry: CacheEntry<T> | null = null;

  constructor(private readonly ttlMs: number, private readonly loader: () => Promise<CacheEntry<T>>) {}

  async get(forceReload = false): Promise<CacheEntry<T>> {
    const now = Date.now();
    if (!forceReload && this.entry && now - this.entry.loadedAt < this.ttlMs) {
      return this.entry;
    }

    const entry = await this.loader();
    this.entry = { ...entry, loadedAt: now };
    return this.entry;
  }

  invalidate(): void {
    this.entry = null;
  }

  snapshot(): CacheEntry<T> | null {
    return this.entry;
  }
}

const CACHE_WINDOW_MS = 60_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function getDataSourceSections(config: RawSystemConfig) {
  const legacy = isRecord(config?.data_sources) ? config.data_sources : undefined;
  const modern = isRecord(config?.datasources) ? config.datasources : undefined;
  return { legacy, modern };
}

async function resolveConfigPath(): Promise<string> {
  const override = process.env[ENV_CONFIG_PATH];
  if (override && override.trim()) {
    const candidate = path.resolve(override.trim());
    try {
      const stats = await fs.stat(candidate);
      if (stats.isDirectory()) {
        return path.join(candidate, 'system.yaml');
      }
    } catch {
      if (!path.extname(candidate)) {
        return path.join(candidate, 'system.yaml');
      }
      return candidate;
    }
    return candidate;
  }
  return moduleDefaultPath;
}

function normaliseStringList(values: unknown): string[] {
  const result: string[] = [];
  if (Array.isArray(values)) {
    for (const entry of values) {
      if (typeof entry !== 'string') continue;
      const trimmed = entry.trim();
      if (!trimmed || result.includes(trimmed)) continue;
      result.push(trimmed);
    }
    return result;
  }
  if (typeof values === 'string') {
    return normaliseStringList(values.split(','));
  }
  return result;
}

function coerceBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lowered = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'y', 'on'].includes(lowered)) return true;
    if (['false', '0', 'no', 'n', 'off'].includes(lowered)) return false;
  }
  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  return undefined;
}

function coerceNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

async function loadConfigFromDisk(): Promise<CacheEntry<RawSystemConfig>> {
  const configPath = await resolveConfigPath();
  try {
    const file = await fs.readFile(configPath, 'utf8');
    const parsed = parse(file);
    const config = parsed && isRecord(parsed) ? (parsed as RawSystemConfig) : {};
    return { value: config, path: configPath, loadedAt: Date.now() };
  } catch {
    return { value: {}, path: configPath, loadedAt: Date.now() };
  }
}

const configCache = new ExpiringAsyncCache<RawSystemConfig>(CACHE_WINDOW_MS, loadConfigFromDisk);

export async function loadSystemConfig(options?: { forceReload?: boolean }): Promise<RawSystemConfig> {
  const { value } = await configCache.get(options?.forceReload === true);
  return value;
}

export async function refreshSystemConfig(): Promise<RawSystemConfig> {
  configCache.invalidate();
  return loadSystemConfig({ forceReload: true });
}

export function clearSystemConfigCache(): void {
  configCache.invalidate();
}

export function invalidateSystemConfigCache(): void {
  clearSystemConfigCache();
}

export async function getResolvedConfigPath(): Promise<string> {
  const snapshot = configCache.snapshot();
  if (snapshot) {
    return snapshot.path;
  }
  const { path: resolvedPath } = await configCache.get(true);
  return resolvedPath;
}

export async function getGoogleDriveSettings(): Promise<GoogleDriveSettings> {
  const config = await loadSystemConfig();
  const { legacy, modern } = getDataSourceSections(config);
  const drive = {
    ...(isRecord(legacy?.google_drive) ? (legacy!.google_drive as Record<string, unknown>) : {}),
    ...(isRecord(modern?.google_drive) ? (modern!.google_drive as Record<string, unknown>) : {}),
  };

  const enabled = coerceBoolean(drive.enabled) ?? false;
  const oauthScopes = (() => {
    const scopes = normaliseStringList(drive.oauth_required_scopes);
    return scopes.length ? scopes : [...DEFAULT_GOOGLE_SCOPES];
  })();

  const folderMapping =
    typeof drive.folder_mapping_pattern === 'string' && drive.folder_mapping_pattern.trim()
      ? drive.folder_mapping_pattern.trim()
      : DEFAULT_FOLDER_MAPPING;

  const mirror = coerceBoolean(drive.mirror_to_storage);

  return {
    enabled,
    oauthScopes,
    folderMappingPattern: folderMapping,
    mirrorToStorage: mirror ?? true,
  };
}

export async function getUrlSourceSettings(): Promise<UrlSourceSettings> {
  const config = await loadSystemConfig();
  const { legacy, modern } = getDataSourceSections(config);
  const legacyUrl = isRecord(legacy?.url_sources) ? (legacy!.url_sources as Record<string, unknown>) : {};
  const modernUrl = isRecord(modern?.url_sources) ? (modern!.url_sources as Record<string, unknown>) : {};
  const urlSources = { ...legacyUrl, ...modernUrl };

  const allowedDomains = (() => {
    const direct = normaliseStringList(urlSources.allowed_domains);
    if (direct.length) return direct;
    const whitelist = normaliseStringList(urlSources.whitelist);
    return whitelist.length ? whitelist : [...DEFAULT_URL_ALLOWED_DOMAINS];
  })();

  const policySection = (() => {
    if (isRecord(urlSources.fetch_policy)) return urlSources.fetch_policy as Record<string, unknown>;
    if (isRecord(urlSources.policy)) return urlSources.policy as Record<string, unknown>;
    return {} as Record<string, unknown>;
  })();

  const obey = coerceBoolean(policySection.obey_robots);
  const depth = coerceNumber(policySection.max_depth);
  const ttl = coerceNumber(policySection.cache_ttl_minutes);

  return {
    allowedDomains,
    fetchPolicy: {
      obeyRobots: obey ?? DEFAULT_URL_POLICY.obeyRobots,
      maxDepth: typeof depth === 'number' && depth >= 0 ? Math.floor(depth) : DEFAULT_URL_POLICY.maxDepth,
      cacheTtlMinutes:
        typeof ttl === 'number' && ttl >= 0 ? Math.floor(ttl) : DEFAULT_URL_POLICY.cacheTtlMinutes,
    },
  };
}

export async function getBeforeAskingSequence(): Promise<string[]> {
  const config = await loadSystemConfig();
  const knowledge = (config.knowledge ?? {}) as Record<string, unknown>;
  const retrieval = (knowledge.retrieval ?? {}) as Record<string, unknown>;
  const policy = (retrieval.policy ?? {}) as Record<string, unknown>;

  let entries = normaliseStringList(policy.before_asking_user);
  if (!entries.length) {
    const rag = (config.rag ?? {}) as Record<string, unknown>;
    if (isRecord(rag)) {
      entries = normaliseStringList(rag.before_asking_user ?? (rag.policy as Record<string, unknown> | undefined)?.before_asking_user);
    }
  }
  return entries.length ? entries : [...DEFAULT_BEFORE_ASKING_SEQUENCE];
}

export async function getRoleHierarchy(): Promise<string[]> {
  const config = await loadSystemConfig();
  const rbac = (config.rbac ?? {}) as Record<string, unknown>;
  const roles = normaliseStringList(rbac.roles);
  if (roles.length === 0) {
    return [...DEFAULT_ROLE_HIERARCHY];
  }

  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const role of roles) {
    const upper = role.toUpperCase();
    if (!upper || seen.has(upper)) continue;
    seen.add(upper);
    ordered.push(upper);
  }

  for (const fallback of DEFAULT_ROLE_HIERARCHY) {
    const upper = fallback.toUpperCase();
    if (seen.has(upper)) continue;
    seen.add(upper);
    ordered.push(upper);
  }

  return ordered;
}
