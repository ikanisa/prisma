#!/usr/bin/env node
import { execSync } from 'node:child_process';
import process from 'node:process';

const requiredEnv = [
  'AUTH_CLIENT_ID',
  'AUTH_CLIENT_SECRET',
  'AUTH_ISSUER',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
];

const missing = requiredEnv.filter((key) => {
  const value = process.env[key];
  return !value || !String(value).trim();
});

if (missing.length) {
  console.error('[preflight] Missing required environment variables:', missing.join(', '));
  process.exit(1);
}

const run = (command, options = {}) => {
  console.log(`[preflight] ${command}`);
  execSync(command, { stdio: 'inherit', ...options });
};

const loadVercelCredentials = async () => {
  if (process.env.VERCEL_TOKEN && process.env.VERCEL_ORG_ID && process.env.VERCEL_PROJECT_ID) {
    return {
      token: process.env.VERCEL_TOKEN,
      orgId: process.env.VERCEL_ORG_ID,
      projectId: process.env.VERCEL_PROJECT_ID,
    };
  }

  try {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const credentialsPath = resolve('config/vercel-credentials.json');
    const raw = readFileSync(credentialsPath, 'utf-8');
    const parsed = JSON.parse(raw);

    if (parsed?.token && parsed?.orgId && parsed?.projectId) {
      process.env.VERCEL_TOKEN = parsed.token;
      process.env.VERCEL_ORG_ID = parsed.orgId;
      process.env.VERCEL_PROJECT_ID = parsed.projectId;
      if (parsed.mode) {
        process.env.VERCEL_CLI_MODE = parsed.mode;
      }
      return {
        token: parsed.token,
        orgId: parsed.orgId,
        projectId: parsed.projectId,
      };
    }

    console.warn('[preflight] vercel-credentials.json missing required fields; continuing without defaults');
    return null;
  } catch (error) {
    if (error && error.code !== 'ENOENT') {
      console.warn('[preflight] Failed to load vercel credentials file:', error);
    }
    return null;
  }
};

const requiredNode = '18.20.4';
const nodeVersion = process.version.replace(/^v/, '');
if (nodeVersion !== requiredNode) {
  console.error(
    `[preflight] Node ${requiredNode} is required. Detected ${process.version}. ` +
      'Run `nvm use` or install the version pinned in .nvmrc before running the preflight.',
  );
  process.exit(1);
}

run('corepack enable');
run('pnpm install --frozen-lockfile');

try {
  await import('google-auth-library');
  console.log('[preflight] google-auth-library resolved successfully');
} catch (error) {
  console.error('[preflight] Failed to resolve google-auth-library. Ensure pnpm install completed.', error);
  process.exit(1);
}

const credentials = await loadVercelCredentials();
if (credentials) {
  console.log('[preflight] Loaded Vercel credentials for project', credentials.projectId);
}

if (process.env.VERCEL_TOKEN && process.env.VERCEL_ORG_ID && process.env.VERCEL_PROJECT_ID) {
  const vercelEnv = {
    ...process.env,
    VERCEL_TOKEN: process.env.VERCEL_TOKEN,
    VERCEL_ORG_ID: process.env.VERCEL_ORG_ID,
    VERCEL_PROJECT_ID: process.env.VERCEL_PROJECT_ID,
  };

  const useStub = (process.env.VERCEL_CLI_MODE ?? '').toLowerCase() === 'stub';
  if (useStub) {
    run('node ../../scripts/vercel-cli-stub.mjs pull --environment=preview', {
      cwd: 'apps/web',
      env: vercelEnv,
    });
    run('node ../../scripts/vercel-cli-stub.mjs build', {
      cwd: 'apps/web',
      env: vercelEnv,
    });
  } else {
    run('npx vercel pull --yes --environment=preview', {
      cwd: 'apps/web',
      env: vercelEnv,
    });
    run('npx vercel build', {
      cwd: 'apps/web',
      env: vercelEnv,
    });
  }
} else {
  const reason = credentials
    ? 'token/org/project fields were incomplete'
    : 'VERCEL_TOKEN/ORG_ID/PROJECT_ID are not all set';
  console.warn(`[preflight] Skipping vercel pull/build because ${reason}.`);
}

console.log('[preflight] Success');
