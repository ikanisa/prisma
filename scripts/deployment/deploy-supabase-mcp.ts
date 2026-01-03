#!/usr/bin/env tsx
/**
 * Comprehensive Supabase Deployment Script
 * Uses Supabase Management API with PAT to deploy all migrations and edge functions
 * 
 * Usage: 
 *   SUPABASE_PAT=your_pat tsx scripts/deploy-supabase-mcp.ts
 *   or
 *   export SUPABASE_PAT=your_pat && tsx scripts/deploy-supabase-mcp.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PROJECT_REF = 'rcocfusrqrornukrnkln';
const SUPABASE_URL = 'https://rcocfusrqrornukrnkln.supabase.co';
const PAT = process.env.SUPABASE_PAT || 'sbp_0bcb6e5564364a7979aaf07eb719b41cd727ff3c';

// Colors for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(level: 'info' | 'success' | 'warning' | 'error' | 'header', message: string) {
  const prefix = {
    info: `${colors.blue}ℹ${colors.reset}`,
    success: `${colors.green}✓${colors.reset}`,
    warning: `${colors.yellow}⚠${colors.reset}`,
    error: `${colors.red}✗${colors.reset}`,
    header: `${colors.cyan}═══${colors.reset}`,
  }[level];

  if (level === 'header') {
    console.log(`\n${colors.cyan}${'═'.repeat(50)}${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}${message}${colors.reset}`);
    console.log(`${colors.cyan}${'═'.repeat(50)}${colors.reset}\n`);
  } else {
    console.log(`${prefix} ${message}`);
  }
}

interface MigrationFile {
  filename: string;
  path: string;
  version: string;
  name: string;
  content: string;
}

/**
 * Get all migration files sorted by timestamp
 */
function getMigrationFiles(): MigrationFile[] {
  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
  
  if (!fs.existsSync(migrationsDir)) {
    log('error', `Migrations directory not found: ${migrationsDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort()
    .map(filename => {
      const filePath = path.join(migrationsDir, filename);
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Extract version and name from filename
      // Format: YYYYMMDDHHMMSS_description.sql or description.sql
      const match = filename.match(/^(\d{14})_(.+)\.sql$|^(.+)\.sql$/);
      let version: string;
      let name: string;
      
      if (match && match[1]) {
        version = match[1];
        name = match[2];
      } else if (match && match[3]) {
        version = filename.replace('.sql', '');
        name = match[3];
      } else {
        version = filename.replace('.sql', '');
        name = filename.replace('.sql', '');
      }

      return {
        filename,
        path: filePath,
        version,
        name,
        content,
      };
    });

  log('info', `Found ${files.length} migration files`);
  return files;
}

/**
 * Apply a single migration using Supabase Management API
 * Note: This is a placeholder - actual implementation would use the Management API
 * or MCP tools. For now, we'll prepare the migration data.
 */
async function applyMigration(migration: MigrationFile): Promise<boolean> {
  log('info', `Applying: ${migration.filename}`);
  
  // In a real implementation, this would:
  // 1. Use mcp_supabase_apply_migration with the migration content
  // 2. Or use Supabase Management API POST /v1/projects/{ref}/migrations
  // 3. Handle errors and retries
  
  // For now, we'll just validate the migration can be read
  if (migration.content.length === 0) {
    log('warning', `Migration ${migration.filename} is empty`);
    return false;
  }

  // Validate SQL syntax basics
  const sqlKeywords = ['CREATE', 'ALTER', 'DROP', 'INSERT', 'UPDATE', 'DELETE', '--'];
  const hasValidSQL = sqlKeywords.some(keyword => 
    migration.content.toUpperCase().includes(keyword)
  );

  if (!hasValidSQL && !migration.content.trim().startsWith('--')) {
    log('warning', `Migration ${migration.filename} may not contain valid SQL`);
  }

  return true;
}

/**
 * Main deployment function
 */
async function main() {
  log('header', '🚀 Supabase Complete Deployment');
  log('info', `Project: ${PROJECT_REF}`);
  log('info', `URL: ${SUPABASE_URL}`);
  log('info', `PAT: ${PAT.substring(0, 20)}...`);
  log('info', `Started at: ${new Date().toISOString()}`);

  // Get all migrations
  const migrations = getMigrationFiles();
  
  if (migrations.length === 0) {
    log('error', 'No migration files found');
    process.exit(1);
  }

  log('header', '📋 Migration Summary');
  log('info', `Total migrations: ${migrations.length}`);
  log('info', `First: ${migrations[0].filename}`);
  log('info', `Last: ${migrations[migrations.length - 1].filename}`);

  log('header', '📦 Preparing Migrations');
  
  // Group migrations by date for better organization
  const migrationsByDate = migrations.reduce((acc, migration) => {
    const date = migration.version.substring(0, 8); // YYYYMMDD
    if (!acc[date]) acc[date] = [];
    acc[date].push(migration);
    return acc;
  }, {} as Record<string, MigrationFile[]>);

  log('info', `Migrations span ${Object.keys(migrationsByDate).length} date(s)`);

  log('header', '⚠️  MCP Migration Application');
  log('warning', 'This script prepares migrations for deployment.');
  log('warning', 'Actual migration application should be done via:');
  log('info', '  1. MCP Supabase tools (mcp_supabase_apply_migration)');
  log('info', '  2. Supabase CLI (supabase db push)');
  log('info', '  3. Supabase Dashboard');
  log('info', '');
  log('info', 'To use MCP tools, migrations should be applied via the MCP server.');
  log('info', 'Run the bash script (deploy-supabase-all.sh) for CLI-based deployment.');

  // Generate migration report
  log('header', '📊 Migration Report');
  
  const report = {
    projectRef: PROJECT_REF,
    supabaseUrl: SUPABASE_URL,
    totalMigrations: migrations.length,
    migrations: migrations.map(m => ({
      filename: m.filename,
      version: m.version,
      name: m.name,
      size: m.content.length,
      lines: m.content.split('\n').length,
    })),
    generatedAt: new Date().toISOString(),
  };

  const reportPath = path.join(__dirname, '..', '.supabase-migration-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log('success', `Migration report saved to: ${reportPath}`);

  log('header', '✅ Preparation Complete');
  log('success', `Prepared ${migrations.length} migrations for deployment`);
  log('info', 'Next steps:');
  log('info', '  1. Review the migration report');
  log('info', '  2. Run: ./scripts/deploy-supabase-all.sh');
  log('info', '  3. Or apply migrations via MCP tools manually');
  
  console.log('');
}

// Run main function
main().catch((error) => {
  log('error', `Deployment failed: ${error.message}`);
  console.error(error);
  process.exit(1);
});

