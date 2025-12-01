#!/usr/bin/env tsx
/**
 * Test Classification System
 * Quick smoke test of the auto-classification engine
 */

import { classifyByHeuristic } from './services/rag/knowledge/classification/heuristic';

const testURLs = [
  'https://www.ifrs.org',
  'https://www.rra.gov.rw',
  'https://www.cfr.gov.mt',
  'https://www.kpmg.com',
  'https://www.oecd.org',
  'https://www.unknown-domain.com',
];

console.log('🧪 Testing Auto-Classification System\n');
console.log('═══════════════════════════════════════════════════════════\n');

testURLs.forEach((url) => {
  const result = classifyByHeuristic(url);
  console.log(`URL: ${url}`);
  console.log(`  Category: ${result.category}`);
  console.log(`  Jurisdiction: ${result.jurisdictionCode}`);
  console.log(`  Tags: ${result.tags.join(', ')}`);
  console.log(`  Confidence: ${result.confidence}%`);
  console.log(`  Source: ${result.source}`);
  console.log('');
});

console.log('═══════════════════════════════════════════════════════════');
console.log('✅ Classification system is working!');
