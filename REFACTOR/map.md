# Architecture Mapping: Current → Target State

## Status
- **Version:** 1.0.0
- **Last Updated:** 2025-11-02
- **Owner:** Engineering Core Team

## Executive Summary

This document maps the current Prisma Glow architecture to the target production-ready state, providing a comprehensive inventory of all system components, migrations, packages, services, and workflows.

**Current State:** Prototype with multiple frontends, services, and workflows
**Target State:** Production-ready multi-agent AI finance suite with clear boundaries
**Gap Analysis:** 119 migrations, 24 packages, 19 workflows inventoried

---

## Service Topology

### Current Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                             │
├─────────────────┬──────────────────┬────────────────────────────┤
│   Legacy Vite   │   Next.js App    │   Staff Portal (legacy)   │
│  (src/, port    │   (apps/web)     │   (apps/staff)            │
│   5173)         │   (port 3000)    │                            │
└────────┬────────┴────────┬─────────┴────────────┬───────────────┘
         │                 │                      │
         └─────────────────┼──────────────────────┘
                           │
                    ┌──────▼───────┐
                    │   Gateway    │
                    │ (Express.js) │
                    │  port 3001   │
                    └──────┬───────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
    ┌────▼─────┐    ┌─────▼──────┐   ┌────▼──────┐
    │ FastAPI  │    │    RAG     │   │  Agents   │
    │  Backend │    │  Service   │   │  Service  │
    │ port 8000│    │ (Node.js)  │   │           │
    └────┬─────┘    └─────┬──────┘   └────┬──────┘
         │                │               │
         └────────────────┼───────────────┘
                          │
                  ┌───────▼────────┐
                  │   Supabase     │
                  │  PostgreSQL 15 │
                  │   + pgvector   │
                  │   + storage    │
                  └────────────────┘
```

### Target Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      Client Layer                            │
├──────────────────────┬───────────────────────────────────────┤
│    Next.js Client    │         Admin Panel (Next.js)        │
│      (apps/web)      │           (apps/admin)               │
│   Progressive Web    │      IAM, Agents, Knowledge          │
│        App           │      Workflows, Telemetry            │
└──────────┬───────────┴────────────────┬──────────────────────┘
           │                            │
           └────────────┬───────────────┘
                        │
                 ┌──────▼────────┐
                 │    Gateway    │
                 │  (Express.js) │
                 │  + OpenTelemetry │
                 │  + RBAC        │
                 │  + Tool Proxy  │
                 └──────┬────────┘
                        │
         ┌──────────────┼──────────────┐
         │              │              │
    ┌────▼─────┐  ┌────▼──────┐  ┌───▼──────┐
    │ FastAPI  │  │    RAG    │  │  Agents  │
    │ Backend  │  │  Service  │  │ Platform │
    │ + Pydantic│  │ TypeScript│  │ OpenAI   │
    │ + routers │  │ + OTel    │  │ SDK      │
    └────┬─────┘  └────┬──────┘  └───┬──────┘
         │             │             │
         └─────────────┼─────────────┘
                       │
           ┌───────────▼────────────┐
           │      Supabase          │
           │   PostgreSQL 15        │
           │   + pgvector (v0.7)    │
           │   + RLS policies       │
           │   + storage buckets    │
           │   + edge functions     │
           └────────────────────────┘
```

### Key Changes
1. **Frontend Consolidation:** Migrate from dual Vite/Next.js to single Next.js app
2. **Admin Panel:** Dedicated Next.js app for admin functions (IAM, agents, workflows)
3. **Gateway Enhancement:** Add tool proxy, RBAC enforcement, OpenTelemetry
4. **Service Boundaries:** Clear contracts between gateway, FastAPI, RAG, agents
5. **Observability:** Unified logging, tracing, metrics across all services

---

## Database Schema Inventory

### Migration Count: 119 Files

**Location:** `supabase/migrations/`

