import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const ENV_CONFIG_PATH = 'SYSTEM_CONFIG_PATH';
const DEFAULT_CONFIG_PATH = path.resolve(process.cwd(), 'config/system.yaml');

let moduleDefaultPath = DEFAULT_CONFIG_PATH;
try {
  moduleDefaultPath = path.resolve(fileURLToPath(new URL('../../config/system.yaml', import.meta.url)));
} catch {
  moduleDefaultPath = DEFAULT_CONFIG_PATH;
}

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
export const DEFAULT_BEFORE_ASKING_SEQUENCE = Object.freeze(['documents', 'google_drive', 'url_sources']);
export const DEFAULT_ROLE_HIERARCHY = Object.freeze(['STAFF', 'MANAGER', 'PARTNER', 'SYSTEM_ADMIN']);

let cachedConfig = null;
const CACHE_WINDOW_MS = 60_000;

async function resolveConfigPath() {
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

function normaliseStringList(values) {
  const result = [];
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

function coerceBoolean(value) {
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

function coerceNumber(value) {
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

export async function loadSystemConfig() {
  const now = Date.now();
  const configPath = await resolveConfigPath();
  if (cachedConfig && cachedConfig.path === configPath && now - cachedConfig.loadedAt < CACHE_WINDOW_MS) {
    return cachedConfig.config;
  }

  try {
    const file = await fs.readFile(configPath, 'utf8');
    const parsed = parse(file);
    const config = parsed && typeof parsed === 'object' ? parsed : {};
    cachedConfig = { config, loadedAt: now, path: configPath };
    return config;
  } catch {
    cachedConfig = { config: {}, loadedAt: now, path: configPath };
    return {};
  }
}

export async function getGoogleDriveSettings() {
  const config = await loadSystemConfig();
  const sources = config.data_sources ?? {};
  const drive = (sources.google_drive ?? {});

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

export async function getUrlSourceSettings() {
  const config = await loadSystemConfig();
  const sources = config.data_sources ?? {};
  const urlSources = (sources.url_sources ?? {});

  const allowedDomains = (() => {
    const domains = normaliseStringList(urlSources.allowed_domains);
    return domains.length ? domains : [...DEFAULT_URL_ALLOWED_DOMAINS];
  })();

  const policySection = (urlSources.fetch_policy ?? {});
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

export async function getBeforeAskingSequence() {
  const config = await loadSystemConfig();
  const knowledge = (config.knowledge ?? {});
  const retrieval = (knowledge.retrieval ?? {});
  const policy = (retrieval.policy ?? {});

  const entries = normaliseStringList(policy.before_asking_user);
  return entries.length ? entries : [...DEFAULT_BEFORE_ASKING_SEQUENCE];
}

export function clearSystemConfigCache() {
  cachedConfig = null;
}

export async function getResolvedConfigPath() {
  return resolveConfigPath();
}

export async function getRoleHierarchy() {
  const config = await loadSystemConfig();
  const rbac = config.rbac ?? {};
  const roles = normaliseStringList(rbac.roles);
  if (roles.length === 0) {
    return [...DEFAULT_ROLE_HIERARCHY];
  }
  return roles.map((role) => role.toUpperCase());
}
