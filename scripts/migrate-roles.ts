#!/usr/bin/env tsx
/**
 * Role Migration Script
 * 
 * Migrates users from 8-role system to 2-role system
 * 
 * Usage:
 *   pnpm tsx scripts/migrate-roles.ts [--dry-run] [--verify] [--rollback]
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase credentials');
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function dryRun() {
  console.log('🔍 Dry run: Analyzing current roles...\n');

  const { data: users, error } = await supabase
    .from('user_profiles')
    .select('id, email, role')
    .not('role', 'is', null);

  if (error) {
    console.error('Failed to fetch users:', error);
    process.exit(1);
  }

  const roleCounts: Record<string, number> = {};
  const migrationPlan: Array<{
    userId: string;
    email: string;
    oldRole: string;
    newRole: string;
  }> = [];

  users?.forEach((user) => {
    const oldRole = user.role as string;
    roleCounts[oldRole] = (roleCounts[oldRole] || 0) + 1;

    let newRole: string;
    switch (oldRole) {
      case 'SYSTEM_ADMIN':
        newRole = 'SYSTEM_ADMIN';
        break;
      case 'PARTNER':
      case 'MANAGER':
      case 'EMPLOYEE':
        newRole = 'STAFF';
        break;
      case 'CLIENT':
      case 'READONLY':
      case 'SERVICE_ACCOUNT':
      case 'EQR':
        newRole = 'STAFF';
        break;
      default:
        newRole = 'STAFF';
    }

    migrationPlan.push({
      userId: user.id,
      email: user.email,
      oldRole,
      newRole,
    });
  });

  console.log('Current role distribution:');
  Object.entries(roleCounts).forEach(([role, count]) => {
    console.log(`  ${role}: ${count}`);
  });

  console.log('\nMigration plan:');
  const newRoleCounts: Record<string, number> = {};
  migrationPlan.forEach((plan) => {
    newRoleCounts[plan.newRole] = (newRoleCounts[plan.newRole] || 0) + 1;
  });
  Object.entries(newRoleCounts).forEach(([role, count]) => {
    console.log(`  ${role}: ${count}`);
  });

  console.log('\n⚠️  Users that need review:');
  migrationPlan
    .filter((p) => ['CLIENT', 'SERVICE_ACCOUNT'].includes(p.oldRole))
    .forEach((p) => {
      console.log(`  ${p.email} (${p.oldRole} → ${p.newRole})`);
    });

  console.log('\n✅ Dry run complete. No changes made.');
}

async function executeMigration() {
  console.log('🚀 Executing role migration...\n');

  const { data, error } = await supabase.rpc('migrate_user_roles_to_2_role_system_with_log');

  if (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }

  console.log(`✅ Migrated ${data?.length || 0} users`);

  // Show summary
  const summary: Record<string, number> = {};
  data?.forEach((row: any) => {
    summary[row.migration_status] = (summary[row.migration_status] || 0) + 1;
  });

  console.log('\nMigration summary:');
  Object.entries(summary).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`);
  });
}

async function verify() {
  console.log('🔍 Verifying migration...\n');

  const { data, error } = await supabase.rpc('verify_role_migration');

  if (error) {
    console.error('Verification failed:', error);
    process.exit(1);
  }

  const result = data?.[0];
  if (!result) {
    console.error('No verification data returned');
    process.exit(1);
  }

  console.log('Migration verification:');
  console.log(`  Total users: ${result.total_users}`);
  console.log(`  SYSTEM_ADMIN: ${result.system_admin_count}`);
  console.log(`  STAFF: ${result.staff_count}`);
  console.log(`  Invalid roles: ${result.invalid_roles}`);

  if (result.invalid_roles > 0) {
    console.error('\n❌ Migration has issues!');
    result.migration_issues?.forEach((issue: string) => {
      console.error(`  - ${issue}`);
    });
    process.exit(1);
  }

  if (result.migration_issues && result.migration_issues.length > 0) {
    console.warn('\n⚠️  Warnings:');
    result.migration_issues.forEach((issue: string) => {
      console.warn(`  - ${issue}`);
    });
  } else {
    console.log('\n✅ Migration verified successfully!');
  }
}

async function rollback() {
  console.log('⏪ Rolling back migration...\n');

  const { data, error } = await supabase.rpc('rollback_role_migration');

  if (error) {
    console.error('Rollback failed:', error);
    process.exit(1);
  }

  const restoredCount = data as number;
  console.log(`✅ Restored ${restoredCount} users to original roles`);
}

// Main
const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case '--dry-run':
    dryRun();
    break;
  case '--verify':
    verify();
    break;
  case '--rollback':
    rollback();
    break;
  case '--execute':
    executeMigration();
    break;
  default:
    console.log('Role Migration Script');
    console.log('\nUsage:');
    console.log('  pnpm tsx scripts/migrate-roles.ts --dry-run    # Analyze without changes');
    console.log('  pnpm tsx scripts/migrate-roles.ts --execute    # Execute migration');
    console.log('  pnpm tsx scripts/migrate-roles.ts --verify     # Verify migration');
    console.log('  pnpm tsx scripts/migrate-roles.ts --rollback  # Rollback migration');
    process.exit(1);
}

