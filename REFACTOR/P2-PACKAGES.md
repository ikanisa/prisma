# Shared Packages Audit & Documentation

**Job:** P2-PACKAGES  
**Version:** 1.0.0  
**Last Updated:** 2025-11-02  
**Purpose:** Comprehensive audit of shared packages, DTOs, design system, and API clients

---

## Overview

The Prisma Glow monorepo contains **15 shared packages** organized under `packages/` providing reusable code across applications and services.

### Package Categories

| Category | Packages | Purpose |
|----------|----------|---------|
| **UI/Design** | `ui` | Design system, components, tokens |
| **API/Types** | `api`, `api-client`, `types-finance` | API schemas, clients, domain types |
| **Configuration** | `system-config`, `config` | System config loaders |
| **Infrastructure** | `lib`, `platform`, `logger`, `logging` | Shared utilities |
| **Domain** | `tax`, `agents`, `prompts` | Domain-specific logic |
| **Development** | `dev-portal` | Developer tools |

---

## Package Inventory

### 1. @prisma-glow/ui

**Purpose:** Design system with reusable UI components  
**Status:** ✅ Aligned  
**Location:** `packages/ui/`

**Structure:**
```
packages/ui/
├── src/
│   ├── components/      # React components
│   ├── tokens/          # Design tokens (needs formalization)
│   └── utils/           # UI utilities
├── package.json
└── tsconfig.json
```

**Package Details:**
```json
{
  "name": "@prisma-glow/ui",
  "version": "0.0.1",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts"
}
```

**Build:** Uses `tsup` for ESM/CJS dual output

**Audit Findings:**

✅ **Strengths:**
- Dual ESM/CJS format for compatibility
- Proper TypeScript declarations
- Peer dependencies on React 18+
- Clean build with `tsup`

🔄 **Improvements Needed:**
1. **Formalize Design Tokens:** Create `src/tokens/` directory with:
   - `colors.ts` - Color palette from `config/ui_ux.yaml`
   - `typography.ts` - Font families, sizes, weights
   - `spacing.ts` - Spacing scale
   - `motion.ts` - Animation durations and easing
2. **Add Accessibility Utilities:** Create `src/a11y/` with:
   - Focus management utilities
   - ARIA helpers
   - Color contrast checkers
3. **Component Documentation:** Add Storybook or component catalog
4. **Test Coverage:** Add Vitest tests for components

**Recommended Structure:**
```
packages/ui/
├── src/
│   ├── components/
│   │   ├── Button/
│   │   ├── Input/
│   │   ├── Card/
│   │   └── index.ts
│   ├── tokens/
│   │   ├── colors.ts
│   │   ├── typography.ts
│   │   ├── spacing.ts
│   │   ├── motion.ts
│   │   └── index.ts
│   ├── a11y/
│   │   ├── focus.ts
│   │   ├── aria.ts
│   │   └── index.ts
│   └── index.ts
└── README.md
```

---

### 2. @prisma-glow/api

**Purpose:** API schemas and DTOs with Zod validators  
**Status:** ✅ Aligned  
**Location:** `packages/api/`

**Package Details:**
```json
{
  "name": "@prisma-glow/api",
  "version": "0.0.1",
  "exports": {
    ".": "./dist/index.js",
    "./schemas": "./dist/schemas/index.js"
  }
}
```

**Dependencies:**
- `zod` ^3.25.76 - Runtime validation

**Audit Findings:**

✅ **Strengths:**
- Uses Zod for type-safe validation
- Supports schema-specific imports
- TypeScript declarations

🔄 **Improvements Needed:**
1. **Expand Schema Coverage:** Add validators for all API endpoints
2. **Error Messages:** Customize Zod error messages for better UX
3. **Schema Documentation:** Document all schemas with JSDoc
4. **Validation Examples:** Add usage examples in README

---

### 3. @prisma-glow/api-client

**Purpose:** Typed HTTP client for API consumption  
**Status:** ✅ Aligned  
**Location:** `packages/api-client/`

**Structure:**
```
packages/api-client/
├── src/
│   ├── client.ts        # HTTP client implementation
│   └── types.ts         # Generated from OpenAPI
├── tests/
└── package.json
```

