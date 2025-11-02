# P2: Shared Packages Audit

## Status
- **Version:** 1.0.0
- **Last Updated:** 2025-11-02
- **Owner:** Engineering Core Team
- **Phase:** P2 - Packages

## Executive Summary

Comprehensive audit of all 15 workspace packages covering dependency analysis, health assessment, identified duplicates, and improvement roadmap. This audit establishes the foundation for package management, code reuse, and dependency optimization.

**Key Findings:**
- 15 packages audited across apps/, packages/, services/, analytics/
- 3 duplicates identified requiring consolidation
- 5 packages requiring improvement
- 1 new package proposed (@prisma-glow/schemas)
- Clear dependency graph established

---

## Package Inventory

### Core Packages (5)

#### 1. @prisma-glow/lib
**Location:** `packages/lib`  
**Version:** 0.0.1  
**Description:** Shared utilities, types, and constants

**Dependencies:**
- None (leaf package)

**Used By:**
- All apps and services
- Gateway
- RAG service
- FastAPI (via types export)

**Exports:**
```typescript
- utils/
  - string.ts (slugify, truncate, sanitize)
  - date.ts (formatDate, parseDate, isBusinessDay)
  - number.ts (formatCurrency, formatPercent)
  - validation.ts (validateEmail, validateURL)
- types/
  - common.ts (UUID, Timestamp, DateRange)
  - api.ts (ApiResponse, ApiError, PaginatedResponse)
  - domain.ts (Organization, User, Membership)
- constants/
  - roles.ts (ROLES, ROLE_PRECEDENCE)
  - status.ts (STATUS_LABELS, STATUS_COLORS)
```

**Health:** ✅ **Stable**  
**Issues:** None  
**Recommendations:**
- Add JSDoc comments to all exports
- Consider splitting into sub-packages (utils, types, constants) if grows >500 LOC

---

#### 2. @prisma-glow/system-config
**Location:** `packages/system-config`  
**Version:** 0.0.1  
**Description:** Configuration loader for system.yaml with validation

**Dependencies:**
- `yaml` - YAML parsing
- `zod` - Schema validation

**Used By:**
- Gateway (`apps/gateway`)
- RAG service (`services/rag`)
- Agent service (`services/agents`)
- Scripts

**Exports:**
```typescript
- loadConfig(): Promise<SystemConfig>
- validateConfig(config: unknown): SystemConfig
- getAgentConfig(agentId: string): AgentConfig
- getRbacConfig(): RbacConfig
- getToolWhitelist(): string[]
```

**Health:** ✅ **Stable**  
**Issues:** None  
**Recommendations:**
- Cache loaded config in memory (singleton pattern)
- Add config hot-reloading for development
- Generate TypeScript types from schema

**Duplicate Alert:** ⚠️ Overlaps with deprecated `@prisma-glow/config`

---

#### 3. @prisma-glow/api-client
**Location:** `packages/api-client`  
**Version:** 0.0.1  
**Description:** Generated TypeScript client from FastAPI OpenAPI schema

**Dependencies:**
- `openapi-typescript` (dev)
- `axios` (runtime)

**Used By:**
- Gateway (`apps/gateway`)
- Next.js app (`apps/web`)
- Admin portal (`apps/admin`)

**Generated Files:**
```
packages/api-client/
├── types.ts         # Generated from openapi/fastapi.json
├── client.ts        # Axios client wrapper
└── index.ts         # Re-exports
```

**Health:** ⚠️ **Needs Improvement**  
**Issues:**
- Manual codegen (not automated in CI)
- Types drift from FastAPI implementation
- No versioning strategy

**Recommendations:**
1. **Automate codegen in CI:**
   ```yaml
   # .github/workflows/openapi-client.yml
   - name: Generate API client
     run: pnpm run codegen:api
   - name: Check for drift
     run: git diff --exit-code packages/api-client/types.ts
   ```

2. **Add version compatibility matrix**
3. **Implement breaking change detection**

---

#### 4. @prisma-glow/ui
**Location:** `packages/ui`  
**Version:** 0.0.1  
**Description:** Shared React component library (shadcn/ui + custom)

