#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const DOMAINS = ['commerce', 'messaging', 'ai', 'mobility', 'system'];
const BUILD_DIR = path.join(__dirname, '..', 'build');
const SRC_DIR = path.join(__dirname, '..', 'src');

// Clean build directory
if (fs.existsSync(BUILD_DIR)) {
  fs.rmSync(BUILD_DIR, { recursive: true });
}
fs.mkdirSync(BUILD_DIR, { recursive: true });

// Copy shared utilities to build
const sharedSrc = path.join(SRC_DIR, 'shared');
const sharedDest = path.join(BUILD_DIR, '_shared');
fs.cpSync(sharedSrc, sharedDest, { recursive: true });

// Build each domain
for (const domain of DOMAINS) {
  const domainSrc = path.join(SRC_DIR, domain);
  const domainDest = path.join(BUILD_DIR, domain);
  
  if (fs.existsSync(domainSrc)) {
    fs.cpSync(domainSrc, domainDest, { recursive: true });
    console.log(`✅ Built ${domain} domain`);
  }
}

// Generate deployment manifest
const manifest = {
  domains: DOMAINS,
  functions: [],
  shared_utilities: ['logger', 'auth', 'validation', 'security', 'errors', 'cors', 'response'],
  build_timestamp: new Date().toISOString(),
};

// Scan for individual functions
for (const domain of DOMAINS) {
  const domainPath = path.join(BUILD_DIR, domain);
  if (fs.existsSync(domainPath)) {
    const files = fs.readdirSync(domainPath);
    for (const file of files) {
      if (file.endsWith('.ts') && file !== 'index.ts') {
        const functionName = file.replace('.ts', '');
        manifest.functions.push({
          name: functionName,
          domain,
          path: `${domain}/${file}`,
        });
      }
    }
  }
}

fs.writeFileSync(
  path.join(BUILD_DIR, 'manifest.json'),
  JSON.stringify(manifest, null, 2)
);

console.log(`🚀 Built ${manifest.functions.length} edge functions across ${DOMAINS.length} domains`);
console.log('📋 Manifest:', manifest.functions.map(f => `${f.domain}/${f.name}`).join(', '));