# Agent Registry System - Usage Guide

**Status**: ✅ PRODUCTION-READY  
**Location**: `src/agents/agentRegistry.ts`  
**Config**: `config/agent_registry.yaml`

---

## Overview

The Agent Registry System provides:
- **YAML-based configuration** for all 36 agents
- **Runtime loader** (`getAgentConfig`, `runAgent`)
- **API endpoints** for HTTP/WhatsApp integration
- **Tool resolution** (currently: `deep_search_kb`)
- **Cross-platform** (OpenAI + Gemini support planned)

---

## Quick Start

### 1. Install Dependencies

```bash
pnpm add js-yaml @types/js-yaml @openai/agents
```

### 2. Test the Registry

```bash
# Run validation
pnpm tsx src/test-agent-registry.ts

# Should output:
# ✅ Loaded 36 agents, 1 tools
# ✅ Registry validation passed
```

### 3. Use in Code

```typescript
import { runAgent } from './agents/agentRegistry';

// Run an agent
const result = await runAgent('tax-corp-rw-027', 'What is the VAT threshold in Rwanda?');

console.log(result.text);
// Output: "The VAT threshold in Rwanda is..."

console.log(result.sources);
// Output: [{ source_name: "RRA - VAT Guide", page_url: "...", similarity: 0.89 }]
```

---

## API Reference

### Core Functions

#### `getAgentConfig(id: string): AgentDef | undefined`

Get agent configuration by ID.

```typescript
const config = getAgentConfig('tax-corp-rw-027');

console.log(config.label);        // "Rwanda Corporate Tax Specialist"
console.log(config.group);        // "tax"
console.log(config.runtime.openai.model);  // "gpt-4o-mini"
```

#### `runAgent(agentId, userMessage, options?): Promise<RunAgentResult>`

Execute an agent with a user message.

```typescript
const result = await runAgent(
  'tax-corp-rw-027',
  'What is the corporate tax rate?',
  {
    history: [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi! How can I help with Rwanda tax?' }
    ]
  }
);

console.log(result.text);      // Agent's response
console.log(result.agent_id);  // "tax-corp-rw-027"
console.log(result.model);     // "gpt-4o-mini"
console.log(result.sources);   // Array of source citations
```

#### `getAllAgents(): AgentDef[]`

Get all agents in the registry.

```typescript
const agents = getAllAgents();
// Returns: 36 agents
```

#### `getAgentsByGroup(group: string): AgentDef[]`

Filter agents by group.

```typescript
const taxAgents = getAgentsByGroup('tax');
// Returns: 12 tax agents

const auditAgents = getAgentsByGroup('audit');
// Returns: 8 audit agents
```

#### `getAgentStats()`

Get registry statistics.

```typescript
const stats = getAgentStats();

console.log(stats.total_agents);  // 36
console.log(stats.total_tools);   // 1
console.log(stats.groups);        // { tax: 12, audit: 8, ... }
console.log(stats.models);        // { "gpt-4o-mini": 30, ... }
```

#### `validateRegistry(): string[]`

Validate registry configuration.

```typescript
const errors = validateRegistry();

if (errors.length === 0) {
  console.log('Registry is valid');
} else {
  console.error('Validation errors:', errors);
}
```

---

## HTTP API Endpoints

### POST `/api/agents/ask`

Run an agent via HTTP.

**Request**:
```json
{
  "agentId": "tax-corp-rw-027",
  "message": "What is the VAT threshold in Rwanda?",
  "history": []
}
```

**Response**:
```json
{
  "reply": "The VAT threshold in Rwanda is RWF 20 million...",
  "agent_id": "tax-corp-rw-027",
  "model": "gpt-4o-mini",
  "sources": [
    {
      "source_name": "RRA - VAT Guide",
      "page_url": "https://rra.gov.rw/...",
      "similarity": 0.89
    }
  ]
}
```

### GET `/api/agents`

List all agents.

**Response**:
```json
{
  "agents": [...],
  "total": 36
}
```

### GET `/api/agents?group=tax`

Filter agents by group.

**Response**:
```json
{
  "agents": [...],
  "total": 12
}
```

### GET `/api/agents/:id`

Get specific agent config.

**Response**:
```json
{
  "id": "tax-corp-rw-027",
  "label": "Rwanda Corporate Tax Specialist",
  "group": "tax",
  ...
}
```

### GET `/api/agents/stats`

Get registry statistics.

**Response**:
```json
{
  "total_agents": 36,
  "total_tools": 1,
  "groups": { "tax": 12, "audit": 8, ... },
  "models": { "gpt-4o-mini": 30, ... },
  "version": 1
}
```

---

## WhatsApp Integration

### Setup

1. Configure WhatsApp webhook URL: `https://your-domain.com/webhooks/whatsapp/tax-rwanda`
2. Set environment variable: `WHATSAPP_VERIFY_TOKEN=your_token`
3. Implement `sendWhatsAppReply()` with your Twilio/Meta client

### Endpoints