**Audit Findings:**

✅ **Strengths:**
- TypeScript types generated from OpenAPI
- Centralized API client
- Test coverage

🔄 **Improvements Needed:**
1. **Auth Token Injection:** Ensure automatic token refresh
2. **Error Normalization:** Consistent error handling across all endpoints
3. **Retry Logic:** Add exponential backoff for transient failures
4. **Request Interceptors:** Add logging, correlation IDs
5. **Documentation:** Usage guide with examples

**Recommended Implementation:**
```typescript
// packages/api-client/src/client.ts
import type { paths } from './types';

export class ApiClient {
  constructor(
    private baseUrl: string,
    private getAuthToken: () => Promise<string>
  ) {}

  async request<T>(
    path: string,
    options?: RequestInit
  ): Promise<T> {
    const token = await this.getAuthToken();
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Request-ID': crypto.randomUUID(),
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new ApiError(response);
    }

    return response.json();
  }
}
```

---

### 4. @prisma-glow/types-finance

**Purpose:** Domain-specific financial types  
**Status:** ✅ Aligned (Domain-specific)  
**Location:** `packages/types-finance/`

**Structure:**
```
packages/types-finance/
├── src/
│   ├── Money.ts
│   ├── JournalEntry.ts
│   ├── TaxRule.ts
│   └── index.ts
├── __tests__/
└── package.json
```

**Audit Findings:**

✅ **Strengths:**
- Domain-driven design
- Test coverage
- Pure TypeScript (no build required)

✅ **Keep As-Is:** This package serves a distinct purpose from generic schemas

---

### 5. @prisma-glow/system-config

**Purpose:** System configuration loader  
**Status:** ✅ Aligned  
**Location:** `packages/system-config/`

**Package Details:**
```json
{
  "name": "@prisma-glow/system-config",
  "description": "Shared helpers for loading and normalising system.yaml configuration."
}
```

**Audit Findings:**

✅ **Strengths:**
- Loads `config/system.yaml`
- Type-safe configuration access
- Centralized config management

🔄 **Improvements Needed:**
1. **Schema Validation:** Validate config against schema on load
2. **Environment Overrides:** Support environment-specific overrides
3. **Config Documentation:** Document all config keys
4. **Hot Reload:** Support config reload without restart (dev mode)

---

### 6. @prisma-glow/config

**Purpose:** Additional configuration utilities  
**Status:** ⚠️ Needs Clarification  
**Location:** `packages/config/`

**Question:** How does this differ from `@prisma-glow/system-config`?

**Recommendation:**
- If redundant, consolidate into `system-config`
- If distinct purpose, document the difference clearly

---

### 7. @prisma-glow/lib

**Purpose:** Shared utility library  
**Status:** ✅ Aligned  
**Location:** `packages/lib/`

**Package Details:**
```json
{
  "name": "@prisma-glow/lib",
  "exports": {
    ".": "./dist/index.js",
    "./*": "./dist/*.js"
  }
}
```

**Audit Findings:**

✅ **Strengths:**
- Wildcard exports for flexibility
- TypeScript build
- Shared across applications

🔄 **Improvements Needed:**
1. **Organization:** Create subdirectories by category (date, string, validation, etc.)
2. **Tree-shaking:** Ensure proper ESM exports for tree-shaking
3. **Documentation:** Document all exported utilities
4. **Test Coverage:** Add comprehensive tests

---

### 8. @prisma-glow/logger

**Purpose:** Logging utilities  
**Status:** ⚠️ Potential Duplicate  
**Location:** `packages/logger/`

**Dependencies:**
```json
{
  "dependencies": {
    "@prisma-glow/logging": "workspace:*"
  }
}
```

**Finding:** `logger` depends on `logging` - are these duplicates?

**Recommendation:**
- **Consolidate:** Merge `logger` and `logging` into single package
- **Or Document:** Clearly document the distinction if they serve different purposes

---

### 9. @prisma-glow/logging

**Purpose:** Logging infrastructure  
**Status:** ⚠️ Potential Duplicate  
**Location:** `packages/logging/`

**Recommendation:** See `@prisma-glow/logger` above. Investigate and consolidate if redundant.