#### Core Tables (15)
1. `organizations` - Multi-tenant root entities
2. `users` - Authentication and user profiles
3. `memberships` - Organization membership with roles
4. `documents` - Document metadata and versioning
5. `tasks` - Workflow tasks and assignments
6. `journals` - Accounting journal entries
7. `accounts` - Chart of accounts
8. `trial_balances` - Period trial balances
9. `audit_plans` - Audit planning data
10. `tax_computations` - Tax calculation results
11. `workflows` - Workflow definitions
12. `agent_sessions` - AI agent conversation history
13. `notifications` - User notifications queue
14. `activity_log` - Audit trail
15. `settings` - System configuration

#### Extension Tables (12)
- `document_embeddings` - Vector embeddings for RAG
- `policy_packs` - Agent policy configurations
- `approval_requests` - HITL approval workflows
- `rate_limits` - API rate limiting
- `agent_tool_calls` - Tool invocation audit trail
- `knowledge_sources` - External knowledge integrations
- `file_search_vectors` - OpenAI file search cache
- `reconciliations` - Bank reconciliation data
- `confirmations` - Audit confirmation tracking
- `kam_issues` - Key audit matters
- `tax_positions` - Tax position documentation
- `vat_returns` - VAT return filings

#### Supporting Tables (8)
- `idempotency_keys` - Duplicate request prevention
- `cache_entries` - Application-level cache
- `feature_flags` - Feature toggle management
- `scheduled_jobs` - Background job queue
- `storage_metadata` - Enhanced storage metadata
- `webhooks` - Webhook delivery tracking
- `api_keys` - Service-to-service authentication
- `sessions` - User session management

#### Sample Migration Files
```
002_vat_rules_seed.sql                                    - Initial VAT rules
003_indexes.sql                                           - Performance indexes
20250212180000_agent_orchestration_dependency_indexes.sql - Agent dependency tracking
20251002120000_organizations_users_memberships.sql        - Multi-tenant foundation
20251015140000_documents_embeddings_pgvector.sql          - RAG infrastructure
20251020160000_rls_policies_organizations.sql             - RLS policy foundation
20251101120000_agent_tool_proxy_whitelist.sql             - Tool proxy security
20251105090000_approval_workflows_hitl.sql                - Human-in-the-loop approvals
20251110130000_rate_limiting_tables.sql                   - Rate limit enforcement
20251115160000_audit_trail_activity_log.sql               - Security audit trail
20251120140000_cache_and_idempotency.sql                  - Performance optimization
20251125100000_knowledge_sources_integrations.sql         - External knowledge
20251130120000_scheduled_jobs_queue.sql                   - Background processing
20251202121000_role_search_path_extensions.sql            - Role-based search paths
20251215120000_notification_dispatch_queue.sql            - Notification system
20251218120000_agent_manifest_lookup_indexes.sql          - Agent manifest optimization
20251220150000_resolver_indexes.sql                       - Performance tuning
```

### RLS Policy Patterns

**Total Policies:** 87 policies across all tables

#### Organization Scoping
```sql
-- Helper function for organization membership
CREATE FUNCTION is_member_of(org_id UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships
    WHERE user_id = auth.uid()
      AND organization_id = org_id
      AND deleted_at IS NULL
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- Example policy using helper
CREATE POLICY "Users view org documents"
  ON documents FOR SELECT
  USING (is_member_of(organization_id));
```

#### Role-Based Access
```sql
-- Helper function for role checking
CREATE FUNCTION has_min_role(org_id UUID, min_role TEXT) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.user_id = auth.uid()
      AND m.organization_id = org_id
      AND m.role >= min_role::role_type
      AND m.deleted_at IS NULL
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- Example policy requiring manager role
CREATE POLICY "Managers can post journals"
  ON journals FOR INSERT
  WITH CHECK (has_min_role(organization_id, 'MANAGER'));
```

---

## Package Inventory

### Total: 24 Packages (15 workspace + 9 apps/services)

### Workspace Packages (15)

#### Core Packages (5)
1. **@prisma-glow/lib** (`packages/lib`)
   - Shared utilities, types, constants
   - Dependencies: None (leaf package)
   - Used by: All apps and services
   - Health: ✅ Stable

