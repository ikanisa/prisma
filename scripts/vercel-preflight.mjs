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

const requiredNode = '22.12.0';
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

const rawAppEnv = process.env.APP_ENV;

if (!rawAppEnv || !String(rawAppEnv).trim()) {
  console.error('[preflight] APP_ENV must be defined to determine build steps.');
  process.exit(1);
}

const appEnv = rawAppEnv.toLowerCase();
console.log(`[preflight] APP_ENV resolved to "${appEnv}"`);

if (['production', 'preview'].includes(appEnv)) {
  run('pnpm lint');
  run('pnpm typecheck');
  run('pnpm --filter web build');
} else {
  console.log('[preflight] Skipping deployment build sync for local/test environments.');
}

console.log('[preflight] Success');