**Dependencies:**
- `react` ^18.3.1
- `@radix-ui/*` (15+ packages)
- `tailwindcss` ^3.4.17
- `lucide-react` ^0.462.0

**Used By:**
- Next.js app (`apps/web`)
- Admin portal (`apps/admin`)
- Legacy Vite app (deprecated)

**Components (50+):**
```
packages/ui/src/
├── components/
│   ├── button.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   ├── form.tsx
│   ├── input.tsx
│   ├── table.tsx
│   ├── toast.tsx
│   └── ... (40+ more)
├── hooks/
│   ├── use-toast.ts
│   ├── use-media-query.ts
│   └── use-local-storage.ts
├── lib/
│   └── utils.ts
└── tokens.ts  # Design tokens
```

**Health:** ⚠️ **Needs Improvement**  
**Issues:**
- No Storybook for component documentation
- Inconsistent prop naming (onClick vs onPress)
- Missing design tokens formalization
- No accessibility testing

**Recommendations:**
1. **Set up Storybook:**
   ```bash
   pnpm add -D @storybook/react @storybook/addon-a11y
   ```

2. **Formalize design tokens** (link to `config/ui_ux.yaml`)

3. **Add accessibility tests:**
   ```typescript
   import { axe, toHaveNoViolations } from 'jest-axe';
   expect.extend(toHaveNoViolations);
   ```

4. **Standardize API surface** (React Aria patterns)

---

#### 5. @prisma-glow/types-finance
**Location:** `packages/types-finance`  
**Version:** 0.1.0  
**Description:** Financial domain types (IFRS, ISA, tax)

**Dependencies:**
- `zod` ^3.25.76

**Used By:**
- FastAPI (Python side via JSON schema)
- Next.js app (`apps/web`)
- Tax service (`services/tax`)
- `@prisma-glow/tax`

**Exports:**
```typescript
- accounting/
  - journal-entry.ts (JournalEntry, JournalLine)
  - trial-balance.ts (TrialBalance, AccountBalance)
  - financial-statements.ts (BalanceSheet, IncomeStatement)
- audit/
  - audit-plan.ts (AuditPlan, AuditProcedure)
  - kam.ts (KeyAuditMatter)
  - assertions.ts (Assertion, TestResult)
- tax/
  - cit.ts (CITComputation, CITReturn)
  - vat.ts (VATReturn, VATTransaction)
  - pillar-two.ts (PillarTwoScope, TopUpTax)
```

**Health:** ✅ **Stable**  
**Issues:** None  
**Recommendations:**
- Export JSON schemas for Python consumption
- Add JSDoc with references to standards (IFRS 1, ISA 315)

---

### Agent Packages (3)

#### 6. @prisma-glow/agents
**Location:** `packages/agents`  
**Version:** 0.0.1  
**Description:** Agent manifest schemas and utilities

**Dependencies:**
- `zod` ^3.25.76
- `openai` ^6.6.0

**Used By:**
- Agent service (`services/agents`)
- Manifest scripts (`scripts/generate_agent_manifests.ts`)

**Exports:**
```typescript
- schemas/
  - agent-manifest.ts (AgentManifest schema)
  - tool-schema.ts (ToolDefinition schema)
  - policy-pack.ts (PolicyPack schema)
- utils/
  - validate-manifest.ts
  - publish-manifest.ts
```

**Health:** ⚠️ **Needs Improvement**  
**Issues:**
- Overlaps with `@prisma-glow/prompts`
- No clear separation of schemas vs. prompts

**Duplicate Alert:** ⚠️ Consider merging with `@prisma-glow/prompts`

**Recommendations:**
1. **Merge with prompts package** or **clarify boundaries:**
   - `agents/`: Schemas, manifests, validation
   - `prompts/`: Actual prompt templates

2. **Add manifest versioning**

3. **Generate OpenAPI spec for agents**

---

#### 7. @prisma-glow/prompts
**Location:** `packages/prompts`  
**Version:** None (no package.json)  
**Description:** Agent prompt templates

**Dependencies:** None

