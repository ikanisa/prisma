#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

console.log('🚀 Prisma Glow Setup for Cloudflare Pages + Supabase');
console.log('============================================');

// Step 1: Clean existing files
console.log('\n📦 Step 1: Cleaning provider-specific files...');
const filesToRemove = [
  'vercel.json',
  '.vercelignore',
  'wrangler.toml',
  'cloudflare.json',
  '_worker.js',
  'middleware.ts',
  'middleware.js',
];

filesToRemove.forEach(file => {
  const filePath = path.join(rootDir, file);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log(`  ✅ Removed ${file}`);
  }
});

// Step 2: Remove provider packages
console.log('\n📦 Step 2: Removing provider packages...');
try {
  execSync('pnpm remove @vercel/analytics @vercel/edge @vercel/kv @vercel/og @vercel/postgres @vercel/speed-insights @cloudflare/workers-types wrangler miniflare @upstash/redis @upstash/ratelimit --recursive', {
    cwd: rootDir,
    stdio: 'inherit'
  });
} catch (e) {
  console.log('  ⚠️  Some packages may not exist, continuing...');
}

// Step 3: Install dependencies
console.log('\n📦 Step 3: Installing dependencies...');
execSync('pnpm install', {
  cwd: rootDir,
  stdio: 'inherit'
});

// Step 4: Create required directories
console.log('\n📁 Step 4: Creating directory structure...');
const dirs = [
  'apps/client',
  'apps/admin',
  'packages/supabase-client',
  'packages/database',
  'packages/ui',
  'packages/types',
  'supabase/functions/api',
  'supabase/migrations',
  'dist',
];

dirs.forEach(dir => {
  const dirPath = path.join(rootDir, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`  ✅ Created ${dir}`);
  }
});

// Step 5: Copy environment template
console.log('\n🔐 Step 5: Setting up environment...');
const envExamplePath = path.join(rootDir, '.env.example');
const envLocalPath = path.join(rootDir, '.env.local');
if (fs.existsSync(envExamplePath) && !fs.existsSync(envLocalPath)) {
  fs.copyFileSync(envExamplePath, envLocalPath);
  console.log('  ✅ Created .env.local from template');
}

// Step 6: Build check
console.log('\n🏗️  Step 6: Running build check...');
execSync('pnpm typecheck', {
  cwd: rootDir,
  stdio: 'inherit'
});

console.log('\n✅ Setup complete!');
console.log('\n📋 Next steps:');
console.log('  1. Configure your .env.local with Supabase credentials');
console.log('  2. Run: pnpm dev to start development');
console.log('  3. Run: pnpm build to build for production');
console.log('  4. Deploy to Cloudflare Pages!');
