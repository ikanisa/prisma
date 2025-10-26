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
    cacheTtlMinutes: 1440,
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
export const AUTONOMY_LEVELS = ['L0', 'L1', 'L2', 'L3'];
export const AUTONOMY_LEVEL_ORDER = AUTONOMY_LEVELS.reduce((acc, level, index) => {
    acc[level] = index;
    return acc;
}, {});
export const DEFAULT_AUTONOMY_LEVEL = 'L2';
export const DEFAULT_AUTONOMY_LABELS = {
    L0: 'Manual: user triggers everything',
    L1: 'Suggest: agent proposes actions; user approves',
    L2: 'Auto-prepare: agent drafts & stages; user approves to submit/file',
    L3: 'Autopilot: agent executes within policy; asks only if evidence is missing',
};
export const DEFAULT_AUTOPILOT_ALLOWANCES = {
    L0: [],
    L1: ['refresh_analytics'],
    L2: [
        'extract_documents',
        'remind_pbc',
        'refresh_analytics',
        'close_cycle',
        'audit_fieldwork',
        'tax_cycle',
    ],
    L3: [
        'extract_documents',
        'remind_pbc',
        'refresh_analytics',
        'close_cycle',
        'audit_fieldwork',
        'tax_cycle',
    ],
};
export const cloneDefaultAutopilotAllowances = () => ({
    L0: [...DEFAULT_AUTOPILOT_ALLOWANCES.L0],
    L1: [...DEFAULT_AUTOPILOT_ALLOWANCES.L1],
    L2: [...DEFAULT_AUTOPILOT_ALLOWANCES.L2],
    L3: [...DEFAULT_AUTOPILOT_ALLOWANCES.L3],
});
const CACHE_WINDOW_MS = 60000;
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
function parseHeadersEnv(raw) {
    const headers = {};
    if (typeof raw !== 'string')
        return headers;
    for (const part of raw.split(',')) {
        const trimmed = part.trim();
        if (!trimmed)
            continue;
        const eqIndex = trimmed.indexOf('=');
        if (eqIndex <= 0)
            continue;
        const key = trimmed.slice(0, eqIndex).trim();
        const value = trimmed.slice(eqIndex + 1).trim();
        if (!key || !value)
            continue;
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
const DEFAULT_ENCRYPTION_KEY_SETTINGS = Object.freeze({
    provider: null,
    keyReference: null,
    rotationPeriodDays: null,
});
function normaliseEncryptionEntry(raw) {
    if (!isRecord(raw)) {
        return { ...DEFAULT_ENCRYPTION_KEY_SETTINGS };
    }
    const providerValue = raw.provider ?? raw.provider_id ?? raw.kms_provider;
    const provider = typeof providerValue === 'string' && providerValue.trim() ? providerValue.trim() : null;
    const keyValue = raw.key_reference ??
        raw.keyReference ??
        raw.reference ??
        raw.resource ??
        raw.kms_key ??
        raw.kmsKey ??
        null;
    const keyReference = typeof keyValue === 'string' && keyValue.trim() ? keyValue.trim() : null;
    const rotationValue = raw.rotation_days ??
        raw.rotationDays ??
        raw.rotation_period_days ??
        raw.rotationPeriodDays ??
        raw.rotation ??
        null;
    const rotation = coerceNumber(rotationValue);
    const rotationPeriodDays = typeof rotation === 'number' && rotation > 0 ? rotation : null;
    return {
        provider,
        keyReference,
        rotationPeriodDays,
    };
}
function resolveEncryptionSection(config) {
    const section = isRecord(config.encryption) ? config.encryption : {};
    const supabaseRaw = section.supabase ?? section.database;
    const objectStorageRaw = section.object_storage ?? section.objectStorage ?? section.storage;
    const jobQueueRaw = section.job_queue ?? section.jobQueue ?? section.queue;
    return {
        supabase: normaliseEncryptionEntry(supabaseRaw),
        objectStorage: normaliseEncryptionEntry(objectStorageRaw),
        jobQueue: normaliseEncryptionEntry(jobQueueRaw),
    };
}
export async function getEncryptionConfig() {
    const config = await loadSystemConfig();
    const resolved = resolveEncryptionSection(config);
    return {
        supabase: { ...DEFAULT_ENCRYPTION_KEY_SETTINGS, ...resolved.supabase },
        objectStorage: { ...DEFAULT_ENCRYPTION_KEY_SETTINGS, ...resolved.objectStorage },
        jobQueue: { ...DEFAULT_ENCRYPTION_KEY_SETTINGS, ...resolved.jobQueue },
    };
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
export async function getTelemetryConfig() {
    const config = await loadSystemConfig();
    const telemetry = isRecord(config.telemetry) ? config.telemetry : {};
    const namespace = typeof telemetry.namespace === 'string' && telemetry.namespace.trim()
        ? telemetry.namespace.trim()
        : 'prisma-glow';
    const defaultService = typeof telemetry.default_service === 'string' && telemetry.default_service.trim()
        ? telemetry.default_service.trim()
        : 'backend-api';
    const defaultEnvironmentEnv = typeof telemetry.default_environment_env === 'string' && telemetry.default_environment_env.trim()
        ? telemetry.default_environment_env.trim()
        : undefined;
    const exporters = [];
    const exporterSection = telemetry.exporters;
    if (isRecord(exporterSection) && Array.isArray(exporterSection.traces)) {
        for (const entry of exporterSection.traces) {
            if (!isRecord(entry))
                continue;
            const headersRaw = entry.headers;
            const headers = isRecord(headersRaw)
                ? Object.fromEntries(Object.entries(headersRaw).map(([key, value]) => [String(key), String(value)]))
                : {};
            exporters.push({
                name: typeof entry.name === 'string' && entry.name.trim() ? entry.name.trim() : 'default',
                protocol: typeof entry.protocol === 'string' && entry.protocol.trim() ? entry.protocol.trim() : 'otlp_http',
                endpoint: typeof entry.endpoint === 'string' && entry.endpoint.trim() ? entry.endpoint.trim() : undefined,
                endpointEnv: typeof entry.endpoint_env === 'string' && entry.endpoint_env.trim() ? entry.endpoint_env.trim() : undefined,
                headers,
                headersEnv: typeof entry.headers_env === 'string' && entry.headers_env.trim() ? entry.headers_env.trim() : undefined,
            });
        }
    }
    return { namespace, defaultService, defaultEnvironmentEnv, traces: exporters };
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
//# sourceMappingURL=index.js.map