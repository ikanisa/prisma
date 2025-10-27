#!/usr/bin/env node

/**
 * Scan client-facing directories for references to server-only env names.
 * Exits with non-zero status if any matches are found.
 *
 * Usage:
 *   node tools/scripts/check-client-secrets.mjs
 *
 * Optionally create a .secret-scan-ignore file (relative paths) with lines:
 *   path:KEY # reason
 * Example:
 *   apps/web/src/components/Header.tsx:SUPABASE_SERVICE_ROLE_KEY # server logic used via SSR-only import
 */

import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(process.cwd());
const CLIENT_DIRS = ['apps/web', 'apps/admin', 'packages', 'public', 'apps/*/src'];
// A conservative list of server-only keys to look for:
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

function readIgnoreList() {
  const file = path.join(ROOT, '.secret-scan-ignore');
  if (!fs.existsSync(file)) return [];
  const lines = fs.readFileSync(file, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [pair] = l.split('#');
      const [p, k] = pair.split(':').map((s) => s && s.trim());
      return { path: p, key: k };
    });
  return lines;
}

function walk(dir, files = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const ent of entries) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      // skip node_modules, .git, dist/build output
      if (ent.name === 'node_modules' || ent.name === '.git' || ent.name === '.next' || ent.name === 'dist') continue;
      files = walk(p, files);
    } else if (ent.isFile()) {
      files.push(p);
    }
  }
  return files;
}

function matchesIgnore(relPath, key, ignoreList) {
  return ignoreList.some((i) => {
    if (!i.path || !i.key) return false;
    // simple startsWith match for path
    return relPath.startsWith(i.path) && i.key === key;
  });
}

const ignoreList = readIgnoreList();
const found = [];

for (const dir of CLIENT_DIRS) {
  // expand simple wildcard packages
  if (dir.includes('*')) {
    const base = dir.split('/*')[0];
    if (!fs.existsSync(base)) continue;
    const subs = fs.readdirSync(base, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => path.join(base, d.name));
    for (const sd of subs) {
      const files = walk(sd);
      for (const file of files) {
        if (!/\.(js|ts|jsx|tsx|md|html|json|env|yaml|yml)$/.test(file)) continue;
        const content = fs.readFileSync(file, 'utf8');
        for (const key of SERVER_ONLY_KEYS) {
          if (content.includes(key)) {
            const rel = path.relative(ROOT, file);
            if (!matchesIgnore(rel, key, ignoreList)) {
              found.push({ file: rel, key });
            }
          }
        }
      }
    }
    continue;
  }

  const full = path.join(ROOT, dir);
  if (!fs.existsSync(full)) continue;
  const files = walk(full);
  for (const file of files) {
    if (!/\.(js|ts|jsx|tsx|md|html|json|env|yaml|yml)$/.test(file)) continue;
    const content = fs.readFileSync(file, 'utf8');
    for (const key of SERVER_ONLY_KEYS) {
      if (content.includes(key)) {
        const rel = path.relative(ROOT, file);
        if (!matchesIgnore(rel, key, ignoreList)) {
          found.push({ file: rel, key });
        }
      }
    }
  }
}

if (found.length) {
  console.error('🚨 Server-only env references found in client-facing directories:');
  for (const f of found) {
    console.error(` - ${f.file}: ${f.key}`);
  }
  console.error('\nPlease remove or move these references to server-side code. Use .secret-scan-ignore to whitelist with justification.');
  process.exit(2);
}

console.log('No server-only env references found in client-facing directories.');
process.exit(0);
