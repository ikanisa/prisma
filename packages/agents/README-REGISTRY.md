# Agent Registry System

This package provides a unified agent registry system for managing 36 specialized AI agents across Tax, Audit, Accounting, and Corporate Services domains.

## Features

- **Single Source of Truth**: One YAML registry (`config/agent_registry.yaml`) for all agent configurations
- **Multi-Engine Support**: Works with both OpenAI Agents SDK and Google Gemini
- **DeepSearch Integration**: Built-in knowledge base search with category/jurisdiction/tag filtering
- **Type-Safe**: Full TypeScript support with comprehensive type definitions
- **Validation**: Registry validation to catch configuration errors early

## Quick Start

```typescript
import {
  AgentRegistryLoader,
  OpenAIAgentFactory,
  DeepSearchWrapper,
} from '@prisma-glow/agents';

// Load the registry
const registry = AgentRegistryLoader.fromDefault();

// Create DeepSearch wrapper (provide your search implementation)
const deepSearch = new DeepSearchWrapper(yourSearchFunction);

// Create OpenAI agent factory
const factory = new OpenAIAgentFactory(
  registry,
  deepSearch,
  { apiKey: process.env.OPENAI_API_KEY }
);

// Create an agent
const taxAgent = factory.createAgent('tax-corp-rw-027');
console.log(taxAgent.instructions);
```

## Agent Groups

### Tax Agents (12)
- **tax-corp-eu-022**: EU Corporate Tax Specialist
- **tax-corp-us-023**: US Corporate Tax Specialist
- **tax-corp-uk-024**: UK Corporate Tax Specialist
- **tax-corp-ca-025**: Canada Corporate Tax Specialist
- **tax-corp-mt-026**: Malta Corporate Tax Specialist
- **tax-corp-rw-027**: Rwanda Corporate Tax Specialist
- **tax-vat-028**: VAT / Indirect Tax Specialist
- **tax-tp-029**: Transfer Pricing Specialist
- **tax-personal-030**: Personal Income Tax Specialist
- **tax-provision-031**: Tax Provision / Accounting for Income Taxes
- **tax-contro-032**: Tax Controversy / Dispute Specialist
- **tax-research-033**: Tax Research Specialist

### Audit Agents (10)
- **audit-planning**: Audit Planning Specialist (ISA 300)
- **audit-risk-assessment**: Risk Assessment Specialist (ISA 315)
- **audit-substantive-testing**: Substantive Testing Specialist (ISA 330)
- **audit-internal-controls**: Internal Controls Specialist (ISA 315 + COSO)
- **audit-fraud-risk**: Fraud Risk Assessment Specialist (ISA 240)
- **audit-analytics**: Audit Data Analytics Specialist
- **audit-group**: Group Audit Specialist (ISA 600)
- **audit-completion**: Audit Completion Specialist (ISA 560, 570, 580)
- **audit-quality-review**: Engagement Quality Reviewer (ISQM 2)
- **audit-report**: Audit Report Specialist (ISA 700-706)

### Accounting Agents (8)
- **acct-revenue-001**: Revenue Recognition Agent (IFRS 15 / ASC 606)
- **acct-lease-001**: Lease Accounting Agent (IFRS 16 / ASC 842)
- **acct-finstat-001**: Financial Statements Presentation Agent (IAS 1 / ASC 205)
- **acct-consol-001**: Consolidation Agent (IFRS 10 / ASC 810)
- **acct-cashflow-001**: Cash Flow Statement Agent (IAS 7 / ASC 230)
- **acct-cost-001**: Cost Accounting Agent
- **acct-inventory-001**: Inventory Agent (IAS 2 / ASC 330)
- **acct-ppe-001**: Fixed Assets / PPE Agent (IAS 16 / ASC 360)

### Corporate Services Agents (6)
- **corp-form-034**: Company Formation Agent
- **corp-gov-035**: Corporate Governance Agent
- **corp-entity-036**: Entity Management Agent
- **corp-agent-037**: Registered Agent Services Agent
- **corp-cal-038**: Compliance Calendar Agent
- **corp-restr-039**: Corporate Restructuring Agent

## Registry Structure

