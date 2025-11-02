# Full-Stack Refactor Plan
## Multi-Agent, AI-First Production Go-Live

**Version:** 1.0.0  
**Date:** 2025-11-02  
**Author Role:** CTO / Prompt Engineer  
**Status:** In Progress

---

## Executive Summary

This document outlines the comprehensive refactoring plan to align the Prisma Glow monorepo with production-ready, AI-first architecture patterns. The goal is to systematically evolve the existing codebase into a hardened, compliant, and observable multi-agent system ready for production deployment.

### Current State Assessment

**Repository Structure:** ✅ Well-established monorepo with pnpm workspace  
**Infrastructure:** ✅ Comprehensive (apps, services, packages, supabase, config, docs)  
**Build System:** ✅ pnpm + turbo with TypeScript 5.9  
**Testing:** ✅ Vitest, Playwright, pytest with coverage gates  
**CI/CD:** ✅ Extensive GitHub Actions workflows  
**Documentation:** ✅ Rich documentation (STANDARDS, GO-LIVE, SECURITY)

### Gap Analysis

While the repository has significant infrastructure, the refactor plan identifies alignment opportunities:

1. **Directory Organization:** Missing REFACTOR and dedicated SECURITY directories
2. **Documentation Consolidation:** Need centralized ENV_GUIDE.md and enhanced package docs
3. **Tool Proxy Documentation:** Need explicit whitelist and namespace documentation
4. **Admin vs Client PWA Clarity:** apps/admin exists, apps/web serves multiple roles
5. **Traceability Matrix:** Needs expansion to meet 40+ row minimum for go-live

---

## Refactoring Strategy

### Principles

1. **Additive Only:** No destructive operations unless fixing security vulnerabilities
2. **Maintain Green Build:** All changes preserve existing functionality
3. **Incremental Progress:** Small, verifiable commits per job
4. **Documentation as Code:** Update docs alongside implementation
5. **Security First:** All changes validated against security baseline

### Phased Approach

We implement 10 sequential jobs (P0-P10), with each job corresponding to a focused PR:

| Job | Title | Status | Deliverables |
|-----|-------|--------|--------------|
| P0 | Discovery & Refactor Plan | ✅ In Progress | REFACTOR/plan.md, REFACTOR/map.md |
| P1 | Monorepo & Tooling Baseline | 🔄 Planned | ENV_GUIDE.md, tooling validation |
| P2 | Shared Packages | 🔄 Planned | Package audits, enhanced docs |
| P3 | Service/API Layer & Tool Proxy | 🔄 Planned | Tool proxy docs, OpenAPI validation |
| P4 | Database & Storage | 🔄 Planned | Migration docs, RLS validation |
| P5 | Admin Panel PWA | 🔄 Planned | Admin app audit, PWA validation |
| P6 | Client App Stabilization | 🔄 Planned | Client app audit, integration docs |
| P7 | Testing Strategy | 🔄 Planned | Test coverage reports |
| P8 | Security & Compliance | 🔄 Planned | SECURITY directory, hardening docs |
| P9 | Observability & Ops | 🔄 Planned | Dashboard docs, runbook updates |
| P10 | CI/CD & Go-Live | 🔄 Planned | Final scorecard, release runbooks |

---

## Job P0: Discovery & Refactor Plan

**Status:** ✅ In Progress  
**Branch:** `copilot/refactor-multi-agent-ai-system`

### Objectives

1. Inventory current repository structure
2. Map existing → target architecture
3. Identify dead/duplicate code
4. Create refactor plan and map documents

### Current Repository Inventory

#### Applications (apps/)

```
apps/
├── admin/           # Admin PWA - governance, IAM, policy, telemetry ✅
├── gateway/         # Express.js API gateway ✅
├── lib/             # Shared app-level utilities
├── staff/           # Staff PWA (legacy?) - needs clarification
└── web/             # Next.js client PWA - primary operations UI ✅
```

**Finding:** We have both `apps/admin` and `apps/staff`. Need to clarify roles:
- `apps/admin` aligns with playbook's Admin Panel PWA
- `apps/web` aligns with playbook's Client App PWA
- `apps/staff` may be redundant or serve specialized role

#### Services (services/)

```
services/
├── agents/          # Agent SDK wrappers, persona/policy loader ✅
├── analytics/       # Analytics service
├── api/             # Service/API layer (controllers, services, adapters) ✅
├── cache/           # Cache service ✅
├── ledger/          # Ledger service (domain-specific)
├── otel/            # OpenTelemetry instrumentation ✅
├── rag/             # Retrieval layer (pgvector/semantic search) ✅
└── tax/             # Tax service (domain-specific)
```

**Finding:** Services align well with playbook. Need to document tool proxy namespace.

#### Packages (packages/)

