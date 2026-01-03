#!/usr/bin/env node
import { gzipSync } from 'zlib';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

const distDir = join(process.cwd(), 'dist', 'assets');

const MAX_MAIN_GZ = Number(process.env.BUNDLE_MAX_MAIN_GZ_KB || 300); // kB
const MAX_CHUNK_GZ = Number(process.env.BUNDLE_MAX_CHUNK_GZ_KB || 250); // kB

function gzSizeKB(filePath) {
  const buf = readFileSync(filePath);
  const gz = gzipSync(buf, { level: 9 });
  return Math.round((gz.length / 1024) * 100) / 100;
}

function isJSAsset(name) {
  return name.endsWith('.js') || name.endsWith('.mjs');
}

function isMainChunk(name) {
  return /(^|\/)index-.*\.js$/.test(name);
}

const entries = readdirSync(distDir).filter(isJSAsset);
if (entries.length === 0) {
  console.error(`[bundle-check] no JS assets found under ${distDir}`);
  process.exit(1);
}

let failed = false;

for (const name of entries) {
  const full = join(distDir, name);
  const gz = gzSizeKB(full);
  const limit = isMainChunk(name) ? MAX_MAIN_GZ : MAX_CHUNK_GZ;
  const ok = gz <= limit;
  console.log(`[bundle-check] ${name} gz=${gz}kB limit=${limit}kB ${ok ? 'OK' : 'FAIL'}`);
  if (!ok) failed = true;
}

if (failed) {
  console.error('[bundle-check] bundle budget exceeded');
  process.exit(1);
}
console.log('[bundle-check] bundle budgets within limits');