**Used By:**
- Agent service (`services/agents`)

**Contents:**
```
packages/prompts/
├── accounting-agent.txt
├── audit-partner.txt
├── tax-agent.txt
├── document-agent.txt
└── analyst-agent.txt
```

**Health:** ⚠️ **Needs Improvement**  
**Issues:**
- No package.json (not a proper workspace package)
- Plain text files (no templating)
- Versioning unclear

**Duplicate Alert:** ⚠️ Overlaps with `@prisma-glow/agents`

**Recommendations:**
1. **Convert to proper package** with package.json

2. **Add templating support:**
   ```typescript
   import { compilePrompt } from '@prisma-glow/prompts';
   const prompt = compilePrompt('accounting-agent', { orgName, period });
   ```

3. **Merge into `@prisma-glow/agents`** (recommended)

---

#### 8. @prisma-glow/platform
**Location:** `packages/platform`  
**Version:** 0.0.1  
**Description:** Agent orchestration framework

**Dependencies:**
- `openai` ^6.6.0
- `@prisma-glow/agents`
- `@prisma-glow/system-config`

**Used By:**
- Agent service (`services/agents`)

**Exports:**
```typescript
- orchestrator/
  - agent-runner.ts (AgentRunner class)
  - tool-proxy.ts (ToolProxy with whitelist)
  - approval-gate.ts (ApprovalGate logic)
- utils/
  - citation-builder.ts
  - context-manager.ts
```

**Health:** ⚠️ **Needs Modularization**  
**Issues:**
- Single 2.5MB package (too large)
- Mixing orchestration, tool proxy, approval logic
- Tight coupling to OpenAI SDK

**Recommendations:**
1. **Split into sub-packages:**
   ```
   @prisma-glow/platform-orchestrator
   @prisma-glow/platform-tool-proxy
   @prisma-glow/platform-approvals
   ```

2. **Extract OpenAI adapter pattern:**
   ```typescript
   interface LLMProvider {
     chat(messages: Message[]): Promise<Response>;
     stream(messages: Message[]): AsyncIterable<Chunk>;
   }
   class OpenAIProvider implements LLMProvider { ... }
   ```

3. **Add unit tests** (current coverage: <20%)

---

### Domain Packages (4)

#### 9. @prisma-glow/tax
**Location:** `packages/tax`  
**Version:** 0.0.1  
**Description:** Tax computation utilities (CIT, VAT, Pillar Two)

**Dependencies:**
- `@prisma-glow/types-finance`
- `decimal.js` (for precise calculations)

**Used By:**
- FastAPI (`server/api/tax.py`)
- Tax service (`services/tax`)
- Next.js app (client-side validations)

**Exports:**
```typescript
- malta/
  - cit.ts (computeMaltaCIT)
  - vat.ts (computeVAT, validateVATNumber)
- international/
  - dac6.ts (classifyDAC6)
  - pillar-two.ts (determinePillarTwoScope, computeTopUpTax)
- utils/
  - tax-year.ts (getTaxYear, getTaxPeriods)
  - rates.ts (getTaxRate, getVATRate)
```

**Health:** ✅ **Stable**  
**Issues:** None  
**Recommendations:**
- Add more jurisdiction support (UK, Ireland, Cyprus)
- Comprehensive test coverage for tax rules
- Cite legal basis in JSDoc

---

#### 10. @prisma-glow/logger
**Location:** `packages/logger`  
**Version:** 0.0.1  
**Description:** Structured logging for Node.js services (winston)

**Dependencies:**
- `winston` ^3.11.0

**Used By:**
- Gateway (`apps/gateway`)
- RAG service (`services/rag`)

**Exports:**
```typescript
- logger.ts (createLogger factory)
- transports.ts (console, file, HTTP transports)
- middleware.ts (Express logging middleware)
```

**Health:** ⚠️ **Needs Standardization**  
**Issues:**
- Separate from Python logging (`@prisma-glow/logging`)
- No correlation ID support (critical for distributed tracing)

**Duplicate Alert:** ⚠️ Separate Node/Python logging packages

