# Repository Structure Map
## Current → Target Architecture Mapping

**Version:** 1.0.0  
**Date:** 2025-11-02  
**Purpose:** Document the mapping between current repository structure and target architecture per Full-Stack Refactor Playbook

---

## Overview

This document maps the existing Prisma Glow repository structure to the target architecture defined in the Full-Stack Refactor Playbook. It identifies:

1. **Aligned:** Components that match target architecture
2. **Needs Documentation:** Components that exist but need enhanced docs
3. **Needs Clarification:** Components with unclear roles
4. **Missing:** Components required by playbook but not present
5. **Legacy:** Components that may be superseded

---

## High-Level Comparison

| Playbook Target | Current Location | Status | Notes |
|----------------|------------------|--------|-------|
| `apps/client` | `apps/web` | ✅ Aligned | Next.js PWA for operations |
| `apps/admin` | `apps/admin` | ✅ Aligned | Admin governance PWA |
| `services/api` | `services/api` | ✅ Aligned | Controllers/services/adapters |
| `services/agents` | `services/agents` | ✅ Aligned | Agent SDK wrappers |
| `services/rag` | `services/rag` | ✅ Aligned | Retrieval layer |
| `packages/ui` | `packages/ui` | ✅ Aligned | Design system |
| `packages/schemas` | `packages/types-finance` | 🔄 Partial | Need generic schemas package |
| `packages/config` | `packages/system-config` + `packages/config` | ✅ Aligned | Multiple config packages |
| `packages/api` | `packages/api-client` | ✅ Aligned | Typed API client |
| `supabase/` | `supabase/` | ✅ Aligned | Migrations, functions, storage |
| `config/` | `config/` | 🔄 Needs Enhancement | Need agents.yaml, ui_ux.yaml |
| `STANDARDS/` | `STANDARDS/` | ✅ Aligned | Policy, templates, traceability |
| `GO-LIVE/` | `GO-LIVE/` | ✅ Aligned | Scorecards, runbooks |
| `REFACTOR/` | `REFACTOR/` | ✅ **NEW** | This directory |
| `SECURITY/` | - | ❌ Missing | Need dedicated security docs |

---

## Detailed Mapping

### 1. Applications Layer

#### Target: `apps/client` (Client PWA)
**Current:** `apps/web/`

**Status:** ✅ **Aligned**

**Structure:**
```
apps/web/
├── app/                 # Next.js app router
├── components/          # React components
├── hooks/               # Custom React hooks
├── lib/                 # Utilities and helpers
├── pages/               # Legacy pages router (migrate to app/)
├── prisma/              # Prisma schema and client
├── public/              # Static assets
├── stores/              # Zustand state management
├── agents/              # Agent integrations
├── integrations/        # Third-party integrations
├── i18n/                # Internationalization
└── tests/               # Test files
```

**Playbook Requirements:**
- ✅ Dashboard with KPIs and suggested actions
- ✅ Zero-typing onboarding
- ✅ Document management (repo tree, grid, preview)
- ✅ Task management
- ✅ Domain consoles (close, audit, tax)
- ✅ Assistant dock with chat (⌘K hotkey)
- 🔄 Voice push-to-talk (needs validation)
- ✅ PWA manifest and service worker

**Action Items:**
- [ ] Document assistant dock implementation
- [ ] Validate voice features
- [ ] Ensure all domain consoles meet playbook specs
- [ ] Confirm PWA performance budgets (route ≤250KB, total ≤700KB, LCP ≤1800ms)

---

#### Target: `apps/admin` (Admin Panel PWA)
**Current:** `apps/admin/`

**Status:** ✅ **Aligned**

**Structure:**
```
apps/admin/
├── public/              # Static assets
├── src/                 # Source code
│   ├── components/      # Admin UI components
│   ├── pages/           # Admin pages
│   └── utils/           # Utilities
└── tests/               # Test files
```