```
packages/
├── agents/          # Agent SDK ✅
├── api/             # API utilities
├── api-client/      # Typed API client ✅
├── config/          # Config management ✅
├── dev-portal/      # Development portal
├── lib/             # Shared library ✅
├── logger/          # Logging utilities ✅
├── logging/         # Logging (duplicate?)
├── platform/        # Platform utilities
├── prompts/         # Prompt templates
├── system-config/   # Typed config loader ✅
├── tax/             # Tax utilities (domain-specific)
├── types-finance/   # DTOs for finance domain ✅
└── ui/              # Design system, tokens, components ✅
```

**Finding:** Strong package infrastructure. Potential duplicates: logger/logging.

#### Backend (server/)

```
server/              # FastAPI backend ✅
├── api/             # API routes
├── openai/          # OpenAI integration
└── workflows/       # Workflow handlers
```

**Finding:** FastAPI backend well-structured. Integrates with services layer.

#### Database (supabase/)

```
supabase/
├── migrations/      # 168 SQL migrations ✅
├── functions/       # Edge functions
├── policies/        # RLS policies (embedded in migrations)
└── storage/         # Storage configuration
```

**Finding:** Extensive migration history. RLS policies appear embedded in migrations.

#### Configuration (config/)

```
config/
├── env/             # Environment templates
├── secrets/         # Secret management
├── system.yaml      # System configuration ✅
├── bundle-budgets.json
└── web-bundle-budgets.json
```

**Finding:** Central config management in place. Need agents.yaml and ui_ux.yaml per playbook.

#### Standards & Documentation

```
STANDARDS/
├── POLICY/          # Policy documentation
├── TEMPLATES/       # Document templates
└── TRACEABILITY/    # Traceability matrix ✅

GO-LIVE/             # Go-live documentation ✅
├── GO-LIVE_SCORECARD.md
├── REMEDIATION_PLAN.md
├── RISK_REGISTER.md
├── RELEASE_RUNBOOK.md
└── ROLLBACK_PLAN.md

docs/                # Technical documentation
├── adr/             # Architecture Decision Records
├── guides/          # User guides
└── runbooks/        # Operational runbooks
```

**Finding:** Strong documentation foundation. Need SECURITY/ directory per playbook.

### Dead/Duplicate Code Analysis

#### Potential Duplicates

1. **Logging:** `packages/logger` vs `packages/logging` - investigate consolidation
2. **Apps:** `apps/staff` vs `apps/web` - clarify roles or consolidate
3. **API:** `packages/api` vs `packages/api-client` - may serve different purposes

#### Legacy Code Candidates

- Check `src/` directory (Vite legacy UI) - may be superseded by apps/web
- Review `app/` directory - appears to be legacy
- Investigate `ui/` directory at root vs `packages/ui`

### Migration Recommendations

**No destructive changes in P0.** Document candidates for future optimization:

1. Consider merging `packages/logger` and `packages/logging` in future PR
2. Archive or clearly document purpose of `apps/staff` if redundant
3. Migrate legacy `src/` Vite UI components to `apps/web` incrementally

---

## Job P1: Monorepo & Tooling Baseline

### Objectives

1. Validate workspace configuration (pnpm, turbo, TypeScript)
2. Create comprehensive ENV_GUIDE.md
3. Document tooling setup and conventions
4. Validate linting, formatting, commit hooks

### Current Tooling Status

**Package Manager:** ✅ pnpm 9.12.3 with workspace support  
**Build Orchestration:** ✅ turbo 2.3.3  
**TypeScript:** ✅ 5.9.3 with strict mode  
**Linting:** ✅ ESLint 9 with typescript-eslint 8  
**Testing:** ✅ Vitest 3.2.4, Playwright 1.55.1, pytest  
**Git Hooks:** ✅ Secret scanning hooks

### Deliverables

- [ ] Create `ENV_GUIDE.md` with comprehensive environment variable documentation
- [ ] Document workspace tooling setup in `docs/tooling.md`
- [ ] Validate and document build/lint/test scripts
- [ ] Confirm git hooks and pre-commit checks

---

## Job P2: Shared Packages

### Objectives

1. Audit `packages/ui` for design system completeness
2. Review `packages/types-finance` and `packages/api-client` for DTO coverage
3. Validate `packages/system-config` and `packages/config`
4. Document package dependencies and usage patterns

### Package Audit Checklist

#### packages/ui
- [ ] Design tokens defined (colors, typography, spacing)
- [ ] Accessibility utilities (a11y)
- [ ] Component primitives documented
- [ ] Storybook or component gallery

#### packages/schemas (create if missing)
- [ ] DTO validators with Zod
- [ ] Request/response contracts
- [ ] Validation error handling

