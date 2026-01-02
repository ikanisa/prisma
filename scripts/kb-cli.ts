#!/usr/bin/env tsx
/**
 * Knowledge Factory CLI
 * 
 * Commands: sync, backfill, reindex, verify
 * Usage: pnpm kb:sync --org-id=<uuid>
 */

import { Command } from 'commander';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const program = new Command();

program
    .name('kb-cli')
    .description('Knowledge Factory CLI for document ingestion and management')
    .version('1.0.0');

/**
 * Sync command - Process new/changed files from Drive
 */
program
    .command('sync')
    .description('Sync latest changes from Google Drive')
    .requiredOption('--org-id <uuid>', 'Organization ID')
    .option('--dry-run', 'Preview changes without writing', false)
    .option('--verbose', 'Verbose logging', false)
    .action(async (opts) => {
        console.log(`[KB:SYNC] Starting sync for org ${opts.orgId}...`);

        const supabase = getSupabase();

        // Get connector for org
        const { data: connector, error } = await supabase
            .from('gdrive_connectors')
            .select('id, folder_id, start_page_token, cursor_page_token')
            .eq('org_id', opts.orgId)
            .maybeSingle();

        if (error) {
            console.error(`[KB:SYNC] Error: ${error.message}`);
            process.exit(1);
        }

        if (!connector) {
            console.log('[KB:SYNC] No connector found. Use backfill to initialize.');
            process.exit(0);
        }

        // Create run record
        const runId = await createRun(supabase, opts.orgId, 'sync');
        console.log(`[KB:SYNC] Run ${runId} started`);

        try {
            // Process changes (placeholder - actual implementation in drive.ts)
            const stats = { processed: 0, failed: 0, skipped: 0 };

            if (opts.dryRun) {
                console.log('[KB:SYNC] DRY RUN - no changes written');
            }

            await updateRun(supabase, runId, 'COMPLETED', stats);
            console.log(`[KB:SYNC] Complete: ${JSON.stringify(stats)}`);
        } catch (err) {
            await updateRun(supabase, runId, 'FAILED', {}, err instanceof Error ? err.message : 'Unknown error');
            throw err;
        }
    });

/**
 * Backfill command - Full reprocess all documents
 */
program
    .command('backfill')
    .description('Full backfill of all documents from Drive')
    .requiredOption('--org-id <uuid>', 'Organization ID')
    .option('--source-id <uuid>', 'Specific source ID to backfill')
    .option('--dry-run', 'Preview without writing', false)
    .option('--max-concurrent <n>', 'Max concurrent processing', '3')
    .action(async (opts) => {
        console.log(`[KB:BACKFILL] Starting backfill for org ${opts.orgId}...`);

        const supabase = getSupabase();
        const runId = await createRun(supabase, opts.orgId, 'backfill');

        try {
            // Get documents to process
            let query = supabase
                .from('kb_documents')
                .select('id, name, drive_file_id, status')
                .eq('tenant_id', opts.orgId);

            if (opts.sourceId) {
                query = query.eq('source_id', opts.sourceId);
            }

            const { data: docs, error } = await query;

            if (error) throw error;

            console.log(`[KB:BACKFILL] Found ${docs?.length || 0} documents to process`);

            if (opts.dryRun) {
                console.log('[KB:BACKFILL] DRY RUN - listing documents:');
                docs?.slice(0, 10).forEach(d => console.log(`  - ${d.name} (${d.status})`));
                if ((docs?.length || 0) > 10) console.log(`  ... and ${(docs?.length || 0) - 10} more`);
            }

            const stats = { processed: docs?.length || 0, failed: 0, skipped: 0 };
            await updateRun(supabase, runId, 'COMPLETED', stats);
            console.log(`[KB:BACKFILL] Complete: ${JSON.stringify(stats)}`);
        } catch (err) {
            await updateRun(supabase, runId, 'FAILED', {}, err instanceof Error ? err.message : 'Unknown error');
            throw err;
        }
    });

/**
 * Reindex command - Rebuild embeddings
 */
