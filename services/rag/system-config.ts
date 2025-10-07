import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const CONFIG_PATH = path.resolve(fileURLToPath(new URL('../../config/system.yaml', import.meta.url)));
const DEFAULT_GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
];
const DEFAULT_FOLDER_MAPPING = 'org-{orgId}/entity-{entityId}/{repoFolder}';
const DEFAULT_URL_ALLOWED_DOMAINS = ['*'];
const DEFAULT_URL_POLICY = {
  obeyRobots: true,
  maxDepth: 1,
  cacheTtlMinutes: 1440,
};
const DEFAULT_BEFORE_ASKING_SEQUENCE = ['documents', 'google_drive', 'url_sources'] as const;

interface RawSystemConfig {
  data_sources?: Record<string, any>;
  knowledge?: Record<string, any>;
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

let cachedConfig: { config: RawSystemConfig; loadedAt: number } | null = null;
const CACHE_WINDOW_MS = 60_000;

async function loadSystemConfig(): Promise<RawSystemConfig> {
  const now = Date.now();
  if (cachedConfig && now - cachedConfig.loadedAt < CACHE_WINDOW_MS) {
    return cachedConfig.config;
  }

  try {
    const file = await fs.readFile(CONFIG_PATH, 'utf8');
    const parsed = parse(file) as RawSystemConfig | undefined;
    const config = parsed && typeof parsed === 'object' ? parsed : {};
    cachedConfig = { config, loadedAt: now };
    return config;
  } catch (error) {
    cachedConfig = { config: {}, loadedAt: now };
    return {};
  }
}

function normaliseStringList(values: unknown): string[] {
  const result: string[] = [];
  if (Array.isArray(values)) {
    for (const entry of values) {
      if (typeof entry !== 'string') continue;
      const trimmed = entry.trim();
      if (!trimmed) continue;
      if (!result.includes(trimmed)) {
        result.push(trimmed);
      }
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

export async function getGoogleDriveSettings(): Promise<GoogleDriveSettings> {
  const config = await loadSystemConfig();
  const sources = config.data_sources ?? {};
  const drive = (sources.google_drive ?? {}) as Record<string, unknown>;

  const enabled = coerceBoolean(drive.enabled) ?? false;
  const oauthScopes = (() => {
    const scopes = normaliseStringList(drive.oauth_required_scopes);
    return scopes.length ? scopes : [...DEFAULT_GOOGLE_SCOPES];
  })();

  const folderMapping = typeof drive.folder_mapping_pattern === 'string' && drive.folder_mapping_pattern.trim()
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
  const sources = config.data_sources ?? {};
  const urlSources = (sources.url_sources ?? {}) as Record<string, unknown>;

  const allowedDomains = (() => {
    const domains = normaliseStringList(urlSources.allowed_domains);
    return domains.length ? domains : [...DEFAULT_URL_ALLOWED_DOMAINS];
  })();

  const policySection = (urlSources.fetch_policy ?? {}) as Record<string, unknown>;
  const obey = coerceBoolean(policySection.obey_robots);
  const depth = coerceNumber(policySection.max_depth);
  const ttl = coerceNumber(policySection.cache_ttl_minutes);

  return {
    allowedDomains,
    fetchPolicy: {
      obeyRobots: obey ?? DEFAULT_URL_POLICY.obeyRobots,
      maxDepth: typeof depth === 'number' && depth >= 0 ? Math.floor(depth) : DEFAULT_URL_POLICY.maxDepth,
      cacheTtlMinutes: typeof ttl === 'number' && ttl >= 0 ? Math.floor(ttl) : DEFAULT_URL_POLICY.cacheTtlMinutes,
    },
  };
}

export async function getBeforeAskingSequence(): Promise<string[]> {
  const config = await loadSystemConfig();
  const knowledge = (config.knowledge ?? {}) as Record<string, unknown>;
  const retrieval = (knowledge.retrieval ?? {}) as Record<string, unknown>;
  const policy = (retrieval.policy ?? {}) as Record<string, unknown>;

  const entries = normaliseStringList(policy.before_asking_user);
  return entries.length ? entries : [...DEFAULT_BEFORE_ASKING_SEQUENCE];
}

export function __clearSystemConfigCache() {
  cachedConfig = null;
}