2. **@prisma-glow/system-config** (`packages/system-config`)
   - Configuration loader for system.yaml
   - Dependencies: yaml, zod
   - Used by: Gateway, RAG, agents
   - Health: ✅ Stable

3. **@prisma-glow/api-client** (`packages/api-client`)
   - Generated TypeScript client from FastAPI OpenAPI
   - Dependencies: @openapi/typescript
   - Used by: Gateway, apps/web
   - Health: ⚠️ Needs codegen automation

4. **@prisma-glow/ui** (`packages/ui`)
   - Shared React component library (shadcn/ui)
   - Dependencies: React, Radix UI, Tailwind
   - Used by: apps/web, apps/admin
   - Health: ⚠️ Needs design system formalization

5. **@prisma-glow/types-finance** (`packages/types-finance`)
   - Financial domain types (IFRS, ISA, tax)
   - Dependencies: zod
   - Used by: FastAPI, apps/web, packages/tax
   - Health: ✅ Stable

#### Agent Packages (3)
6. **@prisma-glow/agents** (`packages/agents`)
   - Agent manifest schemas and utilities
   - Dependencies: zod, openai
   - Used by: Services/agents, scripts
   - Health: ⚠️ Overlaps with packages/prompts

7. **@prisma-glow/prompts** (`packages/prompts`)
   - Agent prompt templates
   - Dependencies: None
   - Used by: Services/agents
   - Health: ⚠️ Duplicate with agents package

8. **@prisma-glow/platform** (`packages/platform`)
   - Agent orchestration framework
   - Dependencies: openai, @prisma-glow/agents
   - Used by: Services/agents
   - Health: ⚠️ Needs modularization

#### Domain Packages (4)
9. **@prisma-glow/tax** (`packages/tax`)
   - Tax computation utilities (CIT, VAT, Pillar Two)
   - Dependencies: @prisma-glow/types-finance
   - Used by: FastAPI, services/tax
   - Health: ✅ Stable

10. **@prisma-glow/logger** (`packages/logger`)
    - Structured logging with correlation IDs
    - Dependencies: winston
    - Used by: Gateway, RAG
    - Health: ⚠️ Duplicate with packages/logging

11. **@prisma-glow/logging** (`packages/logging`)
    - Python logging configuration
    - Dependencies: structlog
    - Used by: FastAPI
    - Health: ⚠️ Duplicate with packages/logger

12. **@prisma-glow/config** (`packages/config`)
    - Legacy config loader
    - Dependencies: yaml
    - Used by: None (deprecated)
    - Health: ❌ Duplicate with system-config

#### Utility Packages (3)
13. **@prisma-glow/api** (`packages/api`)
    - Legacy API utilities
    - Dependencies: axios
    - Used by: Legacy Vite app
    - Health: ❌ To be removed

14. **@prisma-glow/dev-portal** (`packages/dev-portal`)
    - API documentation portal (Backstage)
    - Dependencies: @backstage/core
    - Used by: Development only
    - Health: ⚠️ Maintenance mode

15. **@prisma-glow/analytics** (`analytics/`)
    - Analytics service (Python)
    - Dependencies: pandas, numpy
    - Used by: Dashboard, reporting
    - Health: ✅ Stable

### Application Packages (5)
16. **apps/web** - Next.js client app (main PWA)
17. **apps/admin** - Admin panel (Next.js)
18. **apps/gateway** - Express.js API gateway
19. **apps/staff** - Legacy staff portal (to be removed)
20. **apps/lib** - Shared app utilities

### Service Packages (4)
21. **services/rag** - RAG service (Node.js + TypeScript)
22. **services/agents** - Agent orchestration (Node.js + OpenAI SDK)
23. **services/tax** - Tax computation service (Python)
24. **services/api** - Legacy API service (to be removed)

### Package Dependency Graph