**Playbook Requirements:**
- 🔄 Overview dashboard
- 🔄 IAM (Identity & Access Management)
- 🔄 Permissions (Roles & Permissions matrix editor)
- 🔄 Agents & Tools configuration
- 🔄 Knowledge & RAG management
- 🔄 Workflows & Approvals
- 🔄 Domain settings
- 🔄 Jobs & Integrations (webhooks)
- 🔄 Settings & feature flags
- 🔄 Telemetry & logs dashboard
- 🔄 Traceability matrix editor

**Action Items:**
- [ ] Audit existing admin pages
- [ ] Document page-by-page functionality
- [ ] Identify gaps vs. playbook requirements
- [ ] Validate PWA configuration
- [ ] Confirm accessibility (Lighthouse ≥90, axe critical = 0)

---

#### Additional App: `apps/staff`
**Current:** `apps/staff/`

**Status:** ❓ **Needs Clarification**

**Structure:**
```
apps/staff/
├── public/              # Static assets
├── src/                 # Source code
└── tests/               # Test files
```

**Questions:**
- Is this a duplicate of `apps/web` or does it serve a distinct purpose?
- Should it be consolidated with client PWA?
- Does it represent a legacy version?

**Action Items:**
- [ ] Document purpose and users of staff app
- [ ] Determine if it should be consolidated or maintained separately
- [ ] Update architecture docs to clarify its role

---

#### Additional App: `apps/lib`
**Current:** `apps/lib/`

**Status:** ❓ **Needs Clarification**

**Structure:**
```
apps/lib/
└── audit/               # Audit utilities
```

**Questions:**
- Why is this under apps/ rather than packages/?
- Should it be moved to packages/lib?

**Action Items:**
- [ ] Review contents and purpose
- [ ] Consider moving to appropriate packages/ location

---

#### Gateway: `apps/gateway`
**Current:** `apps/gateway/`

**Status:** ✅ **Aligned**

**Structure:**
```
apps/gateway/
├── routes/              # Route definitions
└── src/                 # Gateway source code
```

**Purpose:** Express.js API gateway that proxies to FastAPI backend

**Playbook Requirements:**
- ✅ Correlation ID middleware
- ✅ RBAC guards at route entry
- ✅ Structured errors with normalization
- ✅ Tool proxy namespace enforcement

**Action Items:**
- [ ] Document tool proxy whitelist
- [ ] Create API gateway architecture diagram
- [ ] Document routing and proxy rules

---

### 2. Services Layer

#### Target: `services/api` (Service/API Layer)
**Current:** `services/api/`

**Status:** ✅ **Aligned**

**Structure:**
```
services/api/
└── src/
    ├── controllers/     # Route handlers
    ├── services/        # Business logic
    └── adapters/        # External integrations
```