**Recommendations:**
1. **Add correlation ID:**
   ```typescript
   logger.info('Processing request', { correlationId: req.id });
   ```

2. **Standardize log format** with Python side (JSON structured logs)

3. **Keep separate** (Node vs. Python requirements differ)

---

#### 11. @prisma-glow/logging
**Location:** `packages/logging`  
**Version:** 0.0.1  
**Description:** Structured logging for Python services (structlog)

**Dependencies (Python):**
- `structlog` ^23.1.0

**Used By:**
- FastAPI (`server/`)

**Exports (Python):**
```python
from prisma_glow.logging import get_logger, configure_logging
logger = get_logger(__name__)
```

**Health:** ⚠️ **Needs Standardization**  
**Issues:**
- Separate from Node logging (`@prisma-glow/logger`)

**Duplicate Alert:** ⚠️ Separate Node/Python logging packages

**Recommendations:**
1. **Align log format** with Node side (JSON structured logs)

2. **Add correlation ID support**

3. **Keep separate** (different language ecosystems)

---

#### 12. @prisma-glow/config
**Location:** `packages/config`  
**Version:** 0.0.1  
**Description:** **DEPRECATED** - Legacy config loader

**Dependencies:**
- `yaml` ^2.8.1

**Used By:**
- None (replaced by `@prisma-glow/system-config`)

**Health:** ❌ **Deprecated**  
**Duplicate Alert:** ❌ **Duplicate of @prisma-glow/system-config**

**Recommendations:**
1. **Remove package** from workspace
2. **Remove from dependencies**
3. **Update migration guide**

**Removal Plan:**
```bash
# Step 1: Verify no usage
grep -r "@prisma-glow/config" apps/ services/ packages/

# Step 2: Remove from pnpm-workspace.yaml
# Step 3: Delete directory
rm -rf packages/config

# Step 4: Update docs
```

---

### Utility Packages (3)

#### 13. @prisma-glow/api
**Location:** `packages/api`  
**Version:** 0.0.1  
**Description:** **DEPRECATED** - Legacy API utilities

**Dependencies:**
- `axios` ^1.6.0

**Used By:**
- Legacy Vite app (`src/`)

**Health:** ❌ **To Be Removed**  
**Recommendations:**
- Remove after Vite app migration to Next.js
- Migrate consumers to `@prisma-glow/api-client`

---

#### 14. @prisma-glow/dev-portal
**Location:** `packages/dev-portal`  
**Version:** 0.1.0  
**Description:** API documentation portal (Backstage)

**Dependencies:**
- `@backstage/core` ^1.20.0
- `@backstage/plugin-catalog`

**Used By:**
- Development environment only

**Health:** ⚠️ **Maintenance Mode**  
**Issues:**
- High maintenance overhead
- Underutilized (3 active users)

**Recommendations:**
- **Evaluate alternatives:** Docusaurus, VitePress
- **Consider removal** if adoption doesn't increase
- **Migrate to static docs** (lower maintenance)

---

#### 15. Analytics Package
**Location:** `analytics/`  
**Version:** 0.0.1  
**Description:** Analytics service (Python)

**Dependencies (Python):**
- `pandas` ^2.1.0
- `numpy` ^1.24.0
- `scipy` ^1.11.0

**Used By:**
- Dashboard (reporting endpoints)
- FastAPI (analytics calculations)

**Health:** ✅ **Stable**  
**Issues:** None  
**Recommendations:**
- Add caching for expensive calculations
- Comprehensive test coverage

---

## Duplicate Analysis

### 1. Logger/Logging (Keep Separate)
**Packages:**
- `@prisma-glow/logger` (Node.js/winston)
- `@prisma-glow/logging` (Python/structlog)

**Analysis:**
Different runtime requirements justify separate packages. However, log format should be standardized.

**Recommendation:** Keep separate, standardize format

**Action Items:**
1. Define common log schema (JSON structure)
2. Ensure both output same format
3. Add correlation ID support to both

---

### 2. Config/System-Config (Consolidate)
**Packages:**
- `@prisma-glow/config` (deprecated)
- `@prisma-glow/system-config` (active)