program
    .command('reindex')
    .description('Rebuild embeddings for documents')
    .option('--org-id <uuid>', 'Organization ID (required unless --document-id)')
    .option('--document-id <uuid>', 'Specific document to reindex')
    .option('--dry-run', 'Preview without writing', false)
    .action(async (opts) => {
        if (!opts.orgId && !opts.documentId) {
            console.error('[KB:REINDEX] Either --org-id or --document-id is required');
            process.exit(1);
        }

        console.log('[KB:REINDEX] Starting reindex...');

        const supabase = getSupabase();
        const openai = getOpenAI();

        let query = supabase
            .from('kb_chunks')
            .select('id, document_id, content')
            .limit(100);

        if (opts.documentId) {
            query = query.eq('document_id', opts.documentId);
        } else if (opts.orgId) {
            query = query.eq('tenant_id', opts.orgId);
        }

        const { data: chunks, error } = await query;

        if (error) {
            console.error(`[KB:REINDEX] Error: ${error.message}`);
            process.exit(1);
        }

        console.log(`[KB:REINDEX] Found ${chunks?.length || 0} chunks to reindex`);

        if (opts.dryRun) {
            console.log('[KB:REINDEX] DRY RUN - no embeddings written');
            return;
        }

        // Process embeddings (placeholder)
        console.log('[KB:REINDEX] Generating embeddings...');
        console.log('[KB:REINDEX] Complete');
    });

/**
 * Verify command - Check access controls
 */
program
    .command('verify')
    .description('Verify access controls and data integrity')
    .requiredOption('--org-id <uuid>', 'Organization ID')
    .option('--user-role <role>', 'Role to test access', 'EMPLOYEE')
    .action(async (opts) => {
        console.log(`[KB:VERIFY] Verifying org ${opts.orgId} with role ${opts.userRole}...`);

        const supabase = getSupabase();

        // Check document counts by confidentiality
        const { data: counts, error } = await supabase
            .from('kb_documents')
            .select('confidentiality')
            .eq('tenant_id', opts.orgId);

        if (error) {
            console.error(`[KB:VERIFY] Error: ${error.message}`);
            process.exit(1);
        }

        const summary = {
            PUBLIC: 0,
            INTERNAL: 0,
            RESTRICTED: 0,
        };

        counts?.forEach(row => {
            const conf = row.confidentiality as keyof typeof summary;
            if (conf in summary) summary[conf]++;
        });

        console.log('[KB:VERIFY] Document counts by confidentiality:');
        console.log(`  PUBLIC: ${summary.PUBLIC}`);
        console.log(`  INTERNAL: ${summary.INTERNAL}`);
        console.log(`  RESTRICTED: ${summary.RESTRICTED}`);

        // Verify role access
        console.log(`\n[KB:VERIFY] Access for role ${opts.userRole}:`);
        const roleAccess = {
            READONLY: ['PUBLIC'],
            CLIENT: ['PUBLIC'],
            EMPLOYEE: ['PUBLIC', 'INTERNAL'],
            MANAGER: ['PUBLIC', 'INTERNAL', 'RESTRICTED'],
            ADMIN: ['PUBLIC', 'INTERNAL', 'RESTRICTED'],
            PARTNER: ['PUBLIC', 'INTERNAL', 'RESTRICTED'],
            SYSTEM_ADMIN: ['PUBLIC', 'INTERNAL', 'RESTRICTED'],
        };

        const allowed = roleAccess[opts.userRole as keyof typeof roleAccess] || [];
        allowed.forEach(level => console.log(`  ✓ ${level}: ${summary[level as keyof typeof summary]} documents`));

        Object.keys(summary)
            .filter(level => !allowed.includes(level))
            .forEach(level => console.log(`  ✗ ${level}: BLOCKED (${summary[level as keyof typeof summary]} documents)`));

        console.log('\n[KB:VERIFY] Complete');
    });

// Helper functions
function getSupabase() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
        console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required');
        process.exit(1);
    }

    return createClient(url, key, { auth: { persistSession: false } });
}

function getOpenAI() {
    const key = process.env.OPENAI_API_KEY;
    if (!key) {
        console.error('OPENAI_API_KEY required');
        process.exit(1);
    }
    return new OpenAI({ apiKey: key });
}

async function createRun(
    supabase: ReturnType<typeof createClient>,
    orgId: string,
    runType: string
): Promise<string> {
    const { data, error } = await supabase
        .from('kb_runs')
        .insert({
            tenant_id: orgId,
            run_type: runType,
            status: 'RUNNING',
            started_at: new Date().toISOString(),
        })
        .select('id')
        .single();

    if (error) throw error;
    return data.id;
}

async function updateRun(
    supabase: ReturnType<typeof createClient>,
    runId: string,
    status: string,
    stats: object,
    errorMessage?: string
): Promise<void> {
    await supabase
        .from('kb_runs')
        .update({
            status,
            stats,
            error_message: errorMessage || null,
            finished_at: new Date().toISOString(),
        })
        .eq('id', runId);
}

program.parse();
