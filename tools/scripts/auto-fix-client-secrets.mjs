#!/usr/bin/env node
/*
 * Auto-fix scanner hits in client-facing directories by replacing server-only
 * env references with a safe placeholder and adding a TODO comment that points
 * reviewers to the server-side secret helper.
 *
 * Usage:
 *   node tools/scripts/auto-fix-client-secrets.mjs
 *
 * This script is intentionally conservative: it only replaces exact token
 * matches (process.env.KEY, KEY in env files) and leaves surrounding code
 * intact. It prints a summary and exits non-zero if it changed files so CI
 * can be used to commit fixes automatically if desired.
 */

import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(process.cwd());
const CLIENT_DIRS = ['apps/web', 'apps/admin', 'packages', 'public'];
const SERVER_ONLY_KEYS = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_URL',
  'SUPABASE_JWT_SECRET',
  'DATABASE_URL',
  'OPENAI_API_KEY',
  'SMTP_PASSWORD',
  'STRIPE_SECRET_KEY',
  'KMS_DATA_KEY',
  'KMS_DATA_KEY_BASE64',
  'REPORT_SIGNING_KEY',
  'HMAC_SHARED_SECRET',
  'TRUSTED_COOKIE_SECRET',
  'BACKUP_PEPPER',
];

function walk(dir, files = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return files; }
  for (const ent of entries) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules' || ent.name === '.git' || ent.name === '.next' || ent.name === 'dist') continue;
      files = walk(p, files);
    } else if (ent.isFile()) {
      files.push(p);
    }
  }
  return files;
}

function replaceInFile(file, key) {
  const content = fs.readFileSync(file, 'utf8');
  let changed = false;
  // replace process.env.KEY
  const re1 = new RegExp(`process\\.env\\.${key}`, 'g');
  if (re1.test(content)) {
    changed = true;
  }
  let next = content.replace(re1, "'<REMOVED_SERVER_SECRET>' /* SERVER_SECRET_REMOVED: use server helper */");

  // replace bare KEY (env files)
  const basename = path.basename(file);
  if (/^(\.env|env|.*\.env.*|.*example.*)$/i.test(basename)) {
    const re2 = new RegExp(`(^|\\n)(${key}=).*`, 'g');
    if (re2.test(next)) changed = true;
    next = next.replace(re2, `$1$2<REMOVED_SERVER_SECRET> # SERVER_SECRET_REMOVED: set on server or vault`);
  }

  if (changed) {
    fs.writeFileSync(file, next, 'utf8');
  }
  return changed;
}

const modified = [];
for (const dir of CLIENT_DIRS) {
  const full = path.join(ROOT, dir);
  if (!fs.existsSync(full)) continue;
  const files = walk(full).filter((f) => {
    const basename = path.basename(f);
    return (
      /\.(js|ts|jsx|tsx|md|html|json|env|yaml|yml)$/.test(f) ||
      basename.includes('.env')
    );
  });
  for (const file of files) {
    for (const key of SERVER_ONLY_KEYS) {
      try {
        if (replaceInFile(file, key)) modified.push({ file: path.relative(ROOT, file), key });
      } catch (err) {
        console.error('error processing', file, err);
      }
    }
  }
}

if (modified.length) {
  console.log('Auto-fixed server-only env references in client-facing files:');
  for (const m of modified) console.log(` - ${m.file}: ${m.key}`);
  console.log('\nPlease review changes and commit.');
  process.exit(3);
}

console.log('No server-only env references found in client-facing directories.');
process.exit(0);
