# Agent SDK Integration Guide

Complete integration guide for using the Agent Registry with OpenAI Agents SDK and Google Gemini.

## 📦 Packages

All SDK integrations are available from `@prisma-glow/agents`:

```typescript
import {
  // Registry & Core
  AgentRegistryLoader,
  DeepSearchWrapper,
  
  // OpenAI Integration
  OpenAIAgentSDKIntegration,
  type OpenAIAgentRuntime,
  
  // Gemini Integration
  GeminiSDKIntegration,
  type GeminiAgentRuntime,
} from '@prisma-glow/agents';
```

## 🤖 OpenAI Agents SDK Integration

### Setup

```typescript
import OpenAI from 'openai';
import {
  AgentRegistryLoader,
  DeepSearchWrapper,
  OpenAIAgentSDKIntegration,
} from '@prisma-glow/agents';

// 1. Load registry
const registry = AgentRegistryLoader.fromDefault();

// 2. Create DeepSearch wrapper (implement your search function)
const deepSearch = new DeepSearchWrapper(yourSearchFunction);

// 3. Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 4. Create integration
const integration = new OpenAIAgentSDKIntegration({
  client: openai,
  registry,
  deepSearch,
});
```

### Simple Chat

```typescript
const response = await integration.chat(
  'tax-corp-rw-027',  // Agent ID
  'What are the corporate tax rates in Rwanda?'
);

console.log(response); // Agent's response
```

### Multi-Turn Conversation

```typescript
// Create a thread for conversation
const { threadId } = await integration.createThread();

// First message
await integration.addMessage(threadId, 'What is IFRS 15?');
const response1 = await integration.runAgent('acct-revenue-001', threadId);
console.log(response1.result);

// Continue conversation
const response2 = await integration.continueConversation(
  'acct-revenue-001',
  threadId,
  'Can you give an example of performance obligations?'
);
console.log(response2);

// Get message history
const messages = await integration.getThreadMessages(threadId);

// Cleanup
await integration.deleteThread(threadId);
```

### Low-Level Control

```typescript
// Get or create assistant
const assistantId = await integration.getOrCreateAssistant('audit-planning');

// Create thread manually
const { threadId } = await integration.createThread();

// Add message
await integration.addMessage(threadId, 'Explain ISA 300');

// Run agent with custom instructions
const response = await integration.runAgent(
  'audit-planning',
  threadId,
  'Focus on practical application'
);

console.log(response.status);  // 'completed', 'failed', etc.
console.log(response.result);   // Agent's response
```

### Assistant Management

```typescript
// Delete an assistant (clears from cache)
await integration.deleteAssistant('tax-corp-rw-027');

// Clear all cached assistants
integration.clearCache();
```

## 🔮 Google Gemini Integration

### Setup

```typescript
import {
  AgentRegistryLoader,
  DeepSearchWrapper,
  GeminiSDKIntegration,
} from '@prisma-glow/agents';

const registry = AgentRegistryLoader.fromDefault();
const deepSearch = new DeepSearchWrapper(yourSearchFunction);

const integration = new GeminiSDKIntegration({
  apiKey: process.env.GEMINI_API_KEY,
  registry,
  deepSearch,
});
```

### Simple Chat

```typescript
const response = await integration.chat(
  'audit-risk-assessment',
  'Explain ISA 315 risk assessment procedures'
);

console.log(response);
```

### Multi-Turn Chat Session

```typescript
const chat = await integration.startChat('acct-revenue-001');

// Send messages
const response1 = await chat.sendMessage('What is the 5-step model in IFRS 15?');
console.log(response1);

const response2 = await chat.sendMessage('Can you elaborate on step 3?');
console.log(response2);

// Get history
const history = await chat.getHistory();
console.log(history);  // Array of { role, parts }
```

### Chat with History

```typescript
const chat = await integration.startChat('tax-research-033', [
  { role: 'user', parts: 'What are the BEPS Action Plans?' },
  { role: 'model', parts: 'BEPS (Base Erosion and Profit Shifting) includes 15 action plans...' },
]);

// Continue conversation
const response = await chat.sendMessage('Tell me more about Action 5');
```

### Streaming Responses

```typescript
const stream = await integration.streamChat(
  'tax-provision-031',
  'Explain deferred tax calculation under IAS 12'
);

for await (const chunk of stream) {
  process.stdout.write(chunk);
}
```

### Utility Functions

```typescript
// Count tokens
const tokenCount = await integration.countTokens(
  'acct-lease-001',
  'What are the key differences between IFRS 16 and ASC 842?'
);

// Generate embeddings
const embedding = await integration.embedText(
  'Corporate tax planning for multinational enterprises'
);
console.log(embedding.length);  // 768
```

## 🔍 DeepSearch Implementation

Both integrations require a DeepSearch implementation. Here's an example using Supabase:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(url, key);