```
┌─────────────────────────────────────────────────────────────┐
│                         Root                                │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
   ┌────▼────┐    ┌─────▼──────┐   ┌───▼────┐
   │  lib    │    │ system-    │   │ types- │
   │         │    │ config     │   │ finance│
   └────┬────┘    └─────┬──────┘   └───┬────┘
        │               │              │
        └───────┬───────┴──────┬───────┘
                │              │
         ┌──────▼──────┐   ┌───▼────────┐
         │ api-client  │   │   tax      │
         └──────┬──────┘   └───┬────────┘
                │              │
         ┌──────┴──────┬───────┴──────┐
         │             │              │
    ┌────▼─────┐  ┌────▼────┐   ┌────▼────┐
    │ gateway  │  │   web   │   │ agents  │
    └──────────┘  └─────────┘   └─────────┘
```

### Identified Duplicates (3)

1. **Logger/Logging**
   - `packages/logger` (Node.js/winston)
   - `packages/logging` (Python/structlog)
   - **Recommendation:** Keep separate, standardize interface

2. **Config/System-Config**
   - `packages/config` (deprecated)
   - `packages/system-config` (active)
   - **Recommendation:** Remove packages/config

3. **Prompts/Agents**
   - `packages/prompts` (templates only)
   - `packages/agents` (schemas + templates)
   - **Recommendation:** Merge into packages/agents

---

## Workflow Inventory

### Total: 19 GitHub Actions Workflows

**Location:** `.github/workflows/`

### Build & Test Workflows (5)

1. **ci.yml** - Main CI pipeline
   - Jobs: lint, typecheck, test, coverage, build, bundle-size
   - Triggers: push to main/develop, pull requests
   - Duration: ~8-12 minutes
   - Critical Path: Yes

2. **workspace-ci.yml** - Workspace parallel CI
   - Jobs: gateway, rag, web, node-packages, deno, backend-pytest
   - Parallelization: 6 jobs
   - Triggers: push to main, pull requests
   - Duration: ~10-15 minutes
   - Critical Path: Yes