```yaml
version: 1

tools:
  - id: deep_search_kb
    kind: rag_search
    description: Search the curated knowledge base
    implementation:
      openai:
        tool_name: deep_search_kb
      gemini:
        function_name: deep_search_kb
    default_params:
      matchCount: 15
      min_similarity: 0.72

agents:
  - id: tax-corp-rw-027
    label: Rwanda Corporate Tax Specialist
    group: tax
    runtime:
      openai:
        model: gpt-4o-mini
        temperature: 0.05
        tools: [deep_search_kb]
      gemini:
        model: gemini-1.5-pro
        temperature: 0.05
        tools: [deep_search_kb]
    persona: |
      You are a Rwanda corporate income tax specialist...
    kb_scopes:
      - tool: deep_search_kb
        category: TAX
        jurisdictions: [RW, KE, UG, TZ, ZM, GLOBAL]
        tags_any: [income-tax, rwanda, east-africa]
        max_results: 25
        min_similarity: 0.72
```

## API Reference

### AgentRegistryLoader

```typescript
class AgentRegistryLoader {
  static fromDefault(): AgentRegistryLoader;
  getAgent(agentId: string): AgentDefinition | undefined;
  getAgentsByGroup(group: string): AgentDefinition[];
  getAllAgents(): AgentDefinition[];
  getAgentKBScopes(agentId: string): KBScope[];
  getOpenAIConfig(agentId: string): {...};
  getGeminiConfig(agentId: string): {...};
  validate(): { valid: boolean; errors: string[] };
}
```

### OpenAIAgentFactory

```typescript
class OpenAIAgentFactory {
  constructor(
    registry: AgentRegistryLoader,
    deepSearch: DeepSearchWrapper,
    config: OpenAIAgentConfig
  );
  
  createAgent(agentId: string): OpenAIAgent;
  handleToolCall(agentId: string, toolName: string, args: Record<string, unknown>): Promise<string>;
  listAvailableAgents(): Array<{ id: string; label: string; group: string }>;
}
```

### GeminiAgentFactory

```typescript
class GeminiAgentFactory {
  constructor(
    registry: AgentRegistryLoader,
    deepSearch: DeepSearchWrapper,
    config: GeminiAgentConfig
  );
  
  createAgent(agentId: string): GeminiAgent;
  handleFunctionCall(agentId: string, functionName: string, args: Record<string, unknown>): Promise<string>;
  listAvailableAgents(): Array<{ id: string; label: string; group: string }>;
}
```

### DeepSearchWrapper

```typescript
class DeepSearchWrapper {
  constructor(searchFunction: (params: DeepSearchParams) => Promise<DeepSearchResult[]>);
  
  search(query: string, scopes: KBScope[], additionalParams?: Partial<DeepSearchParams>): Promise<DeepSearchResult[]>;
  searchSingleScope(query: string, scope: KBScope, additionalParams?: Partial<DeepSearchParams>): Promise<DeepSearchResult[]>;
  
  static formatResultsForPrompt(results: DeepSearchResult[]): string;
}
```

## Example: Complete Integration

```typescript
import { SupabaseClient } from '@supabase/supabase-js';
import {
  AgentRegistryLoader,
  OpenAIAgentFactory,
  DeepSearchWrapper,
  type DeepSearchParams,
  type DeepSearchResult,
} from '@prisma-glow/agents';

// Your DeepSearch implementation using Supabase vector search
async function supabaseDeepSearch(
  supabase: SupabaseClient,
  params: DeepSearchParams
): Promise<DeepSearchResult[]> {
  const { data, error } = await supabase.rpc('match_documents', {
    query_embedding: await getEmbedding(params.query),
    match_threshold: params.minSimilarity || 0.72,
    match_count: params.matchCount || 15,
    filter_category: params.category,
    filter_jurisdictions: params.jurisdictions,
    filter_tags: params.tags,
  });

  if (error) throw error;

  return data.map(row => ({
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

// Initialize
const registry = AgentRegistryLoader.fromDefault();
const supabase = createClient(url, key);
const deepSearch = new DeepSearchWrapper(
  (params) => supabaseDeepSearch(supabase, params)
);

const factory = new OpenAIAgentFactory(
  registry,
  deepSearch,
  { apiKey: process.env.OPENAI_API_KEY }
);

// Use agent
const agent = factory.createAgent('tax-corp-rw-027');

// Handle tool calls during conversation
const toolResponse = await factory.handleToolCall(
  'tax-corp-rw-027',
  'deep_search_kb',
  { query: 'What are the corporate tax rates in Rwanda?' }
);

console.log(toolResponse);
```

## Validation

Validate your registry before deployment:

```typescript
const registry = AgentRegistryLoader.fromDefault();
const validation = registry.validate();

if (!validation.valid) {
  console.error('Registry validation failed:');
  validation.errors.forEach(err => console.error(`  - ${err}`));
  process.exit(1);
}

console.log('✓ Registry validation passed');
```

## License

Private - Part of Prisma Glow workspace