#### packages/api-client
- [ ] Typed HTTP client
- [ ] Auth token injection
- [ ] Error normalization
- [ ] OpenAPI type generation

#### packages/config
- [ ] Feature flags support
- [ ] RBAC constants
- [ ] Environment-specific configs
- [ ] Type-safe config loader

---

## Job P3: Service/API Layer & Tool Proxy

### Objectives

1. Document `services/api` architecture (controllers/services/adapters)
2. Create Tool Proxy documentation with whitelist
3. Validate RBAC guards at route entry
4. Review OpenAPI schema generation

### Tool Proxy Requirements

The playbook requires server-side tool proxy for OpenAI agent tools:

```
/api/tools/*         # Tool proxy namespace
```

**Whitelist Strategy:**
- Document whitelisted tools in `config/agents.yaml`
- Enforce server-side validation
- Log all tool invocations
- Rate limit per tool type

### API Layer Review

- [ ] Document controller → service → adapter pattern
- [ ] Validate structured error responses
- [ ] Confirm correlation ID propagation
- [ ] Review RBAC guard implementation

---

## Job P4: Database & Storage Integration

### Objectives

1. Document migration strategy (168 migrations)
2. Validate RLS policies and helper functions
3. Review storage policies (private buckets, signed URLs)
4. Create migration runbook

### Database Review

**Migrations:** 168 SQL files in `supabase/migrations/`  
**RLS:** Policies embedded in migrations  
**Helper Functions:** `is_member_of(org)`, `has_min_role(org, role)`  
**Storage:** Private buckets with signed URL enforcement

### Deliverables

- [ ] Create `supabase/README.md` with migration order
- [ ] Document RLS helper functions
- [ ] Validate storage policy enforcement
- [ ] Create rollback procedures

---

## Job P5: Admin Panel PWA

### Objectives

1. Audit `apps/admin` functionality
2. Validate admin pages against playbook requirements
3. Confirm PWA configuration (manifest, service worker)
4. Validate accessibility and performance budgets

### Required Admin Pages (per playbook)

- [ ] `/` - Overview dashboard
- [ ] `/iam` - Identity & Access Management
- [ ] `/permissions` - Roles & Permissions matrix
- [ ] `/agents` - Agents & Tools configuration
- [ ] `/knowledge` - Knowledge & RAG management
- [ ] `/workflows` - Workflows & Approvals
- [ ] `/domain` - Domain settings
- [ ] `/jobs` - Jobs & Integrations (webhooks)
- [ ] `/settings` - Settings & feature flags
- [ ] `/telemetry` - Logs & telemetry dashboards
- [ ] `/traceability` - Traceability matrix editor

---

## Job P6: Client App Stabilization

### Objectives

1. Audit `apps/web` as primary client PWA
2. Validate integration with API and packages
3. Confirm core user journeys
4. Validate PWA and accessibility

### Required Client Pages (per playbook)

- [ ] `/` - Dashboard (KPIs, recent activity, suggested actions)
- [ ] `/onboarding` - Zero-typing onboarding
- [ ] `/documents` - Document repository (tree, grid, preview)
- [ ] `/tasks` - Task management
- [ ] `/close` - Accounting close console
- [ ] `/audit` - Audit console
- [ ] `/tax` - Tax console

### Assistant Dock

- [ ] Chat interface (⌘K hotkey)
- [ ] Voice push-to-talk
- [ ] Tool calling via server proxy
- [ ] Citation enforcement

---

## Job P7: Testing Strategy

### Objectives

1. Review unit test coverage (Vitest)
2. Review integration test coverage (API tests)
3. Review e2e test coverage (Playwright)
4. Validate Lighthouse and axe-core in CI

### Current Testing Status

**Unit Tests:** ✅ Vitest with jsdom  
**Integration Tests:** ✅ API smoke tests, pytest suite  
**E2E Tests:** ✅ Playwright core journeys  
**Performance:** ✅ Bundle size checks, Artillery load tests  
**Accessibility:** ✅ axe-core integration  

### Test Coverage Goals

- Unit: 45% statements, 40% branches, 45% functions, 45% lines (already configured)
- Integration: Core API endpoints covered
- E2E: Critical user flows automated
- Lighthouse: ≥90 score
- axe-core: 0 critical violations

---

## Job P8: Security & Compliance

### Objectives

1. Create SECURITY/ directory structure
2. Document CSP/HSTS/CORS configurations
3. Review secret scanning and vulnerability management
4. Document DSAR export and data retention

### SECURITY Directory Structure

```
SECURITY/
├── headers.md           # CSP, HSTS, CORS documentation
├── keys_rotation.md     # Key rotation procedures
├── audits/              # Security audit reports
├── vulnerabilities/     # Vulnerability tracking
└── compliance/          # Compliance documentation
```

### Security Checklist

