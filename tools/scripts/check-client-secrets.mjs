#!/usr/bin/env node

/**
 * Client Secret Scanner
 * 
 * Scans client-facing directories for server-only environment variable references.
 * Exits with non-zero status if server-only secrets are found in client code.
 * 
 * Usage: node tools/scripts/check-client-secrets.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');

// Server-only environment variable patterns to detect
const SERVER_ONLY_PATTERNS = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_JWT_SECRET',
  'DATABASE_URL',
  'DIRECT_URL',
  'OPENAI_API_KEY',
  'SMTP_PASSWORD',
  'STRIPE_SECRET_KEY',
  'KMS_DATA_KEY',
  'AUTH_CLIENT_SECRET',
  'AUTOMATION_WEBHOOK_SECRET',
  'N8N_WEBHOOK_SECRET',
  'REDIS_PASSWORD',
  'AWS_SECRET_ACCESS_KEY',
  'GITHUB_TOKEN',
  'PRIVATE_KEY',
];

// Directories to scan (client-facing code)
const SCAN_DIRS = [
  'apps/web/app',
  'apps/web/components',
  'apps/web/pages',
  'apps/web/src',
  'apps/web/public',
  'packages/ui/src',
  'packages/platform/src',
  'src',
  'public',
];

// File extensions to scan
const SCAN_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs'];

// Files/patterns to skip
const SKIP_PATTERNS = [
  /node_modules/,
  /\.next/,
  /\.git/,
  /dist/,
  /build/,
  /coverage/,
  /\.test\./,
  /\.spec\./,
  /env\.ts$/,  // Skip env.ts files as they contain definitions
  /env\.server\./,  // Skip server-side env files
  /secrets\./,  // Skip secrets management files
];

// Load whitelist from .secret-scan-ignore
function loadWhitelist() {
  const whitelistPath = path.join(ROOT_DIR, '.secret-scan-ignore');
  if (!fs.existsSync(whitelistPath)) {
    return [];
  }
  
  const content = fs.readFileSync(whitelistPath, 'utf-8');
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
    .map(line => {
      const [pathPattern, key, ...reasonParts] = line.split(/\s+/);
      return {
        path: pathPattern,
        key: key,
        reason: reasonParts.join(' ').replace(/^#\s*/, ''),
      };
    });
}

// Check if a file/key combination is whitelisted
function isWhitelisted(filePath, key, whitelist) {
  const relativePath = path.relative(ROOT_DIR, filePath);
  return whitelist.some(entry => {
    const pathMatch = entry.path === relativePath || 
                     relativePath.includes(entry.path) ||
                     entry.path === '*';
    const keyMatch = entry.key === key || entry.key === '*';
    return pathMatch && keyMatch;
  });
}

// Scan a file for server-only secrets
function scanFile(filePath, whitelist) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const findings = [];
  
  for (const pattern of SERVER_ONLY_PATTERNS) {
    // Look for environment variable access patterns
    const envPatterns = [
      new RegExp(`process\\.env\\.${pattern}`, 'g'),
      new RegExp(`process\\.env\\['${pattern}'\\]`, 'g'),
      new RegExp(`process\\.env\\["${pattern}"\\]`, 'g'),
      new RegExp(`import\\.meta\\.env\\.${pattern}`, 'g'),
      new RegExp(`['"]${pattern}['"]`, 'g'),
    ];
    
    for (const regex of envPatterns) {
      const matches = content.match(regex);
      if (matches) {
        // Check if whitelisted
        if (!isWhitelisted(filePath, pattern, whitelist)) {
          const lines = content.split('\n');
          const lineNumbers = [];
          
          lines.forEach((line, idx) => {
            if (regex.test(line)) {
              lineNumbers.push(idx + 1);
            }
          });
          
          findings.push({
            file: path.relative(ROOT_DIR, filePath),
            key: pattern,
            lines: lineNumbers,
            matches: matches.length,
          });
        }
      }
    }
  }
  
  return findings;
}

// Recursively scan directory
function scanDirectory(dirPath, whitelist) {
  let allFindings = [];
  
  if (!fs.existsSync(dirPath)) {
    return allFindings;
  }
  
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relativePath = path.relative(ROOT_DIR, fullPath);
    
    // Skip if matches skip pattern
    if (SKIP_PATTERNS.some(pattern => pattern.test(relativePath))) {
      continue;
    }
    
    if (entry.isDirectory()) {
      allFindings = allFindings.concat(scanDirectory(fullPath, whitelist));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (SCAN_EXTENSIONS.includes(ext)) {
        const findings = scanFile(fullPath, whitelist);
        allFindings = allFindings.concat(findings);
      }
    }
  }
  
  return allFindings;
}

// Main execution
function main() {
  console.log('🔍 Scanning for server-only secrets in client-facing code...\n');
  
  const whitelist = loadWhitelist();
  if (whitelist.length > 0) {
    console.log(`📋 Loaded ${whitelist.length} whitelist entries from .secret-scan-ignore\n`);
  }
  
  let allFindings = [];
  
  for (const dir of SCAN_DIRS) {
    const dirPath = path.join(ROOT_DIR, dir);
    console.log(`Scanning: ${dir}`);
    const findings = scanDirectory(dirPath, whitelist);
    allFindings = allFindings.concat(findings);
  }
  
  if (allFindings.length === 0) {
    console.log('\n✅ No server-only secrets found in client code!');
    process.exit(0);
  }
  
  console.log('\n❌ Found server-only secrets in client-facing code:\n');
  
  // Group by file
  const byFile = {};
  for (const finding of allFindings) {
    if (!byFile[finding.file]) {
      byFile[finding.file] = [];
    }
    byFile[finding.file].push(finding);
  }
  
  for (const [file, findings] of Object.entries(byFile)) {
    console.log(`\n📁 ${file}`);
    for (const finding of findings) {
      console.log(`   ⚠️  ${finding.key} (lines: ${finding.lines.join(', ')})`);
    }
  }
  
  console.log('\n');
  console.log('These secrets must NOT be accessed in client-facing code.');
  console.log('Options to fix:');
  console.log('  1. Move the code to a server-only file (e.g., API route, server component)');
  console.log('  2. Use an API endpoint to fetch data server-side');
  console.log('  3. If false positive, add to .secret-scan-ignore with reason');
  console.log('\n');
  
  process.exit(1);
}

main();
