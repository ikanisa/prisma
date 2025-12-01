/**
 * Bulk Classification Utility Script
 * 
 * Use this to classify existing web sources in your database
 * that were added before the auto-classification system was implemented.
 * 
 * Usage:
 *   pnpm tsx scripts/classify-existing-sources.ts [--dry-run] [--force-llm]
 */

import { createClient } from '@supabase/supabase-js';
import { classifyWebSource } from '../services/rag/knowledge/classification';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface SourceToClassify {
  id: string;
  name: string;
  base_url: string;
  description?: string;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const forceLLM = args.includes('--force-llm');
  const heuristicOnly = args.includes('--heuristic-only');

  console.log('🚀 Bulk Classification Utility');
  console.log('===============================');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`LLM: ${forceLLM ? 'FORCED' : heuristicOnly ? 'DISABLED' : 'AUTO'}`);
  console.log();

  // Fetch unclassified sources
  console.log('📊 Fetching unclassified sources...');
  
  const { data: sources, error } = await supabase
    .from('deep_search_sources')
    .select('id, name, base_url, description')
    .or('auto_classified.is.null,auto_classified.eq.false')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching sources:', error);
    process.exit(1);
  }

  if (!sources || sources.length === 0) {
    console.log('✅ No unclassified sources found. All done!');
    return;
  }

  console.log(`Found ${sources.length} unclassified source(s)\n`);

  // Classify each source
  let successCount = 0;
  let failureCount = 0;
  const results: Array<{
    id: string;
    name: string;
    url: string;
    category?: string;
    confidence?: number;
    source?: string;
    error?: string;
  }> = [];

  for (let i = 0; i < sources.length; i++) {
    const source = sources[i] as SourceToClassify;
    const progress = `[${i + 1}/${sources.length}]`;

    console.log(`${progress} Classifying: ${source.name}`);
    console.log(`           URL: ${source.base_url}`);

    try {
      const classification = await classifyWebSource(
        {
          url: source.base_url,
          pageTitle: source.name,
          pageSnippet: source.description,
        },
        {
          forceLLM,
          heuristicOnly,
        }
      );

      console.log(`           ✓ Category: ${classification.category}`);
      console.log(`           ✓ Jurisdiction: ${classification.jurisdictionCode}`);
      console.log(`           ✓ Confidence: ${classification.confidence}%`);
      console.log(`           ✓ Source: ${classification.source}`);

      if (!dryRun) {
        // Update database
        const { error: updateError } = await supabase
          .from('deep_search_sources')
          .update({
            source_type: classification.sourceType,
            verification_level: classification.verificationLevel,
            source_priority: classification.sourcePriority,
            jurisdictions: classification.jurisdictionCode
              ? [classification.jurisdictionCode]
              : [],
            domains: classification.category
              ? [classification.category.toLowerCase()]
              : [],
            auto_classified: true,
            classification_confidence: classification.confidence,
            classification_source: classification.source,
            updated_at: new Date().toISOString(),
          })
          .eq('id', source.id);

        if (updateError) {
          console.log(`           ✗ Database update failed: ${updateError.message}`);
          failureCount++;
        } else {
          console.log(`           ✓ Database updated`);
          successCount++;
        }
      } else {
        successCount++;
      }

      results.push({
        id: source.id,
        name: source.name,
        url: source.base_url,
        category: classification.category,
        confidence: classification.confidence,
        source: classification.source,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.log(`           ✗ Classification failed: ${errorMsg}`);
      failureCount++;

      results.push({
        id: source.id,
        name: source.name,
        url: source.base_url,
        error: errorMsg,
      });
    }

    console.log();
  }

  // Summary
  console.log('===============================');
  console.log('📈 Summary');
  console.log('===============================');
  console.log(`Total sources: ${sources.length}`);
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failureCount}`);
  console.log();

  // Show low-confidence classifications
  const lowConfidence = results.filter(
    (r) => r.confidence !== undefined && r.confidence < 50
  );

  if (lowConfidence.length > 0) {
    console.log('⚠️  Low Confidence Classifications (review recommended):');
    lowConfidence.forEach((r) => {
      console.log(`   - ${r.name}: ${r.confidence}% (${r.source})`);
    });
    console.log();
  }

  // Show unknown categories
  const unknown = results.filter((r) => r.category === 'UNKNOWN');

  if (unknown.length > 0) {
    console.log('❓ Unknown Categories (add domain rules or use LLM):');
    unknown.forEach((r) => {
      console.log(`   - ${r.name}: ${r.url}`);
    });
    console.log();
  }

  // Show errors
  if (failureCount > 0) {
    console.log('❌ Errors:');
    results
      .filter((r) => r.error)
      .forEach((r) => {
        console.log(`   - ${r.name}: ${r.error}`);
      });
    console.log();
  }

  if (dryRun) {
    console.log('💡 This was a DRY RUN. No changes were made to the database.');
    console.log('   Run without --dry-run to apply classifications.');
  } else {
    console.log('✅ Classification complete!');
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
