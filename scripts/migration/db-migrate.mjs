#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(__dirname, '..');

const projectRef =
  process.env.SUPABASE_PROJECT_ID ?? process.env.SUPABASE_PROJECT_REF;

if (!projectRef) {
  console.error(
    '❌ Missing SUPABASE_PROJECT_ID (or SUPABASE_PROJECT_REF) environment variable.'
  );
  console.error('   Please export it before running `pnpm run db:migrate`.');
  process.exit(1);
}

console.log(`🚚 Pushing database migrations to project ${projectRef}...`);

const result = spawnSync('supabase', ['db', 'push', '--project-ref', projectRef], {
  cwd: workspaceRoot,
  stdio: 'inherit',
});

if (result.error) {
  console.error(`❌ Failed to run Supabase CLI: ${result.error.message}`);
  process.exit(1);
}

if (typeof result.status === 'number') {
  process.exit(result.status);
}
