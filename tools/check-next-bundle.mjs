#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

if (process.argv.length < 4) {
  console.error('Usage: node tools/check-next-bundle.mjs <statsPath> <configPath>');
  process.exit(1);
}

const [statsPath, configPath] = process.argv.slice(2);

const statsFile = resolve(statsPath);
const configFile = resolve(configPath);

let stats;
let config;

try {
  stats = JSON.parse(readFileSync(statsFile, 'utf-8'));
} catch (error) {
  console.error(`[bundle-check] failed to read stats file at ${statsFile}:`, error);
  process.exit(1);
}

try {
  config = JSON.parse(readFileSync(configFile, 'utf-8'));
} catch (error) {
  console.error(`[bundle-check] failed to read config at ${configFile}:`, error);
  process.exit(1);
}

if (!Array.isArray(stats)) {
  console.error('[bundle-check] unexpected stats format: expected an array');
  process.exit(1);
}

const entryBudgets = config?.entries;
if (!entryBudgets || typeof entryBudgets !== 'object') {
  console.error('[bundle-check] config missing "entries" map');
  process.exit(1);
}

const entrySizes = new Map();
for (const chunk of stats) {
  if (!chunk || typeof chunk !== 'object') continue;
  if (!chunk.isInitialByEntrypoint) continue;
  const gzipSize = Number(chunk.gzipSize) || 0;
  const entrypoints = Object.keys(chunk.isInitialByEntrypoint);
  for (const entry of entrypoints) {
    entrySizes.set(entry, (entrySizes.get(entry) ?? 0) + gzipSize);
  }
}

let failed = false;
const results = [];

for (const [entry, budget] of Object.entries(entryBudgets)) {
  if (!budget || typeof budget.maxGzipBytes !== 'number') {
    console.warn(`[bundle-check] skipping entry ${entry} due to missing maxGzipBytes`);
    continue;
  }
  const actual = entrySizes.get(entry) ?? 0;
  const limit = budget.maxGzipBytes;
  const ok = actual <= limit;
  results.push({ entry, actual, limit, ok });
  if (!ok) {
    failed = true;
  }
}

results
  .sort((a, b) => b.actual - a.actual)
  .forEach(({ entry, actual, limit, ok }) => {
    const actualKb = (actual / 1024).toFixed(2);
    const limitKb = (limit / 1024).toFixed(2);
    console.log(`[bundle-check] ${entry}: ${actualKb}kB (limit ${limitKb}kB) ${ok ? 'OK' : 'FAIL'}`);
  });

if (failed) {
  console.error('[bundle-check] bundle budgets exceeded');
  process.exit(1);
}

console.log('[bundle-check] bundle budgets within limits');