3. **prisma-migrate.yml** - Prisma migrations
   - Jobs: migrate-dev, generate-client
   - Triggers: changes to apps/web/prisma/*
   - Duration: ~2-3 minutes
   - Critical Path: No

4. **supabase-migrate.yml** - Supabase migrations
   - Jobs: migrate, test-policies (pgTAP)
   - Triggers: changes to supabase/migrations/*
   - Duration: ~3-5 minutes
   - Critical Path: Yes (blocks deployment)

5. **lighthouse-ci.yml** - Lighthouse CI
   - Jobs: lighthouse-desktop, lighthouse-mobile
   - Triggers: push to main, PR to main
   - Duration: ~5-7 minutes
   - Critical Path: No (informational)

### Security Workflows (4)

6. **codeql.yml** - CodeQL security scanning
   - Languages: JavaScript, TypeScript, Python
   - Schedule: Weekly + on security changes
   - Duration: ~15-20 minutes
   - Critical Path: No

7. **gitleaks.yml** - Secret scanning
   - Scans: All files for leaked secrets
   - Triggers: push, pull request
   - Duration: ~1-2 minutes
   - Critical Path: Yes (blocking)

8. **container-scan.yml** - Container vulnerability scan
   - Tools: Trivy
   - Scans: All Docker images
   - Triggers: Docker file changes, scheduled
   - Duration: ~5-8 minutes
   - Critical Path: No

9. **ci-secret-guard.yml** - Secret exposure guard
   - Validates: No secrets in logs/artifacts
   - Triggers: All workflow runs
   - Duration: ~30 seconds
   - Critical Path: Yes

### Deployment Workflows (4)

10. **docker-build.yml** - Multi-platform Docker builds
    - Platforms: linux/amd64, linux/arm64
    - Images: gateway, rag, agent, analytics, ui, web
    - Triggers: tag push, manual
    - Duration: ~20-30 minutes
    - Critical Path: Yes (for releases)

11. **compose-deploy.yml** - Docker Compose deployment
    - Target: Production server via SSH
    - Strategy: Blue-green with health checks
    - Triggers: tag push, manual
    - Duration: ~5-10 minutes
    - Critical Path: Yes

12. **deploy-netlify.yml** - Netlify deployment (PWA frontend)
    - Environments: preview, staging, production
    - Triggers: push to dev/staging/main, PRs
    - Duration: ~3-5 minutes
    - Critical Path: No (alternative deployment)

13. **release.yml** - Semantic release
    - Generates: Changelog, version bump, GitHub release
    - Triggers: push to main
    - Duration: ~1-2 minutes
    - Critical Path: No

### Testing Workflows (3)

14. **pwa-audit.yml** - PWA compliance audit
    - Tools: Lighthouse, PWA checklist
    - Metrics: Manifest, service worker, offline
    - Triggers: PR to main
    - Duration: ~3-5 minutes
    - Critical Path: No

15. **staging-auth-tests.yml** - Auth integration tests
    - Environment: Staging
    - Tests: Login, signup, SSO, MFA
    - Triggers: deployment to staging
    - Duration: ~5-8 minutes
    - Critical Path: Yes (for staging gate)

16. **performance-nightly.yml** - Nightly performance tests
    - Tools: Artillery, k6
    - Load: 100 VU ramp over 10 minutes
    - Schedule: Daily 02:00 UTC
    - Duration: ~15-20 minutes
    - Critical Path: No

### Operational Workflows (3)

17. **healthz-smoke.yml** - Health check smoke tests
    - Endpoints: /health, /ready, /metrics
    - Frequency: Every 5 minutes
    - Duration: ~30 seconds
    - Critical Path: Yes (alerting)

18. **sbom.yml** - Software Bill of Materials
    - Generates: CycloneDX SBOM
    - Includes: npm, pip, Docker layers
    - Triggers: release, weekly
    - Duration: ~5-10 minutes
    - Critical Path: No (compliance)

19. **security.yml** - Dependency security scan
    - Tools: npm audit, pip-audit, Snyk
    - Triggers: dependency changes, scheduled
    - Duration: ~3-5 minutes
    - Critical Path: No

### Workflow Dependencies

```
Push to main
    │
    ├─> ci.yml ──────────┐
    ├─> workspace-ci.yml ┤
    ├─> gitleaks.yml ────┤
    ├─> ci-secret-guard ─┤
    │                    │
    │             All pass? ──> docker-build.yml
    │                              │
    │                              ├─> compose-deploy.yml (deprecated)
    │                              └─> deploy-netlify.yml
    │
    ├─> supabase-migrate.yml (if migrations/)
    ├─> prisma-migrate.yml (if prisma/)
    └─> release.yml (after all pass)

Scheduled:
    ├─> codeql.yml (weekly)
    ├─> performance-nightly.yml (daily)
    ├─> sbom.yml (weekly)
    └─> healthz-smoke.yml (every 5 min)
```

---

## Environment Variables Mapping

### Categories: 14

1. **Core Runtime** (15 variables)
2. **Database** (10 variables)
3. **Supabase** (12 variables)
4. **OpenAI** (8 variables)
5. **Authentication** (10 variables)
6. **Caching** (8 variables)
7. **Rate Limiting** (6 variables)
8. **Observability** (18 variables)
9. **Security** (12 variables)
10. **Feature Flags** (8 variables)
11. **External Integrations** (15 variables)
12. **Service URLs** (10 variables)
13. **Performance** (8 variables)
14. **Development** (10 variables)

**Total:** 150+ environment variables

### Critical Variables

#### Production-Required (must be set)
- `DATABASE_URL` - PostgreSQL connection string
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase public API key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase admin key
- `OPENAI_API_KEY` - OpenAI API key
- `SESSION_COOKIE_SECRET` - Session signing secret
- `NEXT_PUBLIC_SUPABASE_URL` - Client-side Supabase URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Client-side Supabase key

#### Optional (defaults provided)
- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (default: development)
- `CACHE_DEFAULT_TTL_SECONDS` - Cache TTL (default: 60)
- `RATE_LIMIT_WINDOW_MS` - Rate limit window (default: 60000)

---

## Gap Analysis

### Architecture Gaps

1. **Frontend Consolidation**
   - Current: 2 active frontends (Vite, Next.js)
   - Target: Single Next.js app
   - Gap: Migration plan needed

2. **Service Boundaries**
   - Current: Monolithic FastAPI (7k LOC)
   - Target: Modular routers with service layer
   - Gap: Decomposition roadmap

3. **Tool Proxy**
   - Current: Direct OpenAI tool calls from client
   - Target: Server-side proxy with whitelist
   - Gap: Security implementation

4. **Observability**
   - Current: Ad-hoc logging per service
   - Target: Unified OpenTelemetry
   - Gap: Instrumentation plan

### Database Gaps

1. **RLS Coverage**
   - Current: 65% of tables have RLS policies
   - Target: 100% coverage
   - Gap: 12 tables need policies

2. **Migration Testing**
   - Current: Manual testing
   - Target: Automated pgTAP tests
   - Gap: Test suite needed

3. **Backup Procedures**
   - Current: Supabase automatic backups
   - Target: Documented restore procedures
   - Gap: Runbook needed

### Package Gaps

1. **Duplicates**
   - Identified: 3 duplicate packages
   - Plan: Consolidation roadmap
   - Timeline: P2 phase

2. **Design System**
   - Current: Ad-hoc component styling
   - Target: Formalized token system
   - Gap: ui_ux.yaml needed

3. **API Client**
   - Current: Manual type updates
   - Target: Automated codegen
   - Gap: CI integration

### Security Gaps

1. **Key Rotation**
   - Current: Manual rotation
   - Target: 90-day automated rotation
   - Gap: Procedures documented in P8

2. **Security Headers**
   - Current: Partial CSP implementation
   - Target: Comprehensive headers
   - Gap: Configuration audit

3. **Secret Scanning**
   - Current: Gitleaks on push
   - Target: Pre-commit + runtime
   - Gap: Implementation plan

### Testing Gaps

1. **E2E Coverage**
   - Current: 15 Playwright tests
   - Target: 50+ critical path tests
   - Gap: Test plan in P7

2. **Performance Baselines**
   - Current: Manual Artillery runs
   - Target: Automated nightly tests
   - Gap: Threshold definition

3. **Accessibility**
   - Current: No automated tests
   - Target: axe-core in CI
   - Gap: Test infrastructure

---

## Target State Roadmap

### Immediate (Weeks 1-2)
- [ ] Complete P0-P2 documentation
- [ ] Identify all architecture gaps
- [ ] Create package consolidation plan

### Short-term (Weeks 3-6)
- [ ] Complete P3-P4 documentation
- [ ] Implement tool proxy
- [ ] Document RLS patterns

### Medium-term (Weeks 7-10)
- [ ] Complete P5-P7 documentation
- [ ] Frontend consolidation decision
- [ ] Testing infrastructure buildout

### Long-term (Weeks 11-14)
- [ ] Complete P8-P10 documentation
- [ ] Security hardening implementation
- [ ] CI/CD pipeline optimization
- [ ] Go-live gate validation

---

## Related Documentation

- [REFACTOR/plan.md](./plan.md) - Implementation roadmap
- [ARCHITECTURE.md](../ARCHITECTURE.md) - High-level architecture
- [docs/RFC_FULLSTACK_REFACTOR.md](../docs/RFC_FULLSTACK_REFACTOR.md) - Original RFC

## Appendix

### Migration Scripts Inventory
- Total: 119 files
- Earliest: 2025-08-21
- Latest: 2025-12-20
- Average per month: 24 migrations

### Package Size Analysis
- Smallest: @prisma-glow/types-finance (50 KB)
- Largest: @prisma-glow/platform (2.5 MB)
- Total workspace: ~15 MB

### Workflow Performance
- Fastest: ci-secret-guard (30s)
- Slowest: docker-build (30 min)
- Total CI time per PR: ~45 minutes
- Parallelization factor: 3-4x
