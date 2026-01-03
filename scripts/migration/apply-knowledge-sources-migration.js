#!/usr/bin/env node
/**
 * Apply knowledge_web_sources migration
 * 
 * This script reads the SQL migration file and applies it directly
 * to the Supabase database using the client library.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Read environment variables or use defaults
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: Missing Supabase credentials');
  console.error('   Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables');
  console.error('');
  console.error('   Or create a .env.local file with:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co');
  console.error('   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function applyMigration() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  Applying knowledge_web_sources Migration                   ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  
  try {
    // Read migration file
    const migrationPath = join(__dirname, '../supabase/migrations/20251201_knowledge_web_sources_200_urls.sql');
    console.log(`📄 Reading migration file: ${migrationPath}`);
    const sql = readFileSync(migrationPath, 'utf8');
    
    console.log(`📊 Migration size: ${(sql.length / 1024).toFixed(2)}KB`);
    console.log('');
    
    // Apply migration using RPC
    console.log('🚀 Applying migration...');
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      throw error;
    }
    
    console.log('✅ Migration applied successfully!');
    console.log('');
    
    // Verify installation
    console.log('🔍 Verifying installation...');
    const { count, error: countError } = await supabase
      .from('knowledge_web_sources')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.log('⚠️  Could not verify row count:', countError.message);
    } else {
      console.log(`✅ Table exists with ${count} rows`);
    }
    
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ MIGRATION COMPLETE                                       ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Verify: SELECT COUNT(*) FROM knowledge_web_sources;');
    console.log('  2. Test: import { getActiveDomains } from "@/packages/lib/src/knowledge-web-sources"');
    console.log('  3. Integrate with DeepSearch, Admin Panel, and Crawler');
    console.log('');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('');
    console.error('Troubleshooting:');
    console.error('  1. Check your Supabase credentials');
    console.error('  2. Ensure you have service_role access');
    console.error('  3. Try applying via Supabase Studio SQL Editor');
    console.error('');
    process.exit(1);
  }
}

applyMigration();
