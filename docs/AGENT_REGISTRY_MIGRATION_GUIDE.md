# Migration Guide: Moving to Agent Registry System

## Overview

This guide helps you migrate from individual agent files to the centralized agent registry system.

## Why Migrate?

**Before (Individual Files):**
```
packages/tax/src/agents/
  ├── tax-corp-mt-026.ts
  ├── tax-corp-us-023.ts
  ├── tax-personal-030.ts
  └── ...
```

**After (Registry System):**
```
agents.registry.yaml         → Single source of truth
packages/agents/             → Unified SDK
```

**Benefits:**
- ✅ Single source of truth for all agents
- ✅ Consistent configuration across engines
- ✅ Easy to add/modify agents
- ✅ Type-safe TypeScript SDK
- ✅ Unified routing and search
- ✅ Better documentation

## Migration Steps

### Step 1: Identify Your Agents

List all existing agent files:
```bash
find packages/*/src/agents -name "*.ts" -type f
```

### Step 2: Map to Registry Schema

For each agent file, extract:
- Agent ID and name
- Category
- Jurisdiction(s)
- Standards/frameworks
- Knowledge base scopes
- Tools
- Engine preferences

### Step 3: Add to Registry

**Before (TypeScript):**
```typescript
// packages/tax/src/agents/tax-corp-mt-026.ts
export const taxCorpMT = {
  name: "Malta Corporate Tax Agent",
  jurisdiction: "MT",
  // ... agent config
};
```

**After (YAML):**
```yaml
# agents.registry.yaml
- id: tax-compliance-mt-034
  category: tax
  name: "Malta Tax Compliance Agent"
  description: "Handles Malta corporate and personal tax compliance..."
  jurisdictions: ["MT"]
  standards:
    tax_laws: ["MT-CIT", "MT-PIT", "MT-VAT"]
  kb_scopes:
    - "tax:mt:compliance"
  tools: ["deepsearch", "supabase_semantic_search"]
  engine_preferences: { primary: "openai", fallback: "gemini" }
  routing_tags: ["malta", "compliance", "returns"]
```

### Step 4: Update Code References

**Before:**
```typescript
import { taxCorpMT } from "@prisma-glow/tax/agents/tax-corp-mt-026";

const result = await taxCorpMT.execute(query);
```

**After:**
```typescript
import { agentRouter } from "@prisma-glow/agents";

const result = await agentRouter.run({
  agentId: "tax-compliance-mt-034",
  input: query,
  metadata: { jurisdictionCode: "MT" }
});
```

### Step 5: Update API Routes

**Before:**
```typescript
app.post("/api/tax/malta", async (req, res) => {
  const result = await taxCorpMT.execute(req.body.query);
  res.json(result);
});
```

**After:**
```typescript
import agentRegistryRoutes from "./routes/agent-registry.js";

app.use("/api", agentRegistryRoutes);

// Now use:
// POST /api/agents/tax-compliance-mt-034/run
```

### Step 6: Update Frontend Code

**Before:**
```typescript
const response = await fetch("/api/tax/malta", {
  method: "POST",
  body: JSON.stringify({ query: "..." })
});
```

**After:**
```typescript
const response = await fetch("/api/agents/tax-compliance-mt-034/run", {
  method: "POST",
  body: JSON.stringify({ 
    message: "...",
    jurisdictionCode: "MT"
  })
});
```

## Migration Checklist

### Planning Phase
- [ ] Audit existing agent implementations
- [ ] Map agents to new schema
- [ ] Identify dependencies and integrations
- [ ] Plan rollout strategy (gradual vs. big bang)

### Implementation Phase
- [ ] Add agents to `agents.registry.yaml`
- [ ] Validate registry: `node scripts/agent-cli.mjs validate`
- [ ] Update backend code to use `agentRouter`
- [ ] Update API routes
- [ ] Update frontend code
- [ ] Update tests