async function supabaseDeepSearch(
  params: DeepSearchParams
): Promise<DeepSearchResult[]> {
  // Get embedding for query
  const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: params.query,
    }),
  });

  const embeddingData = await embeddingResponse.json();
  const embedding = embeddingData.data[0].embedding;

  // Search Supabase
  const { data, error } = await supabase.rpc('match_kb_documents', {
    query_embedding: embedding,
    match_threshold: params.minSimilarity || 0.72,
    match_count: params.matchCount || 15,
    filter_category: params.category,
    filter_jurisdictions: params.jurisdictions,
    filter_tags: params.tags,
  });

  if (error) throw error;

  return data.map((row: any) => ({
    id: row.id,
    content: row.content,
    metadata: {
      source: row.metadata.source,
      category: row.metadata.category,
      jurisdiction: row.metadata.jurisdiction,
      tags: row.metadata.tags,
      similarity: row.similarity,
    },
  }));
}

const deepSearch = new DeepSearchWrapper(supabaseDeepSearch);
```

## 📊 Agent Selection Guide

### By Use Case

**Tax Questions**:
- `tax-corp-rw-027` - Rwanda corporate tax
- `tax-corp-mt-026` - Malta corporate tax
- `tax-vat-028` - VAT/GST questions
- `tax-tp-029` - Transfer pricing
- `tax-provision-031` - Tax accounting (IAS 12 / ASC 740)

**Audit**:
- `audit-planning` - Audit strategy (ISA 300)
- `audit-risk-assessment` - Risk assessment (ISA 315)
- `audit-substantive-testing` - Substantive procedures (ISA 330)
- `audit-fraud-risk` - Fraud risk (ISA 240)
- `audit-report` - Audit reporting (ISA 700-706)

**Accounting**:
- `acct-revenue-001` - Revenue (IFRS 15 / ASC 606)
- `acct-lease-001` - Leases (IFRS 16 / ASC 842)
- `acct-finstat-001` - Financial statements (IAS 1 / ASC 205)
- `acct-consol-001` - Consolidation (IFRS 10 / ASC 810)

**Corporate Services**:
- `corp-form-034` - Company formation
- `corp-gov-035` - Corporate governance
- `corp-cal-038` - Compliance calendar

### By Model

**Gemini 1.5 Flash** (Faster, lower cost):
- `tax-research-033` - Tax research
- `audit-analytics` - Audit analytics
- `corp-cal-038` - Compliance calendar

**Gemini 1.5 Pro** (Higher quality):
- All other agents

## 🔧 Advanced Usage

### Custom Tool Call Handling

```typescript
// Extend OpenAI integration
class CustomOpenAIIntegration extends OpenAIAgentSDKIntegration {
  protected async handleToolCall(
    agentId: string,
    functionName: string,
    args: Record<string, unknown>
  ): Promise<string> {
    if (functionName === 'custom_tool') {
      // Your custom tool implementation
      return 'Custom tool result';
    }
    
    // Fall back to parent implementation
    return super.handleToolCall(agentId, functionName, args);
  }
}
```

### Error Handling

```typescript
try {
  const response = await integration.chat(agentId, message);
  console.log(response);
} catch (error) {
  if (error instanceof Error) {
    if (error.message.includes('not found')) {
      console.error('Agent not found in registry');
    } else if (error.message.includes('failed')) {
      console.error('Agent run failed:', error.message);
    }
  }
}
```

### Performance Optimization

```typescript
// Pre-create assistants for frequently used agents
const agentIds = ['tax-corp-rw-027', 'audit-planning', 'acct-revenue-001'];

await Promise.all(
  agentIds.map(id => integration.getOrCreateAssistant(id))
);

// Now these agents will respond faster (no assistant creation delay)
```

## 📝 Examples

See working examples in `packages/agents/examples/`:
- `openai-sdk-example.ts` - Complete OpenAI integration example
- `gemini-sdk-example.ts` - Complete Gemini integration example
- `usage-example.ts` - Basic registry usage

Run examples:
```bash
# Set API keys
export OPENAI_API_KEY="your-key"
export GEMINI_API_KEY="your-key"

# Run OpenAI example
npx tsx packages/agents/examples/openai-sdk-example.ts

# Run Gemini example
npx tsx packages/agents/examples/gemini-sdk-example.ts
```

## 🚀 Next Steps

1. Implement your DeepSearch function using Supabase vector search
2. Choose OpenAI or Gemini (or both!)
3. Select agents from the registry for your use cases
4. Build your application with the SDK integrations

## 📚 API Reference

### OpenAIAgentSDKIntegration

| Method | Description |
|--------|-------------|
| `getOrCreateAssistant(agentId)` | Get/create OpenAI Assistant |
| `createThread()` | Create conversation thread |
| `addMessage(threadId, content)` | Add message to thread |
| `runAgent(agentId, threadId, instructions?)` | Run agent on thread |
| `chat(agentId, message)` | Simple one-shot chat |
| `continueConversation(agentId, threadId, message)` | Continue multi-turn chat |
| `getThreadMessages(threadId)` | Get thread history |
| `deleteThread(threadId)` | Delete thread |
| `deleteAssistant(agentId)` | Delete assistant |
| `clearCache()` | Clear assistant cache |

### GeminiSDKIntegration

| Method | Description |
|--------|-------------|
| `chat(agentId, message)` | Simple one-shot chat |
| `startChat(agentId, history?)` | Start multi-turn chat session |
| `streamChat(agentId, message)` | Streaming response |
| `countTokens(agentId, message)` | Count tokens |
| `embedText(text)` | Generate embeddings |

---

**Ready to integrate!** 🎉
