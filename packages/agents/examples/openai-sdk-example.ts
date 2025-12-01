import OpenAI from 'openai';
import {
  AgentRegistryLoader,
  DeepSearchWrapper,
  OpenAIAgentSDKIntegration,
  type DeepSearchParams,
  type DeepSearchResult,
} from '../src/index.js';

// Mock DeepSearch implementation
async function mockDeepSearch(params: DeepSearchParams): Promise<DeepSearchResult[]> {
  console.log(`🔍 DeepSearch called:`, {
    query: params.query,
    category: params.category,
    jurisdictions: params.jurisdictions,
  });

  return [
    {
      id: 'result-1',
      content: `Corporate income tax in Rwanda is governed by the Income Tax Law. The standard corporate tax rate is 30% on taxable income. Special Economic Zones may qualify for reduced rates.`,
      metadata: {
        source: 'Rwanda Revenue Authority - Corporate Tax Guide 2024',
        category: 'TAX',
        jurisdiction: 'RW',
        tags: ['corporate-tax', 'rwanda', 'income-tax'],
        similarity: 0.92,
      },
    },
    {
      id: 'result-2',
      content: `Small and medium enterprises (SMEs) in Rwanda may benefit from simplified tax regimes. The turnover tax is available for businesses with annual turnover below RWF 20 million.`,
      metadata: {
        source: 'RRA Tax Procedures 2024',
        category: 'TAX',
        jurisdiction: 'RW',
        tags: ['sme', 'turnover-tax'],
        similarity: 0.85,
      },
    },
  ];
}

async function main() {
  console.log('='.repeat(70));
  console.log('OpenAI Agents SDK Integration Example');
  console.log('='.repeat(70));
  console.log('');

  // 1. Initialize components
  const registry = AgentRegistryLoader.fromDefault();
  const deepSearch = new DeepSearchWrapper(mockDeepSearch);
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || 'demo-key-will-fail',
  });

  const integration = new OpenAIAgentSDKIntegration({
    client: openai,
    registry,
    deepSearch,
  });

  // 2. Simple chat example
  console.log('📝 Example 1: Simple Chat');
  console.log('-'.repeat(70));
  
  try {
    const response = await integration.chat(
      'tax-corp-rw-027',
      'What are the corporate tax rates in Rwanda?'
    );
    console.log('User: What are the corporate tax rates in Rwanda?');
    console.log(`Agent: ${response}`);
    console.log('');
  } catch (error) {
    console.log(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    console.log('💡 Set OPENAI_API_KEY environment variable to run this example');
    console.log('');
  }

  // 3. Multi-turn conversation
  console.log('📝 Example 2: Multi-turn Conversation');
  console.log('-'.repeat(70));
  
  try {
    // Create thread
    const { threadId } = await integration.createThread();
    console.log(`✓ Created thread: ${threadId}`);

    // First message
    await integration.addMessage(threadId, 'What is IFRS 15?');
    let response = await integration.runAgent('acct-revenue-001', threadId);
    console.log('User: What is IFRS 15?');
    console.log(`Agent: ${response.result?.substring(0, 200)}...`);
    console.log('');

    // Second message
    const secondResponse = await integration.continueConversation(
      'acct-revenue-001',
      threadId,
      'Can you give me an example of performance obligations?'
    );
    console.log('User: Can you give me an example of performance obligations?');
    console.log(`Agent: ${secondResponse.substring(0, 200)}...`);
    console.log('');

    // Get thread history
    const messages = await integration.getThreadMessages(threadId);
    console.log(`📚 Thread has ${messages.length} messages`);

    // Cleanup
    await integration.deleteThread(threadId);
    console.log(`✓ Deleted thread`);
    console.log('');
  } catch (error) {
    console.log(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    console.log('');
  }

  // 4. Using different agents
  console.log('📝 Example 3: Different Agents');
  console.log('-'.repeat(70));

  const agentExamples = [
    { id: 'tax-corp-rw-027', question: 'Explain withholding tax on dividends in Rwanda' },
    { id: 'audit-planning', question: 'What is ISA 300 about?' },
    { id: 'acct-lease-001', question: 'How do I account for a finance lease under IFRS 16?' },
  ];

  for (const example of agentExamples) {
    const agent = registry.getAgent(example.id);
    console.log(`Agent: ${agent?.label}`);
    console.log(`Question: ${example.question}`);
    console.log('');
  }

  console.log('='.repeat(70));
  console.log('✨ Example complete');
  console.log('='.repeat(70));
}

main().catch(console.error);
