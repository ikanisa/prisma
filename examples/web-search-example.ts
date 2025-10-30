/**
 * Example script demonstrating web search functionality
 * 
 * This script shows various ways to use the web search module
 * from @prisma-glow/lib package.
 * 
 * Usage:
 *   ts-node examples/web-search-example.ts
 */

import { getOpenAIClient } from '@prisma-glow/lib/openai/client';
import {
  runWebSearch,
  createWebSearchTool,
  createUserLocation,
  normalizeDomain,
  type WebSearchUserLocation,
} from '@prisma-glow/lib/openai/web-search';

// Example 1: Basic web search
async function basicWebSearch() {
  console.log('=== Example 1: Basic Web Search ===\n');
  
  const client = getOpenAIClient();
  
  const results = await runWebSearch({
    client,
    query: 'What was a positive news story from today?',
    model: 'gpt-5',
  });
  
  console.log('Answer:', results.answer);
  console.log('Citations:', results.citations.length);
  console.log('Sources:', results.sources.length);
  console.log('\n');
}

// Example 2: Domain filtering for trusted sources
async function domainFilteredSearch() {
  console.log('=== Example 2: Domain Filtering ===\n');
  
  const client = getOpenAIClient();
  
  const results = await runWebSearch({
    client,
    query: 'Latest research on diabetes treatment',
    model: 'gpt-5',
    allowedDomains: [
      'pubmed.ncbi.nlm.nih.gov',
      'clinicaltrials.gov',
      'www.who.int',
      'www.cdc.gov',
    ],
    includeSources: true,
  });
  
  console.log('Answer:', results.answer.substring(0, 200) + '...');
  console.log('\nSources from trusted domains:');
  results.sources.forEach((source, i) => {
    console.log(`  ${i + 1}. ${source.title || 'Untitled'}`);
    console.log(`     ${source.url}`);
  });
  console.log('\n');
}

// Example 3: Geographic search with user location
async function geographicSearch() {
  console.log('=== Example 3: Geographic Search ===\n');
  
  const client = getOpenAIClient();
  
  const location: WebSearchUserLocation = {
    type: 'approximate',
    country: 'GB',
    city: 'London',
    region: 'Greater London',
    timezone: 'Europe/London',
  };
  
  const results = await runWebSearch({
    client,
    query: 'Best restaurants near me',
    model: 'o4-mini',
    userLocation: location,
  });
  
  console.log('Answer (for London, UK):', results.answer.substring(0, 200) + '...');
  console.log('\n');
}

// Example 4: Deep reasoning for complex queries
async function deepReasoningSearch() {
  console.log('=== Example 4: Deep Reasoning Search ===\n');
  
  const client = getOpenAIClient();
  
  const results = await runWebSearch({
    client,
    query: 'What are the main differences between IFRS 16 and IFRS 17?',
    model: 'gpt-5',
    reasoningEffort: 'high',
    verbosity: 'high',
    allowedDomains: ['ifrs.org', 'iasplus.com', 'fasb.org'],
    includeSources: true,
    forceWebSearch: true,
  });
  
  console.log('Answer:', results.answer.substring(0, 300) + '...');
  console.log('\nCitations:');
  results.citations.forEach((citation, i) => {
    console.log(`  [${i + 1}] ${citation.title || citation.url}`);
  });
  console.log('\n');
}

// Example 5: Cache-only mode (offline/indexed results)
async function cacheOnlySearch() {
  console.log('=== Example 5: Cache-Only Mode ===\n');
  
  const client = getOpenAIClient();
  
  const results = await runWebSearch({
    client,
    query: 'History of the International Financial Reporting Standards',
    model: 'gpt-5',
    externalWebAccess: false,  // Cache-only mode
  });
  
  console.log('Answer (from cache):', results.answer.substring(0, 200) + '...');
  console.log('\n');
}

// Example 6: Using tool builders directly
async function customToolBuilder() {
  console.log('=== Example 6: Custom Tool Builder ===\n');
  
  const client = getOpenAIClient();
  
  // Build custom tool
  const searchTool = createWebSearchTool({
    allowedDomains: ['openai.com', 'example.com'],
    userLocation: createUserLocation({
      country: 'US',
      city: 'San Francisco',
      region: 'California',
    }),
    externalWebAccess: true,
  });
  
  console.log('Custom tool configuration:');
  console.log(JSON.stringify(searchTool, null, 2));
  
  // Use with OpenAI client directly
  const response = await client.responses.create({
    model: 'gpt-5',
    input: 'What are the latest AI developments?',
    tools: [searchTool as any],
    include: ['web_search_call.action.sources'],
  });
  
  console.log('\nResponse received:', response.id);
  console.log('\n');
}

// Example 7: Domain normalization utilities
function domainUtilities() {
  console.log('=== Example 7: Domain Normalization ===\n');
  
  const domains = [
    'https://example.com/',
    'http://test.org',
    '  openai.com  ',
    '//another.com',
    'valid.domain.net',
  ];
  
  console.log('Original domains:', domains);
  
  domains.forEach(domain => {
    const normalized = normalizeDomain(domain);
    console.log(`  "${domain}" -> "${normalized}"`);
  });
  
  console.log('\n');
}

// Main function to run all examples
async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║        OpenAI Web Search Module - Examples               ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
  try {
    // Run domain utilities example (no API call)
    domainUtilities();
    
    // Note: Uncomment the examples below to run them
    // They require a valid OpenAI API key and will make actual API calls
    
    // await basicWebSearch();
    // await domainFilteredSearch();
    // await geographicSearch();
    // await deepReasoningSearch();
    // await cacheOnlySearch();
    // await customToolBuilder();
    
    console.log('✓ Examples completed successfully!');
    console.log('\nNote: Most examples are commented out to avoid API costs.');
    console.log('Uncomment them in the main() function to run with your API key.\n');
  } catch (error) {
    console.error('Error running examples:', error);
    if (error instanceof Error) {
      console.error('Message:', error.message);
    }
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export {
  basicWebSearch,
  domainFilteredSearch,
  geographicSearch,
  deepReasoningSearch,
  cacheOnlySearch,
  customToolBuilder,
  domainUtilities,
};