- [ ] CSP policy documented and enforced
- [ ] HSTS headers configured
- [ ] Secure cookies (SameSite=Lax/Strict)
- [ ] CORS minimal whitelist
- [ ] Secret scanning in pre-commit hooks
- [ ] Vulnerability scanning in CI
- [ ] PII redaction in logs
- [ ] DSAR export implementation
- [ ] Data retention policies

---

## Job P9: Observability & Ops

### Objectives

1. Document observability infrastructure
2. Review error tracking and structured logging
3. Validate dashboards and alerts
4. Document backup and restore procedures

### Observability Components

**Error Tracking:** ✅ Sentry integration  
**Logging:** ✅ Structured JSON with correlation IDs  
**Tracing:** ✅ OpenTelemetry with service/otel  
**Metrics:** ✅ Custom metrics via telemetry

### Required Dashboards

- [ ] Assistant adoption metrics
- [ ] Document pipeline (upload → extract → accept → commit)
- [ ] Approvals SLA tracking
- [ ] Security denials (RLS/permission failures)
- [ ] Error rates and latency percentiles

---

## Job P10: CI/CD & Go-Live

### Objectives

1. Review all CI/CD workflows
2. Validate go-live documentation completeness
3. Confirm deployment strategy
4. Validate rollback procedures

### CI/CD Workflows

**Current Workflows:**
- ✅ ci.yml - Main CI pipeline (lint, test, build, coverage)
- ✅ workspace-ci.yml - Workspace-specific checks
- ✅ docker-build.yml - Container builds
- ✅ compose-deploy.yml - Deployment automation
- ✅ security.yml - Security scanning
- ✅ pwa-audit.yml - PWA and accessibility
- ✅ lighthouse-ci.yml - Performance monitoring

### Go-Live Gate

**Criteria:**
- [ ] P0 blockers: 0
- [ ] P1 action items: documented with owners
- [ ] Telemetry dashboards: configured and validated
- [ ] Traceability matrix: ≥40 rows
- [ ] Lighthouse score: ≥90
- [ ] axe-core critical violations: 0
- [ ] Security scan: no critical vulnerabilities
- [ ] Backup/restore: validated
- [ ] Rollback plan: documented and tested

---

## Risk Management

### Technical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking changes during refactor | High | Additive-only strategy, comprehensive testing |
| Performance regression | Medium | Bundle budgets, load testing in CI |
| Security vulnerabilities introduced | High | Pre-commit scanning, CI security gates |
| Documentation drift | Medium | Docs-as-code, traceability matrix updates |

### Schedule Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Scope creep | Medium | Strict adherence to job boundaries |
| Dependency conflicts | Low | Frozen lockfile, version pinning |
| Testing bottlenecks | Medium | Parallel test execution, smart caching |

---

## Success Criteria

### Technical Excellence

- ✅ All builds green (CI passing)
- ✅ Test coverage meets gates
- ✅ No critical security vulnerabilities
- ✅ Performance budgets met
- ✅ Accessibility standards met (WCAG 2.1 AA)

### Documentation Quality

- ✅ All jobs documented with deliverables
- ✅ Traceability matrix ≥40 rows
- ✅ Runbooks complete and tested
- ✅ API documentation generated
- ✅ Architecture diagrams current

### Operational Readiness

- ✅ Monitoring and alerting configured
- ✅ Backup and restore validated
- ✅ Rollback procedures documented
- ✅ On-call runbooks prepared
- ✅ Incident response plan ready

---

## Timeline

**Start Date:** 2025-11-02  
**Target Completion:** Phased over 10 PRs

| Job | Estimated Effort | Dependencies |
|-----|------------------|--------------|
| P0 | 1 day | None |
| P1 | 1 day | P0 |
| P2 | 2 days | P1 |
| P3 | 2 days | P2 |
| P4 | 1 day | P3 |
| P5 | 2 days | P4 |
| P6 | 2 days | P5 |
| P7 | 1 day | P6 |
| P8 | 2 days | P7 |
| P9 | 1 day | P8 |
| P10 | 1 day | P9 |

**Total:** ~16 days (sequential execution with verification gates)

---

## Conclusion

This refactor plan provides a systematic approach to aligning the Prisma Glow repository with production-ready, AI-first architecture patterns. The phased approach ensures:

1. **Safety:** Additive-only changes preserve existing functionality
2. **Quality:** Each job has clear deliverables and acceptance criteria
3. **Traceability:** All changes documented in traceability matrix
4. **Compliance:** Security and compliance requirements embedded throughout

The plan respects the existing infrastructure while systematically enhancing documentation, security, observability, and operational readiness for production go-live.

---

**Next Steps:**
1. Review and approve this plan
2. Proceed to create REFACTOR/map.md
3. Begin Job P1 execution upon approval