---

### 10. @prisma-glow/platform

**Purpose:** Platform utilities and Supabase integration  
**Status:** ✅ Aligned  
**Location:** `packages/platform/`

**Dependencies:**
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.55.0",
    "@prisma-glow/lib": "workspace:*"
  }
}
```

**Audit Findings:**

✅ **Strengths:**
- Supabase integration layer
- Depends on shared lib
- Platform-specific utilities

🔄 **Improvements Needed:**
1. **Supabase Helpers:** Add typed helpers for common Supabase operations
2. **RLS Utilities:** Helper functions for RLS policy enforcement
3. **Storage Helpers:** Signed URL generation utilities
4. **Documentation:** Platform integration guide

---

### 11. @prisma-glow/tax

**Purpose:** Tax calculation utilities  
**Status:** ✅ Aligned (Domain-specific)  
**Location:** `packages/tax/`

**Audit Findings:**

✅ **Strengths:**
- Domain-specific tax logic
- TypeScript build

✅ **Keep As-Is:** Domain-specific package

---

### 12. @prisma-glow/agents

**Purpose:** Agent SDK and prompts  
**Status:** ✅ Aligned  
**Location:** `packages/agents/`

**Structure:**
```
packages/agents/
├── prompts/             # Prompt templates
└── src/                 # Agent SDK
```

**Audit Findings:**

✅ **Strengths:**
- Centralized agent prompts
- SDK for agent interactions

🔄 **Improvements Needed:**
1. **Prompt Versioning:** Track prompt versions
2. **Agent Testing:** Add evaluation framework
3. **Persona Loading:** Load personas from `config/agents.yaml`
4. **Documentation:** Agent development guide

---

### 13. @prisma-glow/prompts

**Purpose:** Prompt templates  
**Status:** ⚠️ Potential Duplicate  
**Location:** `packages/prompts/`

**Question:** How does this differ from `packages/agents/prompts/`?

**Recommendation:**
- If redundant, consolidate into `@prisma-glow/agents`
- If distinct, document the difference

---

### 14. @prisma-glow/dev-portal

**Purpose:** Developer tools and documentation  
**Status:** ✅ Aligned  
**Location:** `packages/dev-portal/`

**Audit Findings:**

✅ **Strengths:**
- Developer experience tools
- Internal documentation

🔄 **Improvements Needed:**
1. **API Documentation:** Integrate OpenAPI docs
2. **Component Catalog:** Link to Storybook
3. **Developer Guides:** Onboarding documentation

---

## Missing Package: @prisma-glow/schemas

**Recommendation:** Create new package for generic schemas (separate from domain-specific `types-finance`)

**Proposed Structure:**
```
packages/schemas/
├── src/
│   ├── request/
│   │   ├── auth.ts          # Auth request schemas
│   │   ├── documents.ts     # Document upload schemas
│   │   └── tasks.ts         # Task management schemas
│   ├── response/
│   │   ├── common.ts        # Common response structures
│   │   ├── errors.ts        # Error response schemas
│   │   └── pagination.ts    # Pagination schemas
│   ├── validation/
│   │   ├── email.ts
│   │   ├── phone.ts
│   │   └── currency.ts
│   └── index.ts
├── package.json
└── README.md
```

**Package.json:**
```json
{
  "name": "@prisma-glow/schemas",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc -b",
    "test": "vitest run"
  },
  "dependencies": {
    "zod": "^3.25.76"
  }
}
```

---

## Package Dependencies Graph

```
@prisma-glow/ui
  └─ (peer deps: react, react-dom)

@prisma-glow/api
  └─ zod

@prisma-glow/api-client
  └─ (none)

@prisma-glow/types-finance
  └─ (none)

@prisma-glow/system-config
  └─ yaml

@prisma-glow/config
  └─ (TBD - needs investigation)

@prisma-glow/lib
  └─ (none)

@prisma-glow/logger
  └─ @prisma-glow/logging

@prisma-glow/logging
  └─ (none)

@prisma-glow/platform
  ├─ @supabase/supabase-js
  └─ @prisma-glow/lib

@prisma-glow/tax
  └─ (none)

@prisma-glow/agents
  └─ (TBD)

