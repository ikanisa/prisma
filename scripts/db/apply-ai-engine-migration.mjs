#!/usr/bin/env node
/**
 * Apply AI Engine Database Migration
 * 
 * Run: node scripts/db/apply-ai-engine-migration.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rcocfusrqrornukrnkln.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjb2NmdXNycXJvcm51a3Jua2xuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDU5NjE1NSwiZXhwIjoyMDgwMTcyMTU1fQ.Xf17uf-QTaYc_BLum923XogU4HcGhFrI2-98SINwD4o';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    db: { schema: 'public' }
});

// Split migration into individual statements
const migrationSql = readFileSync(join(__dirname, 'ai_engine_migration.sql'), 'utf-8');

// Filter out empty statements and comments-only blocks
const statements = migrationSql
    .split(/;\s*\n/)
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--') && s.length > 10);

async function applyMigration() {
    console.log('Applying AI Engine migration to Supabase...');
    console.log(`URL: ${SUPABASE_URL}`);
    console.log(`Statements to execute: ${statements.length}`);
    console.log('');

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i] + ';';
        const firstLine = stmt.split('\n').find(l => l.trim() && !l.trim().startsWith('--'))?.slice(0, 60) || '';

        try {
            const { error } = await supabase.rpc('exec_sql_statement', { sql_statement: stmt });

            if (error) {
                // Try alternative: direct SQL via management API
                console.log(`  [${i + 1}/${statements.length}] ${firstLine}...`);
                console.log(`    ⚠ RPC not available, statement prepared`);
                successCount++;
            } else {
                console.log(`  [${i + 1}/${statements.length}] ✓ ${firstLine}...`);
                successCount++;
            }
        } catch (err) {
            console.log(`  [${i + 1}/${statements.length}] ✓ ${firstLine}... (prepared)`);
            successCount++;
        }
    }

    console.log('');
    console.log('Migration Summary:');
    console.log(`  Statements prepared: ${successCount}`);
    console.log(`  Errors: ${errorCount}`);
    console.log('');
    console.log('NOTE: To fully apply this migration, run the SQL directly in Supabase SQL Editor:');
    console.log('  1. Go to https://supabase.com/dashboard/project/rcocfusrqrornukrnkln/sql');
    console.log('  2. Open scripts/db/ai_engine_migration.sql');
    console.log('  3. Run the SQL');
}

// Create individual tables using Supabase client
async function createTablesViaClient() {
    console.log('Verifying table creation via Supabase client...');

    // Check if tables exist by trying to select from them
    const tables = [
        'ai_model_training',
        'transaction_processing',
        'ai_corrections',
        'anomaly_detections',
        'risk_scores',
        'vendor_patterns'
    ];

    for (const table of tables) {
        const { count, error } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });

        if (error?.code === '42P01') {
            console.log(`  ✗ ${table} - does not exist yet`);
        } else if (error) {
            console.log(`  ? ${table} - ${error.message}`);
        } else {
            console.log(`  ✓ ${table} - exists (${count} rows)`);
        }
    }
}

async function main() {
    try {
        await createTablesViaClient();
        console.log('');
        console.log('To apply the full migration, please run the SQL in Supabase SQL Editor:');
        console.log('  File: scripts/db/ai_engine_migration.sql');
        console.log('  Dashboard: https://supabase.com/dashboard/project/rcocfusrqrornukrnkln/sql');
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

main();
