/**
 * Domain Rule Manager
 * 
 * Interactive CLI tool to manage domain classification rules
 * 
 * Usage:
 *   pnpm tsx scripts/manage-domain-rules.ts [add|list|test|export]
 */

import { getDomainRules, addDomainRule, classifyByHeuristic } from '../services/rag/knowledge/classification';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function addNewRule() {
  console.log('\n📝 Add New Domain Rule');
  console.log('======================\n');

  const domain = await question('Domain (e.g., example.com): ');
  const category = await question('Category (e.g., TAX, IFRS, ISA): ');
  const jurisdictionCode = await question('Jurisdiction Code (e.g., RW, MT, GLOBAL): ');
  const tagsInput = await question('Tags (comma-separated): ');
  const tags = tagsInput.split(',').map((t) => t.trim()).filter(Boolean);
  
  const sourceType = await question(
    'Source Type (ifrs_foundation, tax_authority, big_four, etc.): '
  );
  const verificationLevel = await question(
    'Verification Level (primary, secondary, tertiary): '
  ) as 'primary' | 'secondary' | 'tertiary';
  const sourcePriority = await question(
    'Source Priority (authoritative, regulatory, interpretive, supplementary): '
  ) as 'authoritative' | 'regulatory' | 'interpretive' | 'supplementary';

  console.log('\n📋 Review:');
  console.log(`   Domain: ${domain}`);
  console.log(`   Category: ${category}`);
  console.log(`   Jurisdiction: ${jurisdictionCode}`);
  console.log(`   Tags: ${tags.join(', ')}`);
  console.log(`   Source Type: ${sourceType}`);
  console.log(`   Verification: ${verificationLevel}`);
  console.log(`   Priority: ${sourcePriority}`);

  const confirm = await question('\nAdd this rule? (yes/no): ');

  if (confirm.toLowerCase() === 'yes' || confirm.toLowerCase() === 'y') {
    addDomainRule({
      domain,
      category,
      jurisdictionCode,
      tags,
      sourceType,
      verificationLevel,
      sourcePriority,
    });
    console.log('✅ Rule added successfully!\n');
    
    // Show TypeScript code to persist
    console.log('💡 To persist this rule, add to heuristic.ts:');
    console.log('```typescript');
    console.log(`{`);
    console.log(`  domain: "${domain}",`);
    console.log(`  category: "${category}",`);
    console.log(`  jurisdictionCode: "${jurisdictionCode}",`);
    console.log(`  tags: [${tags.map(t => `"${t}"`).join(', ')}],`);
    console.log(`  sourceType: "${sourceType}",`);
    console.log(`  verificationLevel: "${verificationLevel}",`);
    console.log(`  sourcePriority: "${sourcePriority}",`);
    console.log(`},`);
    console.log('```\n');
  } else {
    console.log('❌ Rule not added.\n');
  }
}

function listRules() {
  const rules = getDomainRules();
  
  console.log(`\n📚 Domain Rules (${rules.length} total)`);
  console.log('======================\n');

  // Group by category
  const byCategory = rules.reduce((acc, rule) => {
    if (!acc[rule.category]) acc[rule.category] = [];
    acc[rule.category].push(rule);
    return acc;
  }, {} as Record<string, typeof rules>);

  Object.entries(byCategory)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([category, categoryRules]) => {
      console.log(`\n${category} (${categoryRules.length})`);
      categoryRules.forEach((rule) => {
        console.log(`  • ${rule.domain} → ${rule.jurisdictionCode}`);
      });
    });

  console.log();
}

async function testClassification() {
  console.log('\n🧪 Test Classification');
  console.log('======================\n');

  const url = await question('Enter URL to test: ');

  const result = classifyByHeuristic(url);

  console.log('\n📊 Classification Result:');
  console.log(`   Category: ${result.category}`);
  console.log(`   Jurisdiction: ${result.jurisdictionCode}`);
  console.log(`   Tags: ${result.tags.join(', ') || 'none'}`);
  console.log(`   Confidence: ${result.confidence}%`);
  console.log(`   Source: ${result.source}`);
  console.log(`   Source Type: ${result.sourceType || 'N/A'}`);
  console.log(`   Verification: ${result.verificationLevel || 'N/A'}`);
  console.log(`   Priority: ${result.sourcePriority || 'N/A'}`);
  console.log();
}

function exportRules() {
  const rules = getDomainRules();
  
  console.log('\n📤 Export Rules');
  console.log('===============\n');

  const json = JSON.stringify(rules, null, 2);
  console.log(json);
  console.log(`\n✅ ${rules.length} rules exported to JSON\n`);
}

async function main() {
  const command = process.argv[2];

  console.log('🔧 Domain Rule Manager');
  console.log('======================\n');

  switch (command) {
    case 'add':
      await addNewRule();
      break;
    case 'list':
      listRules();
      break;
    case 'test':
      await testClassification();
      break;
    case 'export':
      exportRules();
      break;
    default:
      console.log('Usage: pnpm tsx scripts/manage-domain-rules.ts [command]');
      console.log('\nCommands:');
      console.log('  add     - Add a new domain rule');
      console.log('  list    - List all domain rules');
      console.log('  test    - Test classification for a URL');
      console.log('  export  - Export rules to JSON');
      console.log();
  }

  rl.close();
}

main().catch((err) => {
  console.error('Error:', err);
  rl.close();
  process.exit(1);
});