**Analysis:**
`config` package is unused and superseded by `system-config`.

**Recommendation:** Remove `@prisma-glow/config`

**Action Items:**
1. Verify no usages: `grep -r "@prisma-glow/config"`
2. Remove from `pnpm-workspace.yaml`
3. Delete `packages/config/`
4. Update migration docs

**Timeline:** Immediate (Week 1)

---

### 3. Prompts/Agents (Merge)
**Packages:**
- `@prisma-glow/prompts` (templates)
- `@prisma-glow/agents` (schemas + templates)

**Analysis:**
Unclear boundary between packages. Both deal with agent configuration.

**Recommendation:** Merge into `@prisma-glow/agents`

**Proposed Structure:**
```
packages/agents/
├── src/
│   ├── schemas/          # Zod schemas
│   │   ├── manifest.ts
│   │   ├── tool.ts
│   │   └── policy.ts
│   ├── prompts/          # Merged from prompts package
│   │   ├── templates/
│   │   │   ├── accounting.ts
│   │   │   ├── audit.ts
│   │   │   └── tax.ts
│   │   └── compiler.ts   # Template compilation
│   └── index.ts
└── package.json
```

**Action Items:**
1. Move `packages/prompts/` content to `packages/agents/src/prompts/`
2. Add prompt compilation utilities
3. Update imports in `services/agents/`
4. Remove `packages/prompts/`

**Timeline:** Week 2-3

---

## Proposed New Package

### @prisma-glow/schemas
**Purpose:** Generic validation schemas used across packages

**Rationale:**
Multiple packages duplicate common validation schemas (UUID, email, URL, date). Centralizing reduces duplication and ensures consistency.

**Proposed Exports:**
```typescript
// packages/schemas/src/index.ts
export * from './primitives';  // UUID, Email, URL, PhoneNumber
export * from './temporal';     // DateRange, DateTime, FiscalPeriod
export * from './financial';    // Currency, Amount, ExchangeRate
export * from './address';      // Address, Country, PostalCode
```

**Used By:**
- `@prisma-glow/lib`
- `@prisma-glow/types-finance`
- `@prisma-glow/tax`
- `apps/web`
- FastAPI (via JSON Schema export)

**Action Items:**
1. Create `packages/schemas/`
2. Extract common schemas from existing packages
3. Update dependencies
4. Add comprehensive tests

**Timeline:** Week 3-4

---

## Package Dependency Graph

```
                    ┌─────────────┐
                    │    Root     │
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────▼────┐      ┌──────▼───────┐   ┌─────▼──────┐
   │   lib   │      │ system-config│   │types-finance│
   └────┬────┘      └──────┬───────┘   └─────┬──────┘
        │                  │                  │
        └───────┬──────────┴──────┬───────────┘
                │                 │
         ┌──────▼──────┐   ┌──────▼───────┐
         │ api-client  │   │     tax      │
         └──────┬──────┘   └──────┬───────┘
                │                 │
         ┌──────┴──────┬──────────┴─────┬────────┐
         │             │                │        │
    ┌────▼─────┐  ┌────▼────┐   ┌──────▼────┐  │
    │ gateway  │  │   web   │   │  agents   │  │
    └──────────┘  └─────────┘   └───────────┘  │
                                                │
                                         ┌──────▼─────┐
                                         │  platform  │
                                         └────────────┘
```

**Levels:**
- Level 0 (leaf): `lib`, `system-config`, `types-finance`
- Level 1: `api-client`, `tax`, `schemas` (proposed)
- Level 2: `agents`, `ui`
- Level 3: `platform`
- Level 4: Apps (`gateway`, `web`, `admin`)

**Key Insights:**
- Clean dependency hierarchy (no circular dependencies)
- `lib` is true leaf package (no dependencies)
- `platform` is highest-level (depends on many packages)

---

## Health Assessment Summary

