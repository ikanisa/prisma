#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MIGRATIONS = [
  'supabase/migrations/20251115122000_web_fetch_cache.sql',
  'supabase/migrations/20251115123000_web_fetch_cache_retention.sql',
];

function parseProjects(input) {
  if (!input || input.trim().length === 0) {
    throw new Error(
      'SUPABASE_PROJECTS environment variable is required (format: "preview=abc123,production=xyz789").',
    );
  }
  return input
    .split(',')
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const [name, ref] = chunk.split('=');
      if (!name || !ref) {
        throw new Error(`Invalid project mapping "${chunk}". Expected format: name=project-ref.`);
      }
      return { name, ref };
    });
}

async function runCommand(command, args, options = {}) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, { stdio: 'inherit', ...options });
    child.on('error', (error) => rejectPromise(error));
    child.on('exit', (code) => {
      if (code === 0) {
        resolvePromise(undefined);
      } else {
        rejectPromise(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
      }
    });
  });
}

async function applyMigrations({ projects, dryRun }) {
  for (const project of projects) {
    for (const migration of MIGRATIONS) {
      const absolute = resolve(__dirname, '..', '..', migration);
      const args = ['db', 'remote', 'commit', '--project-ref', project.ref, '--file', absolute];
      if (dryRun) {
        console.log(`[dry-run] supabase ${args.join(' ')}`);
        continue;
      }
      console.log(`Applying ${migration} to ${project.name} (${project.ref})...`);
      await runCommand('supabase', args);
    }
  }
}

async function main() {
  try {
    const dryRun = process.argv.includes('--dry-run');
    const only = process.argv
      .filter((arg) => arg.startsWith('--project='))
      .map((arg) => arg.split('=')[1]);

    const projects = parseProjects(process.env.SUPABASE_PROJECTS);
    const filtered = only.length > 0 ? projects.filter((project) => only.includes(project.name)) : projects;

    if (filtered.length === 0) {
      console.warn('No Supabase projects matched the provided filters. Nothing to do.');
      return;
    }

    await applyMigrations({ projects: filtered, dryRun });
    console.log('Web fetch cache migrations complete.');
  } catch (error) {
    console.error(error.message ?? error);
    process.exit(1);
  }
}

await main();