**POST `/webhooks/whatsapp/tax-rwanda`** - Rwanda tax agent  
**POST `/webhooks/whatsapp/tax-malta`** - Malta tax agent  
**POST `/webhooks/whatsapp/accounting`** - IFRS accounting agent  
**GET `/webhooks/whatsapp/verify`** - Webhook verification

### Example Flow

```
User sends WhatsApp: "What is the VAT threshold?"
    ↓
Webhook receives message
    ↓
runAgent('tax-corp-rw-027', message)
    ↓
Agent calls deep_search_kb tool
    ↓
Returns answer with sources
    ↓
Send WhatsApp reply to user
```

---

## PWA/Mobile Integration

### Frontend (React/Vue/etc)

```typescript
async function askAgent(agentId: string, message: string) {
  const response = await fetch('/api/agents/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId, message })
  });

  const data = await response.json();
  return data.reply;
}

// Usage
const answer = await askAgent('tax-corp-rw-027', 'What is the VAT threshold?');
console.log(answer);
```

### Agent Selector UI

```typescript
// Get all tax agents
const taxAgents = await fetch('/api/agents?group=tax').then(r => r.json());

// Render dropdown
<select>
  {taxAgents.agents.map(agent => (
    <option value={agent.id}>{agent.label}</option>
  ))}
</select>
```

---

## Adding New Agents

### 1. Add to YAML

Edit `config/agent_registry.yaml`:

```yaml
agents:
  - id: my-new-agent-001
    label: My New Specialist
    group: tax
    runtime:
      openai:
        model: gpt-4o-mini
        temperature: 0.1
        tools: [deep_search_kb]
    persona: |
      You are a specialist in...
    kb_scopes:
      - tool: deep_search_kb
        category: TAX
        jurisdictions: [RW]
        max_results: 20
```

### 2. Reload Registry

The registry auto-reloads on next access. For hot reload in dev:

```typescript
import { reloadRegistry } from './agents/agentRegistry';

reloadRegistry(); // Force reload
```

### 3. Test

```bash
pnpm tsx src/test-agent-registry.ts
```

---

## Environment Variables

```bash
# Required for agent execution
OPENAI_API_KEY=sk-...

# Required for Supabase (DeepSearch tool)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Optional for WhatsApp
WHATSAPP_VERIFY_TOKEN=your_verify_token
```

---

## File Structure

```
src/
├── agents/
│   ├── agentRegistry.ts          # Main loader & runtime
│   ├── index.ts                  # (existing) agent exports
│   └── tools/
│       └── deepSearchTool.ts     # (existing) DeepSearch tool
├── routes/
│   ├── api/
│   │   └── agents.ts             # HTTP API endpoints
│   └── webhooks/
│       └── whatsapp.ts           # WhatsApp webhook handlers
└── test-agent-registry.ts        # Test script

config/
└── agent_registry.yaml           # Single source of truth
```

---

## Troubleshooting

### Agent not found

```typescript
const config = getAgentConfig('my-agent-001');
if (!config) {
  console.error('Agent ID not found in registry');
}
```

### Tool resolution fails

```
Error: Unknown tool ref: my_custom_tool
```

**Solution**: Add tool implementation to `getToolImplementation()` in `agentRegistry.ts`:

```typescript
function getToolImplementation(ref: ToolRef) {
  switch (ref) {
    case 'deep_search_kb':
      return deepSearchTool;
    case 'my_custom_tool':  // Add new tool
      return myCustomTool;
    default:
      throw new Error(`Unknown tool ref: ${ref}`);
  }
}
```

### Registry validation errors

```bash
pnpm tsx src/test-agent-registry.ts
```

Common errors:
- Agent references unknown tool
- Invalid YAML structure
- Missing required fields

---

## Production Deployment

### 1. Build

```bash
pnpm run build
```

### 2. Environment

Ensure production `.env` has:
```
OPENAI_API_KEY=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### 3. Start

```bash
pnpm start
```

### 4. Health Check

```bash
curl http://localhost:3000/api/agents/stats

# Should return:
# {"total_agents":36,"total_tools":1,...}
```

---

## Monitoring

### Log Agent Queries

```typescript
const result = await runAgent(agentId, message);

// Log to database for analytics
await db.query(`
  INSERT INTO agent_queries (agent_id, user_message, response, sources, model, created_at)
  VALUES ($1, $2, $3, $4, $5, NOW())
`, [result.agent_id, message, result.text, JSON.stringify(result.sources), result.model]);
```

### Track Performance

```typescript
const start = Date.now();
const result = await runAgent(agentId, message);
const duration = Date.now() - start;

console.log(`Agent ${agentId} responded in ${duration}ms`);
```

---

## Next Steps

1. **Implement Gemini runtime** - Add Gemini execution path
2. **Add more tools** - Web search, calculator, code executor
3. **Build analytics dashboard** - Track usage, performance, quality
4. **Implement caching** - Cache agent responses for common queries
5. **Add rate limiting** - Protect against abuse

---

**Built**: December 1, 2025  
**Status**: ✅ PRODUCTION-READY  
**Registry**: 36 agents, 1 tool  
**Platforms**: OpenAI (Gemini coming soon)  

🎉 **Your agents are centralized and ready to deploy!**