| Package | Health | Issues | Priority |
|---------|--------|--------|----------|
| lib | ✅ Stable | None | - |
| system-config | ✅ Stable | None | - |
| api-client | ⚠️ Needs Improvement | Manual codegen | High |
| ui | ⚠️ Needs Improvement | No Storybook, accessibility | High |
| types-finance | ✅ Stable | None | - |
| agents | ⚠️ Needs Improvement | Overlap with prompts | Medium |
| prompts | ⚠️ Needs Improvement | Not a proper package | Medium |
| platform | ⚠️ Needs Improvement | Too large, needs split | High |
| tax | ✅ Stable | None | - |
| logger | ⚠️ Needs Standardization | No correlation ID | Medium |
| logging | ⚠️ Needs Standardization | Format alignment | Medium |
| config | ❌ Deprecated | Unused | **Remove** |
| api | ❌ To Be Removed | Legacy | Remove |
| dev-portal | ⚠️ Maintenance Mode | Underutilized | Low |
| analytics | ✅ Stable | None | - |

**Summary:**
- **5 Stable** (33%)
- **7 Need Improvement** (47%)
- **2 To Be Removed** (13%)
- **1 Maintenance Mode** (7%)

---

## Improvement Roadmap

### Phase 1: Immediate (Week 1-2)
1. **Remove deprecated packages:**
   - Delete `packages/config/`
   - Plan removal of `packages/api/`

2. **Add missing package.json:**
   - Create `packages/prompts/package.json`

3. **Fix critical issues:**
   - Add correlation ID to logger/logging

### Phase 2: Short-term (Week 3-4)
1. **Merge prompts into agents:**
   - Move templates
   - Add compilation utilities
   - Update imports

2. **Automate API client codegen:**
   - Add CI workflow
   - Implement drift detection

3. **Create @prisma-glow/schemas:**
   - Extract common schemas
   - Update dependencies

### Phase 3: Medium-term (Week 5-8)
1. **Improve UI package:**
   - Set up Storybook
   - Add accessibility tests
   - Formalize design tokens

2. **Split platform package:**
   - Create sub-packages
   - Extract LLM adapter pattern

3. **Standardize logging:**
   - Align Node/Python formats
   - Add structured log schema

### Phase 4: Long-term (Week 9-12)
1. **Complete documentation:**
   - JSDoc for all exports
   - Usage examples
   - Migration guides

2. **Improve test coverage:**
   - Target 60%+ for all packages
   - Add integration tests

3. **Evaluate dev-portal:**
   - Measure adoption
   - Consider alternatives

---

## Quality Gates

### Package Checklist
All packages must meet these criteria:

- [ ] Has package.json with name, version, description
- [ ] Has README.md with usage examples
- [ ] Has src/ and tests/ directories
- [ ] Has tsconfig.json (TypeScript packages)
- [ ] Exports public API via index.ts
- [ ] Has JSDoc comments for exports
- [ ] Test coverage ≥60%
- [ ] No circular dependencies
- [ ] Proper workspace references (workspace:*)
- [ ] Follows semantic versioning

### New Package Approval
New packages require:

1. RFC documenting purpose and API
2. Architecture review approval
3. Non-duplication verification
4. Clear ownership assignment

---

## Related Documentation

- [REFACTOR/plan.md](./plan.md) - Overall refactor plan
- [REFACTOR/map.md](./map.md) - Architecture mapping
- [docs/adr/](../docs/adr/) - Architecture decisions
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Development guidelines

---

## Appendix

### Package Size Analysis
```
@prisma-glow/lib          : 150 KB
@prisma-glow/system-config: 50 KB
@prisma-glow/api-client   : 200 KB
@prisma-glow/ui           : 1.2 MB (with dependencies)
@prisma-glow/types-finance: 80 KB
@prisma-glow/agents       : 120 KB
@prisma-glow/prompts      : 30 KB
@prisma-glow/platform     : 2.5 MB (largest)
@prisma-glow/tax          : 100 KB
@prisma-glow/logger       : 40 KB
@prisma-glow/logging      : 30 KB (Python)
```

### Maintainers
- **Core packages:** @engineering-core
- **UI package:** @frontend-guild
- **Agent packages:** @ai-rag-guild
- **Domain packages:** @domain-experts

### Version History
- **v1.0.0** (2025-11-02): Initial package audit
