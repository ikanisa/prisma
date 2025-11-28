import { fail } from 'k6';

const DEFAULT_ENV_PATH = './tests/performance/.env';

function parseEnv(content) {
  const values = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [rawKey, ...rawRest] = trimmed.split('=');
    if (!rawKey || rawRest.length === 0) continue;
    const key = rawKey.trim();
    if (!key) continue;
    const rawValue = rawRest.join('=').trim();
    if (!rawValue) {
      values[key] = '';
      continue;
    }
    const unquoted =
      (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
      (rawValue.startsWith("'") && rawValue.endsWith("'"))
        ? rawValue.slice(1, -1)
        : rawValue;
    values[key] = unquoted;
  }
  return values;
}

function loadEnvFile() {
  const envFile = __ENV.PERF_ENV_FILE || DEFAULT_ENV_PATH;
  if (__ENV.PERF_DISABLE_ENV_FILE === 'true') return {};
  try {
    const raw = open(envFile);
    return parseEnv(raw);
  } catch (error) {
    if (__ENV.PERF_ENV_FILE) {
      fail(`Failed to read performance env file at ${envFile}: ${error}`);
    }
    return {};
  }
}

const fileEnv = loadEnvFile();

function fromEnv(key, fallback) {
  const value = __ENV[key];
  if (value !== undefined) return value;
  if (fileEnv[key] !== undefined) return fileEnv[key];
  return fallback;
}

function toNumber(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normaliseUrl(value, fallback) {
  const raw = value || fallback;
  if (!raw) return '';
  return raw.replace(/\/$/, '');
}

const defaultOrgSlug = fromEnv('PERF_ORG_SLUG', 'demo');
const orgMembership = fromEnv('PERF_ORG_MEMBERSHIPS', `${defaultOrgSlug}:ADMIN`);

const config = {
  baseUrl: normaliseUrl(fromEnv('PERF_BASE_URL', ''), 'http://localhost:4000/v1'),
  backendUrl: normaliseUrl(
    fromEnv('PERF_BACKEND_BASE_URL', ''),
    normaliseUrl(fromEnv('PERF_BASE_URL', ''), 'http://localhost:4000/v1'),
  ),
  org: {
    slug: defaultOrgSlug,
    id: fromEnv('PERF_ORG_ID', defaultOrgSlug),
    userId: fromEnv('PERF_USER_ID', 'performance-bot'),
    memberships: orgMembership,
  },
  tokens: {
    service: fromEnv('PERF_SERVICE_TOKEN', fromEnv('PERF_AUTH_TOKEN', '')),
    autopilot: fromEnv(
      'PERF_AUTOPILOT_TOKEN',
      fromEnv('PERF_SERVICE_TOKEN', fromEnv('PERF_AUTH_TOKEN', '')),
    ),
  },
  summary: {
    dir: fromEnv('PERF_SUMMARY_DIR', 'test-results/performance'),
    format: fromEnv('PERF_SUMMARY_FORMAT', 'full'),
  },
  thresholds: {
    healthP95: toNumber(fromEnv('PERF_HEALTH_P95', '500'), 500),
    releaseControlsP95: toNumber(fromEnv('PERF_RELEASE_P95', '1200'), 1200),
    documentsP95: toNumber(fromEnv('PERF_DOCUMENTS_P95', '1500'), 1500),
    tasksP95: toNumber(fromEnv('PERF_TASKS_P95', '1500'), 1500),
  },
  scenarios: {
    apiSmoke: {
      rate: toNumber(fromEnv('PERF_API_RATE', '6'), 6),
      timeUnit: fromEnv('PERF_API_TIME_UNIT', '1s'),
      duration: fromEnv('PERF_API_DURATION', '2m'),
      preAllocatedVUs: toNumber(fromEnv('PERF_API_VUS', '10'), 10),
      maxVUs: toNumber(fromEnv('PERF_API_MAX_VUS', '20'), 20),
      gracefulStop: fromEnv('PERF_API_GRACEFUL_STOP', '30s'),
    },
    userJourneys: {
      rate: toNumber(fromEnv('PERF_JOURNEY_RATE', '4'), 4),
      timeUnit: fromEnv('PERF_JOURNEY_TIME_UNIT', '1s'),
      duration: fromEnv('PERF_JOURNEY_DURATION', '2m'),
      preAllocatedVUs: toNumber(fromEnv('PERF_JOURNEY_VUS', '6'), 6),
      maxVUs: toNumber(fromEnv('PERF_JOURNEY_MAX_VUS', '12'), 12),
      gracefulStop: fromEnv('PERF_JOURNEY_GRACEFUL_STOP', '30s'),
    },
  },
  autopilot: {
    jobKind: fromEnv('PERF_AUTOPILOT_JOB_KIND', 'extract_documents'),
  },
  tags: {
    environment: fromEnv('PERF_ENVIRONMENT_TAG', 'load-test'),
  },
};

if (!config.baseUrl) {
  fail('PERF_BASE_URL must be configured to run performance tests.');
}
if (!config.tokens.service) {
  fail('PERF_SERVICE_TOKEN or PERF_AUTH_TOKEN must be provided for performance tests.');
}

export function getConfig() {
  return config;
}

export function gatewayUrl(path) {
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${config.baseUrl}${suffix}`;
}

export function backendUrl(path) {
  const suffix = path.startsWith('/') ? path : `/${path}`;
  const base = config.backendUrl || config.baseUrl;
  return `${base}${suffix}`;
}

function removeEmptyHeaders(headers) {
  const output = {};
  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined || value === null || value === '') continue;
    output[key] = value;
  }
  return output;
}

export function gatewayHeaders(overrides = {}, token = config.tokens.service) {
  return removeEmptyHeaders({
    Authorization: token ? `Bearer ${token}` : undefined,
    'Content-Type': 'application/json',
    'x-org-id': config.org.id,
    'x-org-memberships': config.org.memberships,
    'x-user-id': config.org.userId,
    ...overrides,
  });
}

export function summaryConfig(defaultName) {
  const dir = config.summary.dir || 'test-results/performance';
  const baseName = __ENV.PERF_SUMMARY_BASENAME || defaultName;
  const format = (config.summary.format || 'full').toLowerCase();
  return { dir, baseName, format };
}

export function sleepDuration() {
  return toNumber(fromEnv('PERF_SLEEP_SECONDS', '1'), 1);
}