### Testing Phase
- [ ] Test each agent individually
- [ ] Test search functionality
- [ ] Test engine fallback
- [ ] Integration tests
- [ ] Performance tests

### Deployment Phase
- [ ] Deploy to staging
- [ ] Smoke tests
- [ ] Monitor for errors
- [ ] Deploy to production
- [ ] Monitor metrics

### Cleanup Phase
- [ ] Remove old agent files (after validation)
- [ ] Update documentation
- [ ] Archive legacy code
- [ ] Update team documentation

## Example Migrations

### Example 1: Tax Agent

**Before:**
```typescript
// packages/tax/src/agents/tax-corp-mt-026.ts
export const taxCorpMT = {
  name: "Malta Corporate Tax",
  async execute(query: string) {
    // Implementation
  }
};

// Usage:
import { taxCorpMT } from "@prisma-glow/tax/agents/tax-corp-mt-026";
const result = await taxCorpMT.execute("Calculate tax");
```

**After:**
```yaml
# agents.registry.yaml
- id: tax-compliance-mt-034
  category: tax
  name: "Malta Tax Compliance Agent"
  # ... full config
```

```typescript
// Usage:
import { agentRouter } from "@prisma-glow/agents";
const result = await agentRouter.run({
  agentId: "tax-compliance-mt-034",
  input: "Calculate tax"
});
```

### Example 2: Audit Agent

**Before:**
```typescript
// packages/audit/src/agents/materiality.ts
export class MaterialityAgent {
  async compute(revenue: number) {
    // Implementation
  }
}
```

**After:**
```yaml
- id: audit-materiality-050
  category: audit
  name: "Materiality & Sampling Agent"
  # ... full config
```

```typescript
const result = await agentRouter.run({
  agentId: "audit-materiality-050",
  input: "Set materiality for €10M revenue"
});
```

## Rollback Plan

If issues arise, you can rollback:

1. Keep old agent files temporarily
2. Use feature flags to toggle between old/new
3. Maintain parallel implementations during transition
4. Monitor error rates and performance

```typescript
// Feature flag example
const useRegistry = process.env.USE_AGENT_REGISTRY === "true";

if (useRegistry) {
  result = await agentRouter.run({ agentId, input });
} else {
  result = await legacyAgent.execute(input);
}
```

## Common Issues

### Issue 1: Agent Not Found
**Symptom:** `Unknown agent: tax-compliance-mt-034`
**Solution:** Verify agent ID in registry, check spelling

### Issue 2: YAML Parse Error
**Symptom:** Registry fails to load
**Solution:** Validate YAML syntax, run `node scripts/agent-cli.mjs validate`

### Issue 3: Tool Not Available
**Symptom:** Agent execution fails
**Solution:** Implement tool executors (deepsearch, calculator, etc.)

## Performance Considerations

- Registry is loaded once and cached
- Agent creation happens at startup
- No performance impact vs. individual files
- Consider caching agent results at app level

## Support

For questions during migration:
- Review `/packages/agents/README.md`
- Run `node scripts/agent-cli.mjs --help`
- Check `/AGENT_REGISTRY_QUICK_REF.md`
- Contact development team

## Timeline

Recommended migration timeline:

**Week 1:** Planning and preparation
- Audit existing agents
- Map to registry schema
- Create migration plan

**Week 2:** Implementation
- Add agents to registry
- Update backend code
- Update API routes

**Week 3:** Testing
- Unit tests
- Integration tests
- Performance tests

**Week 4:** Deployment
- Deploy to staging
- Monitor and fix issues
- Deploy to production
- Monitor metrics

**Week 5:** Cleanup
- Remove old files
- Update documentation
- Team training

## Success Criteria

Migration is complete when:
- ✅ All agents in registry
- ✅ All code using `agentRouter`
- ✅ All tests passing
- ✅ API endpoints updated
- ✅ Frontend updated
- ✅ Documentation updated
- ✅ Old files removed
- ✅ Team trained
