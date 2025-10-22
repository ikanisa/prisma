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
export const DEFAULT_ROLE_HIERARCHY = Object.freeze([
  'SERVICE_ACCOUNT',
  'READONLY',
  'CLIENT',
  'EMPLOYEE',
  'MANAGER',
  'EQR',
  'PARTNER',
  'SYSTEM_ADMIN',
]);

let cachedConfig = null;
const CACHE_WINDOW_MS = 60_000;

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function getDataSourceSections(config) {
  const legacy = isRecord(config?.data_sources) ? config.data_sources : undefined;
  const modern = isRecord(config?.datasources) ? config.datasources : undefined;
  return { legacy, modern };
}

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

function parseHeadersEnv(raw) {
  const headers = {};
  if (typeof raw !== 'string') return headers;
  const parts = raw.split(',');
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex <= 0) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (!key || !value) continue;
    headers[key] = value;
  }
  return headers;
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
  const { legacy, modern } = getDataSourceSections(config);
  const drive = {
    ...(isRecord(legacy?.google_drive) ? legacy.google_drive : {}),
    ...(isRecord(modern?.google_drive) ? modern.google_drive : {}),
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

export async function getUrlSourceSettings() {
  const config = await loadSystemConfig();
  const { legacy, modern } = getDataSourceSections(config);
  const legacyUrl = isRecord(legacy?.url_sources) ? legacy.url_sources : {};
  const modernUrl = isRecord(modern?.url_sources) ? modern.url_sources : {};
  const urlSources = { ...legacyUrl, ...modernUrl };

  const allowedDomains = (() => {
    const direct = normaliseStringList(urlSources.allowed_domains);
    if (direct.length) return direct;
    const whitelist = normaliseStringList(urlSources.whitelist);
    return whitelist.length ? whitelist : [...DEFAULT_URL_ALLOWED_DOMAINS];
  })();

  const policySection = (() => {
    if (isRecord(urlSources.fetch_policy)) return urlSources.fetch_policy;
    if (isRecord(urlSources.policy)) return urlSources.policy;
    return {};
  })();
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

  let entries = normaliseStringList(policy.before_asking_user);
  if (!entries.length) {
    const rag = config.rag ?? {};
    if (isRecord(rag)) {
      entries = normaliseStringList(rag.before_asking_user ?? rag.policy?.before_asking_user);
    }
  }
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

  const seen = new Set();
  const ordered = [];
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

export async function getTelemetryConfig() {
  const config = await loadSystemConfig();
  const telemetry = isRecord(config.telemetry) ? config.telemetry : {};

  const namespace =
    typeof telemetry.namespace === 'string' && telemetry.namespace.trim()
      ? telemetry.namespace.trim()
      : 'prisma-glow';
  const defaultService =
    typeof telemetry.default_service === 'string' && telemetry.default_service.trim()
      ? telemetry.default_service.trim()
      : 'backend-api';
  const defaultEnvironmentEnv =
    typeof telemetry.default_environment_env === 'string' && telemetry.default_environment_env.trim()
      ? telemetry.default_environment_env.trim()
      : undefined;

  const exporters = [];
  const exporterSection = telemetry.exporters;
  if (isRecord(exporterSection) && Array.isArray(exporterSection.traces)) {
    for (const entry of exporterSection.traces) {
      if (!isRecord(entry)) continue;
      const headersRaw = entry.headers;
      const headers = isRecord(headersRaw)
        ? Object.fromEntries(Object.entries(headersRaw).map(([key, value]) => [String(key), String(value)]))
        : {};

      exporters.push({
        name: typeof entry.name === 'string' && entry.name.trim() ? entry.name.trim() : 'default',
        protocol: typeof entry.protocol === 'string' && entry.protocol.trim() ? entry.protocol.trim() : 'otlp_http',
        endpoint: typeof entry.endpoint === 'string' && entry.endpoint.trim() ? entry.endpoint.trim() : undefined,
        endpointEnv:
          typeof entry.endpoint_env === 'string' && entry.endpoint_env.trim() ? entry.endpoint_env.trim() : undefined,
        headers,
        headersEnv:
          typeof entry.headers_env === 'string' && entry.headers_env.trim() ? entry.headers_env.trim() : undefined,
      });
    }
  }

  return {
    namespace,
    defaultService,
    defaultEnvironmentEnv,
    traces: exporters,
  };
}

export function resolveTraceExporter(exporter) {
  const endpointEnv = exporter.endpointEnv ? process.env[exporter.endpointEnv] : undefined;
  const endpoint = typeof endpointEnv === 'string' && endpointEnv.trim() ? endpointEnv.trim() : exporter.endpoint ?? null;
  const headers = { ...(exporter.headers ?? {}) };
  const headersEnv = exporter.headersEnv ? process.env[exporter.headersEnv] : undefined;
  Object.assign(headers, parseHeadersEnv(headersEnv));
  return {
    ...exporter,
    resolvedEndpoint: endpoint || null,
    resolvedHeaders: headers,
  };
}