@prisma-glow/prompts
  └─ (TBD)

@prisma-glow/dev-portal
  └─ (TBD)
```

---

## Action Items

### Priority 1: Clarify Duplicates

- [ ] **logger vs logging**: Investigate and consolidate or document difference
- [ ] **config vs system-config**: Clarify distinct purposes or merge
- [ ] **prompts vs agents/prompts**: Consolidate or document difference

### Priority 2: Enhance Existing Packages

#### @prisma-glow/ui
- [ ] Create `src/tokens/` with design token exports
- [ ] Add `src/a11y/` with accessibility utilities
- [ ] Add component tests
- [ ] Create README with component usage examples

#### @prisma-glow/api-client
- [ ] Implement auth token injection and refresh
- [ ] Add error normalization
- [ ] Add retry logic with exponential backoff
- [ ] Add request/response interceptors
- [ ] Create usage guide

#### @prisma-glow/system-config
- [ ] Add schema validation
- [ ] Support environment overrides
- [ ] Document all config keys
- [ ] Add hot reload for development

#### @prisma-glow/platform
- [ ] Add Supabase helper functions
- [ ] Add RLS utility functions
- [ ] Add signed URL generators
- [ ] Create platform integration guide

#### @prisma-glow/agents
- [ ] Implement prompt versioning
- [ ] Add agent evaluation framework
- [ ] Load personas from config/agents.yaml
- [ ] Create agent development guide

### Priority 3: Create New Packages

- [ ] Create `@prisma-glow/schemas` for generic validation schemas
- [ ] Separate from domain-specific `types-finance`

---

## Testing Strategy

### Current State

| Package | Tests | Coverage |
|---------|-------|----------|
| `ui` | ❌ None | 0% |
| `api` | ✅ Yes | Unknown |
| `api-client` | ✅ Yes | Unknown |
| `types-finance` | ✅ Yes | Unknown |
| `system-config` | ❌ None | 0% |
| `lib` | ❌ None | 0% |
| Others | ❓ Unknown | Unknown |

### Recommendations

1. **Add Vitest:** All packages should have `"test": "vitest run"` script
2. **Coverage Goals:** Aim for 70%+ coverage on utility packages
3. **Integration Tests:** Test package interactions
4. **Type Tests:** Use `tsd` or similar for type-level testing

---

## Build & Release

### Build Configuration

All packages use TypeScript with different build tools:
- **tsup:** `@prisma-glow/ui` (ESM + CJS)
- **tsc:** Most other packages (ESM only)

### Recommended Standards

1. **Consistent Build Tool:** Consider standardizing on `tsup` for better DX
2. **Watch Mode:** Add `"dev": "tsc -b --watch"` for development
3. **Clean Script:** Add `"clean": "rm -rf dist"` to all packages
4. **Pre-publish Checks:** Validate before publishing

---

## Documentation Requirements

Each package should have:

### README.md Template

```markdown
# @prisma-glow/[package-name]

Brief description of package purpose.

## Installation

\`\`\`bash
pnpm add @prisma-glow/[package-name]
\`\`\`

## Usage

\`\`\`typescript
import { something } from '@prisma-glow/[package-name]';

// Example usage
\`\`\`

## API Reference

### Function/Class Name

Description and usage.

## Development

\`\`\`bash
pnpm install
pnpm build
pnpm test
\`\`\`

## License

Private - Prisma Glow
```

---

## Summary

### Package Health

| Status | Count | Packages |
|--------|-------|----------|
| ✅ Healthy | 7 | ui, api, api-client, types-finance, platform, tax, dev-portal |
| 🔄 Needs Work | 3 | system-config, lib, agents |
| ⚠️ Investigate | 4 | config, logger, logging, prompts |
| ❌ Missing | 1 | schemas (generic) |

### Next Steps

1. **Investigate duplicates** (Priority 1)
2. **Enhance core packages** (ui, api-client, system-config)
3. **Create missing schemas package**
4. **Add comprehensive tests**
5. **Document all packages**

---

**Last Updated:** 2025-11-02  
**Maintainer:** Platform Team  
**Related:** `REFACTOR/plan.md`, `REFACTOR/map.md`
