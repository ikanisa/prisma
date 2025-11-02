import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) {
    return false;
  }
  return defaultValue;
}

function parseList(value) {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === 'string' ? item.trim() : item))
      .filter(Boolean);
  }

  return String(value)
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseJSON(value, fallback = {}) {
  if (!value) {
    return { ...fallback };
  }

  if (typeof value === 'object') {
    return { ...fallback, ...value };
  }

  try {
    return { ...fallback, ...JSON.parse(value) };
  } catch (error) {
    console.warn(`Unable to parse JSON value '${value}': ${error.message}`);
    return { ...fallback };
  }
}

function readEnv(env, prefix, key, fallback) {
  if (prefix) {
    const prefixedKey = `${prefix}${key}`;
    if (env[prefixedKey] !== undefined) {
      return env[prefixedKey];
    }
  }
  if (env[key] !== undefined) {
    return env[key];
  }
  return fallback;
}

function mergeObjects(target, source) {
  if (!source || typeof source !== 'object') {
    return target;
  }

  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      target[key] = mergeObjects(
        target[key] ? { ...target[key] } : {},
        value,
      );
    } else if (value !== undefined) {
      target[key] = value;
    }
  }

  return target;
}

export async function runCommand(command, { cwd = process.cwd(), env = {} } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      cwd,
      env: { ...process.env, ...env },
      shell: true,
      stdio: 'inherit',
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed (${code}): ${command}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

export function createDeploymentConfig(target = 'dev', env = process.env) {
  const prefix = target ? `${target.toUpperCase()}_` : '';
  const label = readEnv(env, prefix, 'DEPLOY_ENV_LABEL', target);

  const lintCommand = readEnv(env, prefix, 'LINT_COMMAND', 'pnpm run lint:workspace');
  const testCommand = readEnv(env, prefix, 'TEST_COMMAND', 'pnpm run test:workspace');
  const buildCommand = readEnv(env, prefix, 'BUILD_COMMAND', 'pnpm run build:workspace');

  const skipLint = parseBoolean(readEnv(env, prefix, 'SKIP_LINT', false));
  const skipTests = parseBoolean(readEnv(env, prefix, 'SKIP_TESTS', false));
  const skipBuild = parseBoolean(readEnv(env, prefix, 'SKIP_BUILD', false));

  const vercelCli = readEnv(env, prefix, 'VERCEL_CLI', readEnv(env, '', 'VERCEL_CLI', 'pnpm dlx vercel'));
  const vercelToken = readEnv(env, prefix, 'VERCEL_TOKEN', env.VERCEL_TOKEN);
  const vercelOrgId = readEnv(env, prefix, 'VERCEL_ORG_ID', env.VERCEL_ORG_ID);
  const vercelProjectId = readEnv(env, prefix, 'VERCEL_PROJECT_ID', env.VERCEL_PROJECT_ID);
  const vercelScope = readEnv(env, prefix, 'VERCEL_SCOPE', env.VERCEL_SCOPE ?? vercelOrgId);
  const vercelTeam = readEnv(env, prefix, 'VERCEL_TEAM', env.VERCEL_TEAM);

  const vercelProdDefault = target.toLowerCase() === 'prod' || target.toLowerCase() === 'production';
  const vercelProd = parseBoolean(
    readEnv(env, prefix, 'VERCEL_PROD', vercelProdDefault),
    vercelProdDefault,
  );
  const vercelPrebuilt = parseBoolean(readEnv(env, prefix, 'VERCEL_PREBUILT', true), true);
  const vercelConfirm = parseBoolean(readEnv(env, prefix, 'VERCEL_CONFIRM', true), true);
  const vercelExtraArgs = parseList(readEnv(env, prefix, 'VERCEL_EXTRA_ARGS', ''));

  const backendEndpoints = parseList(readEnv(env, prefix, 'BACKEND_ENDPOINTS', ''));
  const backendMethod = readEnv(env, prefix, 'BACKEND_METHOD', 'POST');
  const backendHeaders = parseJSON(readEnv(env, prefix, 'BACKEND_HEADERS', '{}'));
  const backendPayload = readEnv(env, prefix, 'BACKEND_PAYLOAD', '');
  const backendTimeout = Number(readEnv(env, prefix, 'BACKEND_TIMEOUT', 120000));
  const backendSkip = parseBoolean(readEnv(env, prefix, 'BACKEND_SKIP', false));
  const backendToken = readEnv(env, prefix, 'BACKEND_BEARER_TOKEN', '');

  if (backendToken && !backendHeaders.Authorization && !backendHeaders.authorization) {
    backendHeaders.Authorization = `Bearer ${backendToken}`;
  }

  const config = {
    target,
    label,
    lintCommand,
    testCommand,
    buildCommand,
    skipLint,
    skipTests,
    skipBuild,
    vercel: {
      cli: vercelCli,
      token: vercelToken,
      orgId: vercelOrgId,
      projectId: vercelProjectId,
      scope: vercelScope,
      team: vercelTeam,
      prod: vercelProd,
      prebuilt: vercelPrebuilt,
      confirm: vercelConfirm,
      extraArgs: vercelExtraArgs,
      skip: parseBoolean(readEnv(env, prefix, 'VERCEL_SKIP', false)),
    },
    backend: {
      skip: backendSkip,
      endpoints: backendEndpoints,
      method: backendMethod,
      headers: backendHeaders,
      payload: backendPayload,
      timeout: Number.isFinite(backendTimeout) ? backendTimeout : 120000,
      retryCount: Number(readEnv(env, prefix, 'BACKEND_RETRY_COUNT', 0)) || 0,
      retryDelayMs: Number(readEnv(env, prefix, 'BACKEND_RETRY_DELAY', 2000)) || 2000,
    },
  };

  return config;
}

export function mergeDeploymentConfig(baseConfig, overrides = {}) {
  if (!overrides || typeof overrides !== 'object') {
    return baseConfig;
  }

  const result = structuredClone ? structuredClone(baseConfig) : JSON.parse(JSON.stringify(baseConfig));
  return mergeObjects(result, overrides);
}

export async function runDeploymentWithConfig(config) {
  console.log(`\n▶ Starting ${config.label} deployment pipeline`);

  if (!config.skipLint && config.lintCommand) {
    console.log(`\n→ Linting using: ${config.lintCommand}`);
    await runCommand(config.lintCommand);
  } else {
    console.log('\n→ Skipping lint step');
  }

  if (!config.skipTests && config.testCommand) {
    console.log(`\n→ Running tests using: ${config.testCommand}`);
    await runCommand(config.testCommand);
  } else {
    console.log('\n→ Skipping test step');
  }

  if (!config.skipBuild && config.buildCommand) {
    console.log(`\n→ Building using: ${config.buildCommand}`);
    await runCommand(config.buildCommand);
  } else {
    console.log('\n→ Skipping build step');
  }

  if (!config.vercel?.skip) {
    await deployToVercel(config.vercel, config.label);
  } else {
    console.log('\n→ Skipping Vercel deployment step');
  }

  if (!config.backend?.skip) {
    await triggerBackendPipelines(config.backend, config.label);
  } else {
    console.log('\n→ Skipping backend pipeline triggers');
  }

  console.log(`\n✅ ${config.label} deployment pipeline completed`);
}

export async function runDeployment(target, overrides = {}, env = process.env) {
  const baseConfig = createDeploymentConfig(target, env);
  const config = mergeDeploymentConfig(baseConfig, overrides);
  await runDeploymentWithConfig(config);
}

export async function deployToVercel(vercelConfig, label = 'deployment') {
  if (!vercelConfig.cli) {
    throw new Error('Vercel CLI command is not configured (set VERCEL_CLI environment variable).');
  }

  const args = [];
  if (vercelConfig.prod) {
    args.push('--prod');
  }
  if (vercelConfig.prebuilt) {
    args.push('--prebuilt');
  }
  if (vercelConfig.confirm) {
    args.push('--yes', '--confirm');
  }
  if (vercelConfig.scope) {
    args.push('--scope', vercelConfig.scope);
  } else if (vercelConfig.team) {
    args.push('--team', vercelConfig.team);
  }
  if (vercelConfig.projectId) {
    args.push('--project', vercelConfig.projectId);
  }
  if (Array.isArray(vercelConfig.extraArgs) && vercelConfig.extraArgs.length > 0) {
    args.push(...vercelConfig.extraArgs);
  }

  const command = `${vercelConfig.cli} ${args.join(' ')}`.trim();
  const env = { ...process.env };

  if (vercelConfig.token) {
    env.VERCEL_TOKEN = vercelConfig.token;
  }
  if (vercelConfig.orgId) {
    env.VERCEL_ORG_ID = vercelConfig.orgId;
  }
  if (vercelConfig.projectId) {
    env.VERCEL_PROJECT_ID = vercelConfig.projectId;
  }

  console.log(`\n→ Deploying ${label} via Vercel: ${command}`);
  await runCommand(command, { env });
}

export async function triggerBackendPipelines(backendConfig, label = 'deployment') {
  if (!backendConfig.endpoints?.length) {
    console.log('\n→ No backend pipeline endpoints configured; skipping trigger');
    return;
  }

  const payload = backendConfig.payload ? buildPayload(backendConfig.payload) : undefined;

  for (const endpoint of backendConfig.endpoints) {
    let attempt = 0;
    let lastError;

    while (attempt <= backendConfig.retryCount) {
      try {
        await callEndpoint(endpoint, backendConfig, payload);
        break;
      } catch (error) {
        lastError = error;
        attempt += 1;
        if (attempt > backendConfig.retryCount) {
          throw new Error(`Failed to trigger backend pipeline at ${endpoint}: ${error.message}`);
        }
        console.warn(
          `Backend pipeline call failed for ${endpoint} (attempt ${attempt}): ${error.message}. Retrying in ${backendConfig.retryDelayMs}ms`,
        );
        await delay(backendConfig.retryDelayMs);
      }
    }
  }

  console.log(`\n→ Backend pipelines triggered for ${label}`);
}

function buildPayload(payload) {
  if (!payload) {
    return undefined;
  }

  if (typeof payload === 'object') {
    return JSON.stringify(payload);
  }

  const trimmed = String(payload).trim();
  if (!trimmed) {
    return undefined;
  }

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return JSON.stringify(JSON.parse(trimmed));
    } catch (error) {
      console.warn(`Backend payload is not valid JSON; sending raw string. Error: ${error.message}`);
      return trimmed;
    }
  }

  return trimmed;
}

async function callEndpoint(endpoint, backendConfig, payload) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), backendConfig.timeout);

  const headers = { ...backendConfig.headers };
  if (payload && !headers['Content-Type'] && !headers['content-type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(endpoint, {
    method: backendConfig.method || 'POST',
    headers,
    body: payload,
    signal: controller.signal,
  });

  clearTimeout(timeoutId);

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`HTTP ${response.status} ${response.statusText} - ${text}`);
  }
}
