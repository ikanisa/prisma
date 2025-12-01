/**
 * Classification Report Generator
 * 
 * Generates a detailed report of all classified sources
 * Useful for auditing and monitoring classification quality
 * 
 * Usage:
 *   pnpm tsx scripts/generate-classification-report.ts [--format json|csv|markdown]
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface ClassifiedSource {
  id: string;
  name: string;
  base_url: string;
  source_type: string;
  verification_level: string;
  jurisdictions: string[];
  domains: string[];
  auto_classified: boolean;
  classification_confidence: number;
  classification_source: string;
  created_at: string;
}

async function fetchAllSources(): Promise<ClassifiedSource[]> {
  const { data, error } = await supabase
    .from('deep_search_sources')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch sources: ${error.message}`);
  }

  return data as ClassifiedSource[];
}

function generateMarkdownReport(sources: ClassifiedSource[]): string {
  const total = sources.length;
  const autoClassified = sources.filter((s) => s.auto_classified).length;
  const manual = total - autoClassified;
  
  const bySource = sources.reduce((acc, s) => {
    const source = s.classification_source || 'MANUAL';
    acc[source] = (acc[source] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const byVerification = sources.reduce((acc, s) => {
    const level = s.verification_level || 'unknown';
    acc[level] = (acc[level] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const avgConfidence =
    sources.filter((s) => s.classification_confidence).reduce(
      (sum, s) => sum + (s.classification_confidence || 0),
      0
    ) / sources.filter((s) => s.classification_confidence).length || 0;

  let md = '# Web Source Classification Report\n\n';
  md += `Generated: ${new Date().toISOString()}\n\n`;
  md += '## Summary\n\n';
  md += `- **Total Sources**: ${total}\n`;
  md += `- **Auto-Classified**: ${autoClassified} (${((autoClassified / total) * 100).toFixed(1)}%)\n`;
  md += `- **Manual**: ${manual} (${((manual / total) * 100).toFixed(1)}%)\n`;
  md += `- **Average Confidence**: ${avgConfidence.toFixed(1)}%\n\n`;

  md += '## Classification Method\n\n';
  Object.entries(bySource).forEach(([source, count]) => {
    md += `- **${source}**: ${count} (${((count / total) * 100).toFixed(1)}%)\n`;
  });

  md += '\n## Verification Level\n\n';
  Object.entries(byVerification).forEach(([level, count]) => {
    md += `- **${level}**: ${count} (${((count / total) * 100).toFixed(1)}%)\n`;
  });

  md += '\n## Low Confidence Sources (<50%)\n\n';
  const lowConfidence = sources.filter(
    (s) => s.classification_confidence && s.classification_confidence < 50
  );
  
  if (lowConfidence.length > 0) {
    md += '| Name | URL | Confidence | Source |\n';
    md += '|------|-----|------------|--------|\n';
    lowConfidence.forEach((s) => {
      md += `| ${s.name} | ${s.base_url} | ${s.classification_confidence}% | ${s.classification_source} |\n`;
    });
  } else {
    md += '*No low-confidence sources found.*\n';
  }

  md += '\n## All Sources\n\n';
  md += '| Name | Type | Verification | Jurisdiction | Auto | Confidence | Source |\n';
  md += '|------|------|--------------|--------------|------|------------|--------|\n';
  
  sources.forEach((s) => {
    const auto = s.auto_classified ? '✅' : '❌';
    const conf = s.classification_confidence ? `${s.classification_confidence}%` : 'N/A';
    const source = s.classification_source || 'MANUAL';
    const jurisdiction = s.jurisdictions.join(', ') || 'N/A';
    
    md += `| ${s.name} | ${s.source_type || 'N/A'} | ${s.verification_level || 'N/A'} | ${jurisdiction} | ${auto} | ${conf} | ${source} |\n`;
  });

  return md;
}

function generateCSV(sources: ClassifiedSource[]): string {
  const header = 'ID,Name,URL,Type,Verification,Jurisdictions,Domains,Auto-Classified,Confidence,Source,Created\n';
  
  const rows = sources.map((s) => {
    const jurisdictions = s.jurisdictions.join(';') || '';
    const domains = s.domains.join(';') || '';
    const auto = s.auto_classified ? 'true' : 'false';
    const conf = s.classification_confidence || '';
    const source = s.classification_source || 'MANUAL';
    
    return `${s.id},"${s.name}","${s.base_url}","${s.source_type || ''}","${s.verification_level || ''}","${jurisdictions}","${domains}",${auto},${conf},${source},${s.created_at}`;
  });

  return header + rows.join('\n');
}

async function main() {
  const args = process.argv.slice(2);
  const format = args.find((a) => a.startsWith('--format='))?.split('=')[1] || 'markdown';

  console.log('📊 Generating Classification Report...\n');

  const sources = await fetchAllSources();
  console.log(`✅ Fetched ${sources.length} sources\n`);

  let output: string;
  let filename: string;

  switch (format) {
    case 'json':
      output = JSON.stringify(sources, null, 2);
      filename = `classification-report-${Date.now()}.json`;
      break;
    case 'csv':
      output = generateCSV(sources);
      filename = `classification-report-${Date.now()}.csv`;
      break;
    case 'markdown':
    default:
      output = generateMarkdownReport(sources);
      filename = `classification-report-${Date.now()}.md`;
      break;
  }

  fs.writeFileSync(filename, output);
  console.log(`✅ Report generated: ${filename}\n`);
  console.log(`Format: ${format}`);
  console.log(`Size: ${(output.length / 1024).toFixed(2)} KB\n`);

  // Also output to console for markdown
  if (format === 'markdown') {
    console.log('Preview:\n');
    console.log(output.split('\n').slice(0, 30).join('\n'));
    console.log('\n... (see full report in file)\n');
  }
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
