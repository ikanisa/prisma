import {
  AgentRegistryLoader,
  OpenAIAgentFactory,
  DeepSearchWrapper,
  type DeepSearchParams,
  type DeepSearchResult,
} from '../src/index.js';

async function mockDeepSearch(params: DeepSearchParams): Promise<DeepSearchResult[]> {
  console.log('Mock DeepSearch called with:', params);
  return [
    {
      id: 'result-1',
      content: 'Sample knowledge base content about IFRS 15 revenue recognition...',
      metadata: {
        source: 'IFRS 15 Standard',
        category: 'IFRS',
        jurisdiction: 'GLOBAL',
        tags: ['ifrs-15', 'revenue'],
        similarity: 0.85,
      },
    },
  ];
}

async function main() {
  const registry = AgentRegistryLoader.fromDefault();
  
  console.log('='.repeat(60));
  console.log('Agent Registry Summary');
  console.log('='.repeat(60));
  console.log(`Total agents: ${registry.getAgentCount()}`);
  console.log(`Total tools: ${registry.getToolCount()}`);
  console.log(`Groups: ${registry.listGroups().join(', ')}`);
  console.log('');

  const validation = registry.validate();
  if (!validation.valid) {
    console.error('Registry validation failed:');
    validation.errors.forEach(err => console.error(`  - ${err}`));
    return;
  }
  console.log('✓ Registry validation passed');
  console.log('');

  const deepSearch = new DeepSearchWrapper(mockDeepSearch);
  
  const openaiFactory = new OpenAIAgentFactory(
    registry,
    deepSearch,
    { apiKey: process.env.OPENAI_API_KEY || 'demo-key' }
  );

  console.log('='.repeat(60));
  console.log('Sample: Creating Revenue Recognition Agent (OpenAI)');
  console.log('='.repeat(60));
  
  const revenueAgent = openaiFactory.createAgent('acct-revenue-001');
  console.log(`ID: ${revenueAgent.id}`);
  console.log(`Model: ${revenueAgent.model}`);
  console.log(`Temperature: ${revenueAgent.temperature}`);
  console.log(`Tools: ${revenueAgent.tools.length}`);
  console.log(`Instructions (first 200 chars):`);
  console.log(`  ${revenueAgent.instructions.substring(0, 200)}...`);
  console.log('');

  console.log('='.repeat(60));
  console.log('Sample: Testing DeepSearch for Rwanda Tax Agent');
  console.log('='.repeat(60));
  
  const rwandaTaxAgent = registry.getAgent('tax-corp-rw-027');
  if (rwandaTaxAgent) {
    console.log(`Agent: ${rwandaTaxAgent.label}`);
    console.log(`KB Scopes: ${rwandaTaxAgent.kb_scopes.length}`);
    
    const scopes = registry.getAgentKBScopes('tax-corp-rw-027');
    const results = await deepSearch.search(
      'What are the Rwanda corporate tax rates?',
      scopes
    );
    
    console.log(`Search results: ${results.length}`);
    console.log(DeepSearchWrapper.formatResultsForPrompt(results));
  }
  console.log('');

  console.log('='.repeat(60));
  console.log('Available Agents by Group');
  console.log('='.repeat(60));
  
  for (const group of registry.listGroups()) {
    const agents = registry.getAgentsByGroup(group);
    console.log(`${group.toUpperCase()} (${agents.length}):`);
    agents.forEach(agent => {
      console.log(`  - ${agent.id}: ${agent.label}`);
    });
    console.log('');
  }
}

main().catch(console.error);
