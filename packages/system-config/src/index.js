import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
const ENV_CONFIG_PATH = 'SYSTEM_CONFIG_PATH';
const DEFAULT_CONFIG_PATH = path.resolve(process.cwd(), 'config/system.yaml');
const DEFAULT_GOOGLE_SCOPES = Object.freeze([
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/drive.metadata.readonly',
]);
const DEFAULT_FOLDER_MAPPING = 'org-{orgId}/entity-{entityId}/{repoFolder}';
const DEFAULT_URL_ALLOWED_DOMAINS = Object.freeze(['*']);
const DEFAULT_URL_POLICY = Object.freeze({
    obeyRobots: true,
    maxDepth: 1,
    cacheTtlMinutes: 1_440,
});
export const DEFAULT_BEFORE_ASKING_SEQUENCE = Object.freeze([
    'documents',
    'google_drive',
    'url_sources',
]);
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
const CACHE_WINDOW_MS = 60_000;
function isRecord(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function resolveModuleDefaultPath() {
    try {
        return path.resolve(fileURLToPath(new URL('../../config/system.yaml', import.meta.url)));
    }
    catch {
        return DEFAULT_CONFIG_PATH;
    }
}
async function resolveDefaultConfigPath() {
    const override = process.env[ENV_CONFIG_PATH];
    if (override && override.trim()) {
        const candidate = path.resolve(override.trim());
        try {
            const stats = await fs.stat(candidate);
            if (stats.isDirectory()) {
                return path.join(candidate, 'system.yaml');
            }
            return candidate;
        }
        catch {
            if (!path.extname(candidate)) {
                return path.join(candidate, 'system.yaml');
            }
            return candidate;
        }
    }
    return resolveModuleDefaultPath();
}
function normaliseStringList(values) {
    const result = [];
    if (Array.isArray(values)) {
        for (const entry of values) {
            if (typeof entry !== 'string')
                continue;
            const trimmed = entry.trim();
            if (!trimmed || result.includes(trimmed))
                continue;
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
    if (typeof value === 'boolean')
        return value;
    if (typeof value === 'string') {
        const lowered = value.trim().toLowerCase();
        if (['true', '1', 'yes', 'y', 'on'].includes(lowered))
            return true;
        if (['false', '0', 'no', 'n', 'off'].includes(lowered))
            return false;
    }
    if (typeof value === 'number') {
        if (value === 1)
            return true;
        if (value === 0)
            return false;
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
async function defaultReadFile(resolvedPath) {
    return fs.readFile(resolvedPath, 'utf8');
}
export function createSystemConfigAccessor(options = {}) {
    const ttl = options.cacheTtlMs ?? CACHE_WINDOW_MS;
    const resolvePath = options.resolvePath ?? resolveDefaultConfigPath;
    const readFile = options.readFile ?? defaultReadFile;
    const transform = options.transform ?? ((config) => config);
    let cache = null;
    async function loadFresh() {
        const configPath = await resolvePath();
        try {
            const file = await readFile(configPath);
            const parsed = parse(file);
            const value = transform(isRecord(parsed) ? parsed : {});
            return { loadedAt: Date.now(), path: configPath, value };
        }
        catch {
            const value = transform({});
            return { loadedAt: Date.now(), path: configPath, value };
        }
    }
    async function load() {
        const now = Date.now();
        const configPath = await resolvePath();
        if (cache && cache.path === configPath && now - cache.loadedAt < ttl) {
            return cache.value;
        }
        cache = await loadFresh();
        return cache.value;
    }
    async function refresh() {
        cache = await loadFresh();
        return cache.value;
    }
    return {
        async load() {
            return load();
        },
        snapshot() {
            return cache?.value;
        },
        invalidate() {
            cache = null;
        },
        async getPath() {
            return resolvePath();
        },
        async withConfig(selector) {
            const config = await load();
            return selector(config);
        },
        async refresh() {
            return refresh();
        },
    };
}
const defaultAccessor = createSystemConfigAccessor();
export async function loadSystemConfig() {
    return defaultAccessor.load();
}
export function getCachedSystemConfig() {
    return defaultAccessor.snapshot();
}
export function clearSystemConfigCache() {
    defaultAccessor.invalidate();
}
export function invalidateSystemConfigCache() {
    clearSystemConfigCache();
}
export async function getResolvedConfigPath() {
    return defaultAccessor.getPath();
}
export async function refreshSystemConfig() {
    return defaultAccessor.refresh();
}
function getDataSourceSections(config) {
    const legacy = isRecord(config?.data_sources) ? config.data_sources : undefined;
    const modern = isRecord(config?.datasources) ? config.datasources : undefined;
    return { legacy, modern };
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
export async function getUrlSourceSettings() {
    const config = await loadSystemConfig();
    const { legacy, modern } = getDataSourceSections(config);
    const legacyUrl = isRecord(legacy?.url_sources) ? legacy.url_sources : {};
    const modernUrl = isRecord(modern?.url_sources) ? modern.url_sources : {};
    const urlSources = { ...legacyUrl, ...modernUrl };
    const allowedDomains = (() => {
        const direct = normaliseStringList(urlSources.allowed_domains);
        if (direct.length)
            return direct;
        const whitelist = normaliseStringList(urlSources.whitelist);
        return whitelist.length ? whitelist : [...DEFAULT_URL_ALLOWED_DOMAINS];
    })();
    const policySection = (() => {
        if (isRecord(urlSources.fetch_policy))
            return urlSources.fetch_policy;
        if (isRecord(urlSources.policy))
            return urlSources.policy;
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
        const rag = config.rag;
        if (isRecord(rag)) {
            const ragRecord = rag;
            const ragSequence = normaliseStringList(ragRecord.before_asking_user);
            if (ragSequence.length) {
                entries = ragSequence;
            }
            else if (isRecord(ragRecord.policy)) {
                entries = normaliseStringList(ragRecord.policy.before_asking_user);
            }
        }
    }
    return entries.length ? entries : [...DEFAULT_BEFORE_ASKING_SEQUENCE];
}
export async function getRoleHierarchy(configOverride) {
    const config = configOverride ?? (await loadSystemConfig());
    const rbac = (config.rbac ?? {});
    const roles = normaliseStringList(rbac.roles);
    if (roles.length === 0) {
        return [...DEFAULT_ROLE_HIERARCHY];
    }
    const seen = new Set();
    const ordered = [];
    for (const role of roles) {
        const upper = role.toUpperCase();
        if (!upper || seen.has(upper))
            continue;
        seen.add(upper);
        ordered.push(upper);
    }
    for (const fallback of DEFAULT_ROLE_HIERARCHY) {
        const upper = fallback.toUpperCase();
        if (seen.has(upper))
            continue;
        seen.add(upper);
        ordered.push(upper);
    }
    return ordered;
}
