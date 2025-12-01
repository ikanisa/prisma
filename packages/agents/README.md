# Agent Registry System

## Overview

The Agent Registry System provides a centralized, declarative way to define and manage AI agents across multiple engines (OpenAI and Gemini). It enables consistent agent behavior, easy routing, and scalable agent management.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   agents.registry.yaml                       │
│              (Single Source of Truth)                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Registry Loader                            │
│           (packages/agents/src/registry/)                    │
└─────────────────────────────────────────────────────────────┘
                            │
            ┌───────────────┴───────────────┐
            ▼                               ▼
┌───────────────────────┐       ┌───────────────────────┐
│   OpenAI Factory      │       │   Gemini Factory      │
│   (creates agents)    │       │   (creates configs)   │
└───────────────────────┘       └───────────────────────┘
            │                               │
            ▼                               ▼
┌───────────────────────┐       ┌───────────────────────┐
│   OpenAI Runner       │       │   Gemini Runner       │
│   (executes agents)   │       │   (executes agents)   │
└───────────────────────┘       └───────────────────────┘
            │                               │
            └───────────────┬───────────────┘
                            ▼
                  ┌─────────────────┐
                  │  Unified Router │
                  │  (AgentRouter)  │
                  └─────────────────┘
                            │
                            ▼
                  ┌─────────────────┐
                  │   REST API      │
                  │   /agents/*     │
                  └─────────────────┘
```

## Quick Start

### 1. Install Dependencies

```bash
pnpm install --frozen-lockfile
```

### 2. Define Agents in Registry

Agents are defined in `agents.registry.yaml` at the repository root:

```yaml
version: 1
agents:
  - id: tax-compliance-mt-034
    category: tax
    name: "Malta Tax Compliance Agent"
    description: "Handles Malta corporate and personal tax compliance..."
    jurisdictions: ["MT"]
    standards:
      tax_laws: ["MT-CIT", "MT-PIT", "MT-VAT"]
      frameworks: ["OECD-Guidelines"]
    kb_scopes:
      - "tax:mt:compliance"
      - "tax:mt:corporate"
    tools: ["deepsearch", "supabase_semantic_search", "calculator"]
    engine_preferences: { primary: "openai", fallback: "gemini" }
    routing_tags: ["malta", "compliance", "returns"]
```

### 3. Use the Agent Router

```typescript
import { agentRouter } from "@prisma-glow/agents";

// Run an agent
const result = await agentRouter.run({
  agentId: "tax-compliance-mt-034",
  input: "What are the corporate tax filing deadlines in Malta?",
  metadata: {
    jurisdictionCode: "MT",
    userId: "user123",
  },
});

console.log(result.output);
```

### 4. Search for Agents

```typescript
// Find agents by category
const taxAgents = agentRouter.searchAgents({ category: "tax" });

// Find agents by jurisdiction
const maltaAgents = agentRouter.searchAgents({ jurisdiction: "MT" });

// Find agents by tags
const complianceAgents = agentRouter.searchAgents({
  tags: ["compliance", "returns"],
});
```

## Registry Schema

### Agent Entry Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ | Unique agent identifier (e.g., "tax-compliance-mt-034") |
| `category` | string | ✅ | Category: "tax", "audit", "accounting", "corporate" |
| `name` | string | ✅ | Human-readable agent name |
| `description` | string | ✅ | Detailed description of agent capabilities |
| `jurisdictions` | string[] | ✅ | Jurisdictions covered (e.g., ["MT", "RW", "GLOBAL"]) |
| `standards` | object | ✅ | Relevant standards (tax_laws, frameworks, etc.) |
| `kb_scopes` | string[] | ✅ | Knowledge base scopes to search |
| `tools` | string[] | ✅ | Available tools (deepsearch, calculator, etc.) |
| `engine_preferences` | object | ✅ | Primary and fallback engines |
| `routing_tags` | string[] | ✅ | Tags for routing and search |
| `persona` | object | ❌ | Optional persona configuration |

### Example Agent Definition

```yaml
- id: audit-materiality-050
  category: audit
  name: "Materiality & Sampling Agent"
  description: "Sets materiality and designs sampling under ISA 320 and ISA 530."
  jurisdictions: ["GLOBAL"]
  standards:
    isa: ["ISA 320", "ISA 530"]
  kb_scopes:
    - "audit:materiality"
    - "audit:sampling"
  tools: ["deepsearch", "supabase_semantic_search", "calculator"]
  engine_preferences: { primary: "openai", fallback: "gemini" }
  routing_tags: ["materiality", "sampling", "isa320", "isa530"]
```

## API Usage

### REST Endpoints

#### List All Agents
```bash
GET /api/agents
```

Response:
```json
{
  "success": true,
  "data": [...],
  "count": 32
}
```

#### Search Agents
```bash
GET /api/agents/search?category=tax&jurisdiction=MT
```

#### Get Agent Details
```bash
GET /api/agents/:agentId
```

#### Run Agent
```bash
POST /api/agents/:agentId/run
Content-Type: application/json

{
  "message": "What are the Malta tax filing deadlines?",
  "jurisdictionCode": "MT",
  "forceEngine": "openai"  // optional
}
```

Response:
```json
{
  "success": true,
  "data": {
    "agentId": "tax-compliance-mt-034",
    "engine": "openai",
    "output": "Malta corporate tax filing deadlines are...",
    "toolCalls": [...]
  }
}
```

## Agent Categories

### Tax Agents (8)
- **tax-compliance-mt-034**: Malta Tax Compliance
- **tax-compliance-rw-035**: Rwanda Tax Compliance
- **tax-payroll-mt-036**: Malta Payroll & Social Security
- **tax-payroll-rw-037**: Rwanda Payroll & Social Security
- **tax-wht-xborder-038**: Withholding Tax & Cross-Border
- **tax-excise-customs-039**: Excise & Customs
- **tax-incentives-040**: Tax Incentives & Investment
- **tax-risk-governance-041**: Tax Risk & Governance

### Audit Agents (8)
- **audit-materiality-050**: Materiality & Sampling
- **audit-documentation-051**: Audit Documentation
- **audit-independence-052**: Independence & Ethics
- **audit-it-systems-053**: IT & Systems Audit
- **audit-internal-054**: Internal Audit & Compliance
- **audit-esg-055**: ESG & Sustainability Assurance
- **audit-forensic-056**: Forensic & Investigations
- **audit-public-sector-057**: Public Sector Audit

### Accounting Agents (8)
- **acct-fininst-001**: Financial Instruments
- **acct-tax-001**: Income Taxes Accounting
- **acct-emp-001**: Employee Benefits
- **acct-prov-001**: Provisions & Contingent Liabilities
- **acct-impair-001**: Impairment & Fair Value
- **acct-fx-001**: FX & Hyperinflation
- **acct-sbp-001**: Share-based Payments
- **acct-agri-001**: Agriculture & Biological Assets

### Corporate Services Agents (6)
- **corp-kyc-040**: KYC / AML & Beneficial Ownership
- **corp-board-041**: Board Meetings & Minutes
- **corp-lic-042**: Licensing & Regulatory Filings
- **corp-share-043**: Share Capital & Corporate Actions
- **corp-hr-044**: HR & Payroll Corporate Services
- **corp-migration-045**: Entity Migration & Cross-border

## Engine Integration

### OpenAI Integration

The system creates OpenAI-compatible agents with:
- Structured instructions based on registry entry
- Tool declarations
- Handoff capabilities

```typescript
import { createOpenAIAgentFromRegistry } from "@prisma-glow/agents/openai";

const agent = createOpenAIAgentFromRegistry(entry);
```

### Gemini Integration

The system creates Gemini-compatible configs with:
- System prompts
- Function declarations
- Tool call handling

```typescript
import { createGeminiAgentFromRegistry } from "@prisma-glow/agents/gemini";

const config = createGeminiAgentFromRegistry(entry);
```

## Adding New Agents

### 1. Add to Registry

Edit `agents.registry.yaml`:

```yaml
- id: your-agent-001
  category: your-category
  name: "Your Agent Name"
  description: "What your agent does"
  jurisdictions: ["GLOBAL"]
  standards:
    your_standards: ["Standard 1", "Standard 2"]
  kb_scopes:
    - "your:scope"
  tools: ["deepsearch", "calculator"]
  engine_preferences: { primary: "openai", fallback: "gemini" }
  routing_tags: ["tag1", "tag2"]
```

### 2. Reload Registry

The registry is cached in memory. Restart the service or reload:

```typescript
import { loadAgentsRegistry } from "@prisma-glow/agents";

// Force reload (clear cache first if needed)
const agents = loadAgentsRegistry();
```

### 3. Test Agent

```bash
curl -X POST http://localhost:3001/api/agents/your-agent-001/run \
  -H "Content-Type: application/json" \
  -d '{"message": "Test message"}'
```

## Tools

Available tools for agents:

- **deepsearch**: Deep search across multiple knowledge sources
- **supabase_semantic_search**: Semantic search in Supabase
- **supabase_keyword_search**: Keyword search in Supabase
- **calculator**: Mathematical calculations

Tools are automatically mapped to function declarations for both OpenAI and Gemini.

## Best Practices

1. **Agent IDs**: Use format `{category}-{name}-{number}` (e.g., "tax-compliance-mt-034")
2. **KB Scopes**: Use hierarchical format `{domain}:{jurisdiction}:{subdomain}`
3. **Jurisdictions**: Use ISO codes (MT, RW) or "GLOBAL"
4. **Standards**: Group by type (tax_laws, frameworks, isa, ifrs, etc.)
5. **Tags**: Use lowercase, dash-separated tags for routing
6. **Descriptions**: Be specific about agent capabilities and limitations

## Testing

```bash
# Typecheck
pnpm --filter @prisma-glow/agents run typecheck

# Run tests
pnpm --filter @prisma-glow/agents run test

# Lint
pnpm --filter @prisma-glow/agents run lint
```

## Troubleshooting

### Registry Not Found
Ensure `agents.registry.yaml` is at the repository root:
```bash
ls agents.registry.yaml
```

### Agent Not Found
Check the agent ID is correct:
```typescript
const agent = agentRouter.getAgent("tax-compliance-mt-034");
console.log(agent);
```

### Tool Not Available
Verify the tool name matches available tools:
- deepsearch
- supabase_semantic_search
- supabase_keyword_search
- calculator

## Migration Guide

### From Individual Agent Files

Before:
```typescript
// packages/tax/src/agents/tax-corp-mt-026.ts
export const taxCorpMT = { /* agent definition */ };
```

After:
Add to `agents.registry.yaml` and use the router:
```typescript
import { agentRouter } from "@prisma-glow/agents";
const result = await agentRouter.run({
  agentId: "tax-compliance-mt-034",
  input: "...",
});
```

## Performance Considerations

- Registry is loaded once and cached in memory
- Agent creation happens at initialization (not per request)
- Use search functions to filter agents efficiently
- Consider caching agent results at the application layer

## Future Enhancements

- [ ] Dynamic agent registration via API
- [ ] Agent versioning and A/B testing
- [ ] Real-time agent performance monitoring
- [ ] Agent composition (multi-agent workflows)
- [ ] Custom tool registration
- [ ] Agent marketplace/discovery

## Support

For questions or issues:
- Check existing documentation
- Review agent registry examples
- Open an issue on GitHub
- Contact the development team

## License

See repository LICENSE file.
