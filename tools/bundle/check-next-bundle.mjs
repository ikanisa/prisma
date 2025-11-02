#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

const args = process.argv.slice(2);
const options = {};
for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === '--app') {
    options.app = args[i + 1];
    i += 1;
  } else if (arg === '--budgets') {
    options.budgets = args[i + 1];
    i += 1;
  } else if (arg === '--format') {
    options.format = args[i + 1];
    i += 1;
  }
}

if (!options.app) {
  console.error('[bundle-check] --app option is required');
  process.exit(1);
}

const appDir = resolve(process.cwd(), options.app);
const nextDir = join(appDir, '.next');

const budgetsPath = resolve(process.cwd(), options.budgets || 'config/bundle-budgets.json');
const budgetsRaw = JSON.parse(readFileSync(budgetsPath, 'utf8'));
const appBudgets = budgetsRaw[options.app];
if (!appBudgets) {
  console.error(`[bundle-check] no budgets defined for ${options.app}`);
  process.exit(1);
}

const appManifestPath = join(nextDir, 'app-build-manifest.json');
const buildManifestPath = join(nextDir, 'build-manifest.json');
if (!existsSync(appManifestPath) || !existsSync(buildManifestPath)) {
  console.error('[bundle-check] missing Next.js manifest files. Run `next build` first.');
  process.exit(1);
}

const appManifest = JSON.parse(readFileSync(appManifestPath, 'utf8'));
const buildManifest = JSON.parse(readFileSync(buildManifestPath, 'utf8'));

const chunkSizeCache = new Map();

function getChunkSize(chunkPath) {
  if (chunkSizeCache.has(chunkPath)) {
    return chunkSizeCache.get(chunkPath);
  }
  const filePath = join(nextDir, chunkPath);
  if (!existsSync(filePath)) {
    console.warn(`[bundle-check] chunk missing from build output: ${chunkPath}`);
    chunkSizeCache.set(chunkPath, 0);
    return 0;
  }
  const data = readFileSync(filePath);
  const sizeKB = options.format === 'raw'
    ? data.length / 1024
    : gzipSync(data, { level: 9 }).length / 1024;
  const rounded = Math.round(sizeKB * 100) / 100;
  chunkSizeCache.set(chunkPath, rounded);
  return rounded;
}

function computeSharedBudget() {
  if (!appBudgets.shared) return [];
  const sharedFiles = new Set([
    ...(buildManifest.polyfillFiles || []),
    ...(buildManifest.rootMainFiles || []),
  ]);
  let total = 0;
  for (const file of sharedFiles) {
    total += getChunkSize(file);
  }
  const limit = appBudgets.shared.client;
  const ok = typeof limit !== 'number' || total <= limit;
  return [{
    scope: 'shared',
    sizeKB: Math.round(total * 100) / 100,
    limitKB: limit,
    ok,
  }];
}

function computePageBudgets() {
  const results = [];
  const budgets = appBudgets.pages || {};
  for (const [page, limit] of Object.entries(budgets)) {
    const chunks = appManifest.pages?.[page] || buildManifest.pages?.[page];
    if (!chunks) {
      results.push({ scope: `page:${page}`, sizeKB: 0, limitKB: limit, ok: false, missing: true });
      continue;
    }
    let total = 0;
    const seen = new Set();
    for (const chunk of chunks) {
      if (seen.has(chunk)) continue;
      seen.add(chunk);
      total += getChunkSize(chunk);
    }
    const rounded = Math.round(total * 100) / 100;
    results.push({ scope: `page:${page}`, sizeKB: rounded, limitKB: limit, ok: typeof limit !== 'number' || rounded <= limit });
  }
  return results;
}

const sharedResults = computeSharedBudget();
const pageResults = computePageBudgets();
const allResults = [...sharedResults, ...pageResults];

for (const result of allResults) {
  if (result.missing) {
    console.error(`[bundle-check] ${result.scope} missing from manifest`);
  } else if (typeof result.limitKB === 'number') {
    console.log(
      `[bundle-check] ${result.scope} size=${result.sizeKB}kB limit=${result.limitKB}kB ${result.ok ? 'OK' : 'FAIL'}`,
    );
  } else {
    console.log(`[bundle-check] ${result.scope} size=${result.sizeKB}kB (no limit set)`);
  }
}

if (allResults.some((result) => !result.ok)) {
  console.error('[bundle-check] bundle budgets exceeded');
  process.exit(1);
}

console.log('[bundle-check] bundle budgets within limits');
