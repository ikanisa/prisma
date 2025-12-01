# Agent Registry - Quick Reference Card

## 🚀 Quick Start

```typescript
import { agentRouter } from "@prisma-glow/agents";

// Run an agent
const result = await agentRouter.run({
  agentId: "tax-compliance-mt-034",
  input: "What are Malta tax filing deadlines?",
  metadata: { jurisdictionCode: "MT" }
});
```

## 📋 Agent Categories & IDs

### Tax (8)
- `tax-compliance-mt-034` - Malta Tax Compliance
- `tax-compliance-rw-035` - Rwanda Tax Compliance  
- `tax-payroll-mt-036` - Malta Payroll & Social Security
- `tax-payroll-rw-037` - Rwanda Payroll & Social Security
- `tax-wht-xborder-038` - Withholding Tax & Cross-Border
- `tax-excise-customs-039` - Excise & Customs
- `tax-incentives-040` - Tax Incentives & Investment
- `tax-risk-governance-041` - Tax Risk & Governance

### Audit (8)
- `audit-materiality-050` - Materiality & Sampling
- `audit-documentation-051` - Audit Documentation
- `audit-independence-052` - Independence & Ethics
- `audit-it-systems-053` - IT & Systems Audit
- `audit-internal-054` - Internal Audit & Compliance
- `audit-esg-055` - ESG & Sustainability Assurance
- `audit-forensic-056` - Forensic & Investigations
- `audit-public-sector-057` - Public Sector Audit

### Accounting (8)
- `acct-fininst-001` - Financial Instruments
- `acct-tax-001` - Income Taxes Accounting
- `acct-emp-001` - Employee Benefits
- `acct-prov-001` - Provisions & Contingent Liabilities
- `acct-impair-001` - Impairment & Fair Value
- `acct-fx-001` - FX & Hyperinflation
- `acct-sbp-001` - Share-based Payments
- `acct-agri-001` - Agriculture & Biological Assets

### Corporate (6)
- `corp-kyc-040` - KYC / AML & Beneficial Ownership
- `corp-board-041` - Board Meetings & Minutes
- `corp-lic-042` - Licensing & Regulatory Filings
- `corp-share-043` - Share Capital & Corporate Actions
- `corp-hr-044` - HR & Payroll Corporate Services
- `corp-migration-045` - Entity Migration & Cross-border

## 🔍 Search Methods

```typescript
// By category
const taxAgents = agentRouter.searchAgents({ category: "tax" });

// By jurisdiction
const maltaAgents = agentRouter.searchAgents({ jurisdiction: "MT" });

// By tags
const complianceAgents = agentRouter.searchAgents({ 
  tags: ["compliance", "returns"] 
});

// Combined
const results = agentRouter.searchAgents({
  category: "tax",
  jurisdiction: "MT",
  tags: ["compliance"]
});
```

## 🌐 REST API Endpoints

```bash
# List all agents
GET /api/agents

# Search agents
GET /api/agents/search?category=tax&jurisdiction=MT

# Get agent details
GET /api/agents/:agentId

# Run agent
POST /api/agents/:agentId/run
{
  "message": "Your query here",
  "jurisdictionCode": "MT",
  "forceEngine": "openai"  // optional
}
```

## 🛠️ Common Use Cases

### Malta Corporate Tax
```typescript
const result = await agentRouter.run({
  agentId: "tax-compliance-mt-034",
  input: "What is the corporate tax rate in Malta?",
  metadata: { jurisdictionCode: "MT" }
});
```

### Rwanda Payroll
```typescript
const result = await agentRouter.run({
  agentId: "tax-payroll-rw-037",
  input: "Calculate PAYE for monthly salary of 500,000 RWF",
  metadata: { jurisdictionCode: "RW" }
});
```

### Audit Planning
```typescript
const result = await agentRouter.run({
  agentId: "audit-materiality-050",
  input: "Set materiality for a company with €10M revenue"
});
```

### IFRS Accounting
```typescript
const result = await agentRouter.run({
  agentId: "acct-fininst-001",
  input: "How do I classify this derivative under IFRS 9?"
});
```

## 📁 File Locations

| Item | Path |
|------|------|
| Registry | `/agents.registry.yaml` |
| Package | `/packages/agents/` |
| Documentation | `/packages/agents/README.md` |
| API Routes | `/apps/gateway/src/routes/agent-registry.ts` |
| Tests | `/packages/agents/tests/` |

## 🔑 Key Types

```typescript
type AgentRegistryEntry = {
  id: string;
  category: "tax" | "audit" | "accounting" | "corporate";
  name: string;
  description: string;
  jurisdictions: string[];
  standards: Record<string, string[]>;
  kb_scopes: string[];
  tools: string[];
  engine_preferences: {
    primary: "openai" | "gemini";
    fallback?: "openai" | "gemini";
  };
  routing_tags: string[];
};
```

## 🎯 Available Tools

- `deepsearch` - Deep search across multiple sources
- `supabase_semantic_search` - Semantic search in knowledge base
- `supabase_keyword_search` - Keyword search in knowledge base
- `calculator` - Mathematical calculations

## 🧪 Testing

```bash
# Run tests
pnpm --filter @prisma-glow/agents test

# Typecheck
pnpm --filter @prisma-glow/agents typecheck

# Lint
pnpm --filter @prisma-glow/agents lint
```

## 📊 Jurisdictions

- `MT` - Malta
- `RW` - Rwanda
- `GLOBAL` - Worldwide/Universal
- `EU` - European Union

## 🏷️ Common Tags

**Tax**: compliance, returns, filing, payroll, paye, social-security, withholding-tax, cross-border, treaties, excise, customs, incentives, investment, risk, governance

**Audit**: materiality, sampling, documentation, workpapers, independence, ethics, itgc, systems, internal-audit, compliance, esg, sustainability, forensic, fraud, investigations, public-sector, issai, government

**Accounting**: ifrs9, hedging, financial-instruments, deferred-tax, ias12, ias19, pensions, employee-benefits, ias37, provisions, contingent-liabilities, ias36, ifrs13, impairment, fair-value, ias21, ias29, fx, hyperinflation, ifrs2, share-based-payments, options, ias41, agriculture, biological-assets

**Corporate**: kyc, aml, beneficial-ownership, board, minutes, resolutions, licence, regulatory, filings, share-capital, dividends, corporate-actions, hr, employment, contracts, payroll, migration, redomiciliation, holding

## 💡 Pro Tips

1. **Use jurisdiction context**: Always pass `jurisdictionCode` in metadata for more accurate responses
2. **Engine override**: Use `forceEngine` to test different AI engines
3. **Combine searches**: Use multiple search criteria for precision
4. **Cache results**: Agent creation is done once at startup
5. **Monitor usage**: Track agent calls for optimization

## 🔗 Related Docs

- Full README: `/packages/agents/README.md`
- Implementation Guide: `/AGENT_REGISTRY_IMPLEMENTATION.md`
- Registry YAML: `/agents.registry.yaml`