**Playbook Requirements:**
- ✅ Controllers/services/adapters pattern
- ✅ Tool proxy namespace (/api/tools/*)
- ✅ Structured errors
- ✅ Correlation IDs
- ✅ RBAC guards

**Action Items:**
- [ ] Document controller → service → adapter flow
- [ ] Create tool proxy documentation
- [ ] Document whitelisted tools in config/agents.yaml

---

#### Target: `services/agents` (Agent Orchestration)
**Current:** `services/agents/`

**Status:** ✅ **Aligned**

**Structure:**
```
services/agents/
├── policy/              # Policy definitions
└── tests/               # Agent tests
```

**Playbook Requirements:**
- ✅ Server-side agent SDK wrappers
- ✅ Persona and policy packs
- ✅ Tool proxy whitelist enforcement
- ✅ Citations enforcement

**Action Items:**
- [ ] Document agent orchestration patterns
- [ ] Document persona/policy loading
- [ ] Create agent evaluation framework docs

---

#### Target: `services/rag` (RAG/Retrieval Layer)
**Current:** `services/rag/`

**Status:** ✅ **Aligned**

**Structure:**
```
services/rag/
├── knowledge/           # Knowledge base management
├── mcp/                 # MCP integration
├── notifications/       # Notification system
├── prisma/              # RAG database schema
└── types/               # TypeScript types
```

**Playbook Requirements:**
- ✅ pgvector/semantic search
- ✅ Citations checker
- ✅ Document ingestion pipeline
- ✅ Vector index management

**Action Items:**
- [ ] Document RAG architecture
- [ ] Document citation enforcement mechanism
- [ ] Create knowledge base management guide

---

#### Additional Services

| Service | Purpose | Status |
|---------|---------|--------|
| `services/analytics` | Analytics processing | ✅ Domain-specific, keep |
| `services/cache` | Caching layer (Redis) | ✅ Infrastructure, keep |
| `services/ledger` | Ledger operations | ✅ Domain-specific, keep |
| `services/otel` | OpenTelemetry instrumentation | ✅ Infrastructure, keep |
| `services/tax` | Tax calculations | ✅ Domain-specific, keep |

**Note:** Domain-specific services (ledger, tax) are extensions beyond playbook baseline.

---

### 3. Packages Layer

#### Target: `packages/ui` (Design System)
**Current:** `packages/ui/`

**Status:** ✅ **Aligned**

**Structure:**
```
packages/ui/
└── src/
    ├── components/      # Reusable UI components
    ├── tokens/          # Design tokens (colors, typography, spacing)
    └── utils/           # UI utilities
```

**Playbook Requirements:**
- 🔄 Design tokens (colors, typography, motion, layout)
- 🔄 Accessibility utilities (a11y)
- ✅ Component primitives
- 🔄 Liquid glass patterns
- 🔄 PWA budgets enforcement

**Playbook Design Tokens:**
```yaml
colors:
  ink: "#0B1022"
  gradient_hero: ["#06B6D4","#8B5CF6","#EC4899"]
  success: "#10B981"
  warning: "#F59E0B"
  danger: "#EF4444"
  glass_panel_bg: "rgba(255,255,255,0.08)"
  glass_stroke: "rgba(255,255,255,0.12)"

motion:
  durations: { fast: "120ms", base: "220ms", slow: "420ms" }
  easing: "cubic-bezier(0.4,0,0.2,1)"

typography:
  sans: "Inter, ui-sans-serif, system-ui"
  mono: "IBM Plex Mono, ui-monospace"

layout:
  sidebar_width: 280
  header_height: 64
```

**Action Items:**
- [ ] Document design token system
- [ ] Create tokens file matching playbook specs
- [ ] Document liquid glass pattern implementation
- [ ] Add accessibility utilities documentation

---

#### Target: `packages/schemas` (DTO Validators)
**Current:** `packages/types-finance/` (partial)

**Status:** 🔄 **Partial - Needs Generic Schemas Package**

**Current Structure:**
```
packages/types-finance/
├── src/
│   ├── Money.ts
│   ├── JournalEntry.ts
│   └── TaxRule.ts
└── __tests__/
```

**Playbook Requirements:**
- ❌ Generic DTO validators (not finance-specific)
- ❌ Request/response contract schemas
- ❌ Zod validators for API contracts

**Action Items:**
- [ ] Create new `packages/schemas` for generic DTOs
- [ ] Implement Zod validators for API contracts
- [ ] Document validation patterns
- [ ] Keep `packages/types-finance` for domain-specific types

---

#### Target: `packages/config` (Typed Config)
**Current:** `packages/system-config/` + `packages/config/`

**Status:** ✅ **Aligned** (multiple packages)

**Structure:**
```
packages/system-config/
├── src/
│   ├── loader.ts        # Config file loader
│   └── types.ts         # Config types
└── dist/

packages/config/
└── src/                 # Additional config utilities
```

**Playbook Requirements:**
- ✅ Typed config loader
- ✅ Feature flags support
- ✅ RBAC constants
- ✅ Environment-specific configs

**Action Items:**
- [ ] Document config loading hierarchy
- [ ] Document feature flags usage
- [ ] Create config schema documentation

---

#### Target: `packages/api` (API Client)
**Current:** `packages/api-client/`

**Status:** ✅ **Aligned**

**Structure:**
```
packages/api-client/
├── src/
│   ├── client.ts        # HTTP client
│   └── types.ts         # Generated OpenAPI types
└── tests/
```

**Playbook Requirements:**
- ✅ Typed HTTP client
- ✅ Auth injection
- ✅ JSON error normalization
- ✅ OpenAPI type generation

**Action Items:**
- [ ] Document API client usage patterns
- [ ] Document OpenAPI code generation workflow
- [ ] Create error handling guide

---

#### Additional Packages

| Package | Purpose | Status |
|---------|---------|--------|
| `packages/agents` | Agent SDK and prompts | ✅ Keep |
| `packages/api` | API utilities (distinct from api-client) | 🔄 Clarify vs api-client |
| `packages/dev-portal` | Development portal | ✅ Keep |
| `packages/lib` | Shared utilities | ✅ Keep |
| `packages/logger` | Logging utilities | ⚠️ Potential duplicate |
| `packages/logging` | Logging (another one) | ⚠️ Potential duplicate |
| `packages/platform` | Platform utilities | ✅ Keep |
| `packages/prompts` | Prompt templates | ✅ Keep |
| `packages/tax` | Tax utilities | ✅ Keep (domain-specific) |

**Action Items:**
- [ ] Clarify difference between `packages/api` and `packages/api-client`
- [ ] Investigate consolidating `packages/logger` and `packages/logging`

---

### 4. Backend Layer

#### FastAPI Backend
**Current:** `server/`

**Status:** ✅ **Aligned**

**Structure:**
```
server/
├── api/                 # API routes
│   ├── v1/
│   └── ...
├── openai/              # OpenAI integration
├── workflows/           # Workflow handlers
├── main.py              # FastAPI application (285KB - complex!)
├── health_app.py        # Health check app
├── settings.py          # Settings management
├── db.py                # Database connection
├── rag.py               # RAG operations
├── document_ai.py       # Document processing
└── requirements.txt     # Python dependencies
```

**Playbook Requirements:**
- ✅ FastAPI framework
- ✅ OpenAPI schema export
- ✅ Health checks
- ✅ CORS/CSP/HSTS headers
- ✅ JWT verification
- ✅ Structured logging with correlation IDs

**Concerns:**
- `main.py` is 285KB - consider splitting into modules

**Action Items:**
- [ ] Document FastAPI architecture
- [ ] Consider refactoring large main.py
- [ ] Document API versioning strategy
- [ ] Create API endpoint reference

---

### 5. Database Layer

#### Supabase
**Current:** `supabase/`

**Status:** ✅ **Aligned**

**Structure:**
```
supabase/
├── migrations/          # 168 SQL migration files
│   ├── 20230101_*.sql
│   ├── 20230102_*.sql
│   └── ...
├── functions/           # Edge functions (Deno)
└── seed.sql             # Seed data
```

**Playbook Requirements:**
- ✅ Idempotent migrations
- ✅ RLS enabled with helper functions
- ✅ Private storage buckets
- ✅ Signed URLs only
- 🔄 Migration documentation

**RLS Helpers:**
- `is_member_of(org)` - Check organization membership
- `has_min_role(org, role)` - Check minimum role level

**Action Items:**
- [ ] Create supabase/README.md with migration guide
- [ ] Document RLS helper functions
- [ ] Document storage policies
- [ ] Create rollback procedures

---

### 6. Configuration

#### System Configuration
**Current:** `config/`

**Status:** 🔄 **Needs Enhancement**

**Structure:**
```
config/
├── env/                 # Environment templates
├── secrets/             # Secret management
├── system.yaml          # Main system config
├── bundle-budgets.json  # Bundle size limits
└── web-bundle-budgets.json
```

**Playbook Requirements:**
- ✅ system.yaml (main config)
- ❌ agents.yaml (agent configuration)
- ❌ ui_ux.yaml (UI/UX config)
- ✅ Bundle budgets

**Action Items:**
- [ ] Create config/agents.yaml with tool whitelist
- [ ] Create config/ui_ux.yaml with design system config
- [ ] Document config loading precedence
- [ ] Validate against playbook schema

---

### 7. Documentation

#### Standards
**Current:** `STANDARDS/`

**Status:** ✅ **Aligned**

**Structure:**
```
STANDARDS/
├── POLICY/              # Policy documentation
├── TEMPLATES/           # Document templates
└── TRACEABILITY/        # Traceability matrix
```

**Playbook Requirements:**
- ✅ Standards documentation
- ✅ Traceability matrix
- 🔄 Matrix needs ≥40 rows for go-live

**Action Items:**
- [ ] Expand traceability matrix to ≥40 requirements
- [ ] Update matrix with refactor plan items

---

#### Go-Live Documentation
**Current:** `GO-LIVE/`

**Status:** ✅ **Aligned**

**Structure:**
```
GO-LIVE/
├── GO-LIVE_SCORECARD.md
├── REMEDIATION_PLAN.md
├── RISK_REGISTER.md
├── RELEASE_RUNBOOK.md
├── ROLLBACK_PLAN.md
└── OPEN_ISSUES.md
```

**Playbook Requirements:**
- ✅ Go-live scorecard
- ✅ Remediation plan
- ✅ Risk register
- ✅ Release runbook
- ✅ Rollback plan

**Action Items:**
- [ ] Update scorecard for refactor plan
- [ ] Add refactor risks to risk register
- [ ] Validate completeness of runbooks

---

#### Refactor Documentation
**Current:** `REFACTOR/`

**Status:** ✅ **NEW** (Created in P0)

**Structure:**
```
REFACTOR/
├── plan.md              # This comprehensive plan
└── map.md               # This architecture map
```

**Action Items:**
- [x] Create REFACTOR directory
- [x] Create plan.md
- [x] Create map.md
- [ ] Add ADRs (Architecture Decision Records) as needed

---

#### Security Documentation
**Current:** `SECURITY.md` (root level)

**Status:** ❌ **Needs Dedicated Directory**

**Current:**
```
SECURITY.md              # Root-level security policy
```

**Playbook Target:**
```
SECURITY/
├── headers.md           # CSP, HSTS, CORS configuration
├── keys_rotation.md     # Key rotation procedures
├── audits/              # Security audit reports
├── vulnerabilities/     # Vulnerability tracking
└── compliance/          # Compliance documentation
```

**Action Items:**
- [ ] Create SECURITY/ directory (Job P8)
- [ ] Move/expand SECURITY.md content
- [ ] Create headers.md with current CSP/HSTS/CORS
- [ ] Create keys_rotation.md
- [ ] Document vulnerability management process

---

### 8. Infrastructure & DevOps

#### Docker Compose
**Current:** Multiple compose files

**Status:** ✅ **Aligned**

**Files:**
```
docker-compose.yml       # Base configuration
docker-compose.dev.yml   # Development overrides
docker-compose.prod.yml  # Production configuration
```

**Services:**
- gateway
- rag
- agent
- analytics
- ui (legacy Vite)
- web (Next.js)

**Action Items:**
- [ ] Document service dependencies
- [ ] Document port assignments
- [ ] Create local development guide

---

#### CI/CD Workflows
**Current:** `.github/workflows/`

**Status:** ✅ **Comprehensive**

**Workflows:**
- `ci.yml` - Main CI (lint, test, build, coverage)
- `workspace-ci.yml` - Workspace checks
- `docker-build.yml` - Container builds
- `compose-deploy.yml` - Deployment
- `security.yml` - Security scanning
- `pwa-audit.yml` - PWA/Lighthouse/axe
- `lighthouse-ci.yml` - Performance monitoring
- `gitleaks.yml` - Secret scanning
- `codeql.yml` - Code security analysis
- `sbom.yml` - Software bill of materials
- `release.yml` - Release automation

**Playbook Requirements:**
- ✅ PR checks (lint, typecheck, test, build)
- ✅ Deploy previews capability
- ✅ Artifact reports
- ✅ Security scanning
- ✅ Lighthouse/axe automation

**Action Items:**
- [ ] Document workflow dependencies
- [ ] Create CI/CD architecture diagram
- [ ] Document deployment strategies

---

## Migration Paths

### Priority 1: Documentation Enhancement

These items need documentation but no code changes:

1. **ENV_GUIDE.md** - Consolidate environment variable documentation
2. **Tool Proxy Docs** - Document whitelist and namespace
3. **Admin Pages Audit** - Document existing pages vs. playbook requirements
4. **API Architecture** - Document controller/service/adapter pattern
5. **RAG Architecture** - Document retrieval and citations

### Priority 2: New Configuration Files

These files should be created to match playbook:

1. **config/agents.yaml** - Agent configuration and tool whitelist
2. **config/ui_ux.yaml** - UI/UX configuration
3. **SECURITY/** directory - Dedicated security documentation

### Priority 3: Package Enhancements

These packages need enhancement:

1. **packages/schemas** - Create generic DTO validators (new package)
2. **packages/ui/tokens** - Formalize design token system

### Priority 4: Clarifications Needed

These items need investigation:

1. **apps/staff vs apps/web** - Clarify roles or consolidate
2. **packages/logger vs packages/logging** - Consolidate or document differences
3. **packages/api vs packages/api-client** - Clarify different purposes

---

## Alignment Summary

### Strong Alignment ✅

The repository has excellent alignment with playbook requirements:

- ✅ Monorepo with pnpm workspace
- ✅ Apps layer (client, admin, gateway)
- ✅ Services layer (api, agents, rag)
- ✅ Packages layer (ui, config, api-client)
- ✅ Database with RLS and migrations
- ✅ Comprehensive CI/CD
- ✅ Go-live documentation
- ✅ Testing infrastructure

### Needs Enhancement 🔄

These areas are present but need enhancement:

- 🔄 Design system tokens (formalize per playbook)
- 🔄 Generic schemas package (separate from domain-specific)
- 🔄 Agent configuration (create agents.yaml)
- 🔄 Traceability matrix (expand to ≥40 rows)
- 🔄 ENV_GUIDE.md (consolidate env var docs)

### Missing Components ❌

These components are required by playbook but missing:

- ❌ SECURITY/ directory (dedicated security docs)
- ❌ config/agents.yaml (agent configuration)
- ❌ config/ui_ux.yaml (UI/UX configuration)

### Needs Clarification ❓

These components need investigation:

- ❓ apps/staff purpose
- ❓ packages/logger vs packages/logging
- ❓ packages/api vs packages/api-client

---

## Conclusion

The Prisma Glow repository has a **strong foundation** that aligns well with the Full-Stack Refactor Playbook. The primary work items are:

1. **Documentation Enhancement** (80% of work)
   - Create comprehensive guides
   - Document existing architecture
   - Fill documentation gaps

2. **Configuration Files** (15% of work)
   - Create agents.yaml
   - Create ui_ux.yaml
   - Organize SECURITY/ directory

3. **Minor Code Changes** (5% of work)
   - Create packages/schemas
   - Formalize design tokens
   - Address potential duplicates

This map provides the foundation for executing the 10-job refactor plan, with clear visibility into what exists, what needs enhancement, and what needs creation.

---

**Status:** ✅ Complete  
**Next Step:** Begin Job P1 (Monorepo & Tooling Baseline)
