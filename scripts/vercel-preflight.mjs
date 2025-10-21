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

const nodeVersion = process.version.replace(/^v/, '');
if (!nodeVersion.startsWith('18.')) {
  console.warn(`[preflight] Warning: expected Node 18.x but found ${process.version}`);
}

run('corepack enable');
run('pnpm install --frozen-lockfile');

if (process.env.VERCEL_TOKEN && process.env.VERCEL_ORG_ID && process.env.VERCEL_PROJECT_ID) {
  const vercelEnv = {
    ...process.env,
    VERCEL_TOKEN: process.env.VERCEL_TOKEN,
    VERCEL_ORG_ID: process.env.VERCEL_ORG_ID,
    VERCEL_PROJECT_ID: process.env.VERCEL_PROJECT_ID,
  };
  run('npx vercel pull --yes --environment=preview', {
    cwd: 'apps/web',
    env: vercelEnv,
  });
  run('npx vercel build', {
    cwd: 'apps/web',
    env: vercelEnv,
  });
} else {
  console.warn('[preflight] Skipping vercel pull/build because VERCEL_TOKEN/ORG_ID/PROJECT_ID are not all set.');
}

console.log('[preflight] Success');
