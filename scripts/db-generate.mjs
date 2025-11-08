#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(__dirname, '..');

const projectRef =
  process.env.SUPABASE_PROJECT_ID ?? process.env.SUPABASE_PROJECT_REF;

if (!projectRef) {
  console.error(
    '❌ Missing SUPABASE_PROJECT_ID (or SUPABASE_PROJECT_REF) environment variable.'
  );
  console.error('   Please export it before running `pnpm run db:generate`.');
  process.exit(1);
}

console.log(`🔄 Generating Supabase types for project ${projectRef}...`);

const result = spawnSync(
  'supabase',
  ['gen', 'types', 'typescript', '--project-ref', projectRef],
  {
    cwd: workspaceRoot,
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'inherit'],
  }
);

if (result.error) {
  console.error(`❌ Failed to run Supabase CLI: ${result.error.message}`);
  process.exit(1);
}

if (typeof result.status === 'number' && result.status !== 0) {
  process.exit(result.status);
}

const outputPath = resolve(workspaceRoot, 'packages/database/types.ts');
writeFileSync(outputPath, result.stdout);

console.log(
  `✅ Supabase types written to ${relative(workspaceRoot, outputPath)}`
);
