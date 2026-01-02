# Comprehensive Audit Report - Accounting & Tax AI Agent System

Generated: 2026-01-02T17:02:12Z

## Executive Summary
The repository contains a large multi-service system with extensive documentation but several critical security and readiness blockers. The highest risks are unauthenticated API endpoints, tenant isolation gaps in the gateway, a FastAPI import failure, and missing RAG build dependencies. Production release is **BLOCKED** until P0 issues are resolved.

## Scope
- Frontend apps: `apps/web`, `apps/admin`, `apps/client`, `src` (Vite).
- Backend services: `server/*` (FastAPI), `apps/gateway` (Express), `services/rag` (Express).
- Database schema/migrations: `supabase/migrations/*`, `db/migrations/*`.
- Edge functions: `supabase/functions/*`.
- Observability, CI/CD, and docs.

## Methodology
- Code inspection with line-level evidence.
- Targeted schema review from Supabase migrations.
- Secret scan (redacted output only).
- Non-destructive test/lint/build runs (pnpm + pytest).

## What Exists
- **Frontend**: Next.js apps in `apps/web`, `apps/admin`, `apps/client`, plus a Vite app in `src`.
- **Backend**: Python FastAPI in `server/main.py`, Express gateway in `apps/gateway`, Express RAG service in `services/rag`.
- **Serverless**: Supabase Edge function in `supabase/functions/api/index.ts`.
- **Database**: Supabase migrations in `supabase/migrations`, local SQL migrations in `db/migrations`.
- **AI/Agents**: Python agents in `server/agents`, TypeScript agents in `packages/agents` and `packages/tax`.
- **Infra/CI**: Docker compose files, GitHub Actions workflows, and Supabase CLI scripts.

## Missing or Unclear Docs
- **Service startup/runbook per component**: explicit start commands for `services/rag` and `apps/gateway` are not documented in a single place (UNVERIFIED).
- **Auth/RBAC source of truth**: no single document mapping `members`/`memberships`/`organization_members` to service usage (UNVERIFIED).
- **Deployment topology**: no definitive document describing where each service runs in production (UNVERIFIED).

## Immediate P0s Found During Discovery
- **Unauthenticated FastAPI agent/tool/persona/knowledge/execution routes** (`server/api/agents.py:96`, `server/api/executions.py:70`, `server/api/tools.py:61`, `server/api/personas.py:55`, `server/api/knowledge.py:69`).
- **Gateway service-role access without enforced tenant scoping** (`apps/gateway/src/index.ts:60`, `apps/gateway/src/services/AgentService.ts:60`, `apps/gateway/src/middleware/auth.ts:91`).
- **FastAPI RAG router import failure** (`server/api/rag.py:57`).
- **Missing runtime modules for RAG service** (`services/rag/index.ts:61`, `packages/lib/package.json:8`, `services/rag/tsconfig.json:23`).
- **Token-like strings in docs/scripts (UNVERIFIED)** (`SETUP_COMPLETE.md:121`, `DEPLOYMENT_SUCCESS.md:111`).

## Repo Structure & Runtimes (A)
- Next.js apps: `apps/web`, `apps/admin`, `apps/client`.
- Express gateway: `apps/gateway`.
- Python FastAPI API: `server/main.py`.
- Express RAG service: `services/rag/index.ts`.
- Supabase Edge Function: `supabase/functions/api/index.ts`.

## Critical User Journeys & Data Flows (B)
1. **Auth + Role Resolution**: Supabase auth -> role lookup in `members` table (`apps/web/components/features/auth/auth-provider.tsx:37`).
2. **Org Admin & IAM**: Supabase REST (service role) via `server/routers/iam.py`.
3. **Agent Creation & Execution**: Python API (`server/api/agents.py`, `server/api/executions.py`) and Gateway API (`apps/gateway/*`).
4. **Document Analytics (ADA)**: `server/api/documents.py` writes ADA runs + exceptions.
5. **Ledger/Close**: Schema and RLS in `supabase/migrations/20250924103000_accounting_close_gl.sql` and `supabase/migrations/20250924103001_accounting_close_gl_rls.sql`.

UNVERIFIED: End-to-end wiring from UI to backend for ledger import and RAG search due to missing routes and failing tests.

## External Integrations & Required Env Vars (C)
- Supabase (Auth/DB/Storage): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`.
- OpenAI: `OPENAI_API_KEY`.
- Gemini/Google: `GEMINI_API_KEY`, `GOOGLE_API_KEY`.
- Redis: `REDIS_URL`.
- Sentry/OTEL: `SENTRY_DSN`, `OTEL_EXPORTER_OTLP_ENDPOINT`.

See `ENV_GUIDE.md` and `.env.*.example` for full list.

## Findings

### P0 (Must fix before production)

**P0-1 Unauthenticated and unauthorized API endpoints (FastAPI)**
- Agent CRUD and execution endpoints do not require auth and are included in the app (`server/api/agents.py:96`, `server/api/executions.py:70`, `server/main.py:6431`).
- Tools, personas, and knowledge APIs are unauthenticated and use in-memory stores (`server/api/tools.py:61`, `server/api/personas.py:55`, `server/api/knowledge.py:69`).
- DB access uses Supabase service role key (bypasses RLS) (`server/services/database_service.py:28`).

**P0-2 Gateway uses service role key without tenant enforcement**
- Supabase client is initialized with service role key (`apps/gateway/src/index.ts:60`).
- Org scoping is optional in queries (`apps/gateway/src/services/AgentService.ts:60`).
- Middleware derives org but does not enforce it (`apps/gateway/src/middleware/auth.ts:91`).

**P0-3 FastAPI RAG router import failure**
- `server/api/rag.py` has duplicate keyword args in `HTTPException`, which is a syntax error (`server/api/rag.py:57`).
- Router is included in main app (`server/main.py:6461`).

**P0-4 Missing runtime modules for RAG service**
- `services/rag/index.ts` imports `@prisma-glow/lib/secrets` which is not exported by `packages/lib` (`services/rag/index.ts:61`, `packages/lib/package.json:8`).
- `services/rag` depends on missing `packages/system-config` (`services/rag/package.json:29`, `services/rag/tsconfig.json:23`).

### P1 (Strongly recommended before production)

**P1-1 RBAC data model mismatch**
- Services reference `members`, `memberships`, and `organization_members` tables inconsistently. Role vocabularies also diverge (config vs DB enum).
- Evidence: `apps/web/components/features/auth/auth-provider.tsx:37`, `server/api_helpers.py:270`, `apps/gateway/src/middleware/auth.ts:91`, `supabase/migrations/20250830125756_a814a60a-2361-4a22-86ab-243f73b901ba.sql:17`, `supabase/migrations/20250821115118_c8efec61-c52e-4db8-ac92-82c3ca0a7579.sql:33`, `config/system.yaml:52`.

**P1-2 Ledger integrity constraints missing**
- Ledger entries do not enforce debit/credit validation or batch balancing in the schema.
- Evidence: `supabase/migrations/20250924103000_accounting_close_gl.sql:72`.

**P1-3 Rate limiting fails open and is inconsistent**
- Redis limiter allows all requests when Redis errors (`server/rate_limiter.py:107`).
- RAG service uses in-memory rate limiting, not distributed (`services/rag/index.ts:2334`).

**P1-4 Test suite fails in collection**
- Pytest fails due to missing `get_db` and missing registry exports; tests reference non-existent paths.
- Evidence: `server/db.py` has no `get_db` function, `server/agents/registry.py` has no `get_agent_registry`.

**P1-5 Ledger import endpoints referenced by tests do not exist**
- Integration tests import `@/app/api/gl/accounts/import/route` which is absent in repo.
- Evidence: `services/ledger/tests/integration/ledger.integration.spec.ts:117`.

### P2 (Fix soon after go-live)

**P2-1 Wide CORS in edge function**
- Edge function allows `Access-Control-Allow-Origin: *` for endpoints calling OpenAI.
- Evidence: `supabase/functions/api/index.ts:4`.

**P2-2 Sensitive error logging risk**
- Error logs include upstream response bodies which may contain PII.
- Evidence: `server/routers/iam.py:124`.

**P2-3 Hard-coded tax rate data**
- VAT/GST agent uses hard-coded rates and a fixed effective date.
- Evidence: `packages/tax/src/agents/tax-vat-028.ts:26`.

**P2-4 UI mock data in production routes**
- Clients page uses hard-coded sample data.
- Evidence: `apps/web/app/(auth)/clients/page.tsx:3`.

### P3 (Nice-to-have)

**P3-1 Config allows all web sources**
- URL sources allow wildcard domains; may be acceptable for internal use but risky if enabled.
- Evidence: `config/system.yaml:91` and `config/system.yaml:136`.

### P0 (UNVERIFIED) Potential secrets in docs/scripts
- Token-like strings appear in documentation and scripts. These might be placeholders, but require verification and rotation if real.
- Evidence (redacted): `SETUP_COMPLETE.md:121`, `DEPLOYMENT_SUCCESS.md:111`.

## Frontend Findings

### P0 (Must fix before production)

**FE-P0-1 Client-exposed Gemini API key**
- `src/lib/env.ts:6-8` loads `VITE_GEMINI_API_KEY` into client runtime config.
- `src/services/gemini/gemini-client.ts:39-49` sends `VITE_GEMINI_API_KEY` as a Bearer token from the browser.
- `src/hooks/gemini/useGeminiChat.ts:1-71` uses `geminiClient` in UI hooks, so the key is bundled client-side.

**FE-P0-2 Admin knowledge console uses service-role key without auth gating**
- `apps/web/app/admin/knowledge/actions.ts:8-12` initializes a Supabase client with `SUPABASE_SERVICE_ROLE_KEY` in server actions.
- `apps/web/app/admin/knowledge/page.tsx:1-33` invokes `getKnowledgeStats()` from a client component on page load.
- `apps/web/app/admin/layout.tsx:1-87` contains no auth/role checks; `apps/web/hooks/use-auth-redirect.ts:7-18` exists but is unused.
- Result: unauthenticated users can trigger server actions that access/update knowledge tables with service-role privileges.

### P1 (Strongly recommended before production)

**FE-P1-1 Web app routes are not protected**
- `apps/web/app/(auth)/layout.tsx:33-90` does not check session/role, and `useRequireAuth` is never called.
- `apps/web/hooks/use-auth-redirect.ts:7-18` defines `useRequireAuth`, but no routes use it.

**FE-P1-2 Role fallback defaults to staff**
- `apps/web/components/features/auth/auth-provider.tsx:34-51` sets role to `'staff'` when role lookup fails, granting elevated UI access.

**FE-P1-3 Tax automation routes lack role enforcement in SPA**
- `src/App.tsx:100-257` defines `tax/*` routes under the org-level `ProtectedRoute` without `requiredRole`.
- `src/components/layout/sidebar.tsx:82-89` hides tax links for non-managers but does not block direct URL access.

**FE-P1-4 Currency/rounding mismatches in financial UI**
- `src/pages/accounting/index.tsx:686-690` forces EUR with zero decimals for accounting close metrics.
- `src/pages/tax/treaty-wht.tsx:27-31` forces EUR with zero decimals for tax WHT calculations.
- `src/pages/audit/workspace/reconciliations.tsx:684-686` forces USD elsewhere, creating inconsistent currency displays.

**FE-P1-5 Admin/Client Next apps have no authentication**
- `apps/admin/app/page.tsx:1-6` and `apps/client/app/page.tsx:1-7` are publicly accessible pages with no auth flow.
- `apps/admin/middleware.ts:1` and `apps/client/middleware.ts:1` apply only security headers, not auth checks.

**FE-P1-6 Frontend build/typecheck failures block release**
- Web app typecheck/build fail on missing Tauri modules (`apps/web/lib/desktop/tauri.ts:29-42`, `apps/web/app/components/desktop/SyncManager.tsx:46-47`).
- SPA typecheck fails with TSX parse errors (`src/components/agents/AgentCard.tsx:228`, `src/components/desktop/DesktopFeatures.tsx:43`, `src/pages/admin/agents/index.tsx:16`).

### P2 (Fix soon after go-live)

**FE-P2-1 Open redirect in auth callback**
- `apps/web/app/(public)/auth/callback/page.tsx:31-64` redirects to `next` query param without origin/path validation.

**FE-P2-2 Client-side lockout and rate limiting are bypassable**
- `apps/web/app/(public)/login/page.tsx:54-107` stores login attempt counts in `localStorage` only.

**FE-P2-3 Missing numeric validation in tax WHT inputs**
- `src/pages/tax/treaty-wht.tsx:161-184` converts user input with `Number(...)` but does not validate `Number.isFinite` or non-negative values.

**FE-P2-4 PWA caching can serve stale accounting data**
- `apps/web/next.config.mjs:13-30` caches Supabase API responses with `NetworkFirst`, allowing stale financial data in UI.

**FE-P2-5 Web build ignores type/lint errors**
- `apps/web/next.config.mjs:26-33` sets `typescript.ignoreBuildErrors` and `eslint.ignoreDuringBuilds` to true.

### P3 (Nice-to-have)

**FE-P3-1 Accessibility: password toggle is not keyboard reachable**
- `apps/web/app/(public)/login/page.tsx:176-181` sets `tabIndex={-1}` on the toggle button and provides no `aria-label`.

## Backend Findings

### P0 (Must fix before production)

**BE-P0-1 Unauthenticated FastAPI endpoints expose agent execution and collaboration controls**
- Examples with no auth dependency: `server/api/agents_sdk.py:189`, `server/api/executions.py:70`, `server/api/tax_agents.py:40`, `server/api/deep_search.py:268`, `server/api/collaboration_api.py:21`, `server/api/workflows_api.py:19`, `server/api/websocket_api.py:13`.

**BE-P0-2 Gemini chat endpoints allow unauthenticated use of server API keys**
- `server/api/gemini_chat.py:52` falls back to `GOOGLE_API_KEY` when no Authorization header is present and does not require user auth (`server/api/gemini_chat.py:66`).

**BE-P0-3 Learning router import failures block service startup**
- `server/api/learning/__init__.py:13` imports `server.auth` which is absent; `server/api/learning.py:13` imports `get_current_user`/`require_role` from `server/security.py` which are not defined there (`server/security.py:1`); `server/db.py:1` defines no `get_db` used by these routers.
- `server/main.py:85` imports the learning router, so the missing dependencies break startup.

**BE-P0-4 Workflow router has duplicate keyword args (syntax error)**
- `server/api/workflows.py:51` and `server/api/workflows.py:66` pass `detail` twice in `HTTPException`, which is invalid.

**BE-P0-5 Gateway uses service-role Supabase without enforced org scoping**
- Auth middleware only sets `req.orgId` optionally and `requireOrganization` is unused (`apps/gateway/src/middleware/auth.ts:75`, `apps/gateway/src/middleware/auth.ts:133`).
- Data access relies on service-role client with optional org filters (`apps/gateway/src/index.ts:60`, `apps/gateway/src/services/AgentService.ts:50`).

### P1 (Strongly recommended before production)

**BE-P1-1 Analytics ingest can be unauthenticated if token is unset**
- `_INGEST_TOKEN` is optional and `_verify_ingest_token` returns without checks when missing (`services/analytics/app.py:26`, `services/analytics/app.py:87`).

**BE-P1-2 Rate limiting fails open on Redis errors**
- Redis exceptions allow requests through (`server/rate_limiter.py:107`).

**BE-P1-3 Execution requests accept caller-supplied user IDs**
- `ExecuteAgentRequest.user_id` is client-provided and persisted without validation (`server/api/executions.py:31`, `server/api/executions.py:100`).

**BE-P1-4 Invite token returned in API response**
- `/members/invite` returns raw invite token (`server/routers/iam.py:244`), which can be leaked by logs or clients.

**BE-P1-5 Supabase Edge function has no rate limits or schema validation**
- `supabase/functions/api/index.ts:77` accepts chat/RAG/analytics payloads with minimal validation and no per-user limits (`supabase/functions/api/index.ts:111`).

### P2 (Fix soon after go-live)

**BE-P2-1 Wide CORS on edge function**
- `Access-Control-Allow-Origin: *` on edge APIs (`supabase/functions/api/index.ts:4`).

**BE-P2-2 WhatsApp webhook verification is weak (UNVERIFIED wiring)**
- Verification uses a default token and no signature validation (`src/routes/webhooks/whatsapp.ts:46`).
- UNVERIFIED: webhook routes are not mounted in any server entrypoint.

**BE-P2-3 RAG service rate limits are in-memory only**
- Per-user request buckets are stored in process memory (`services/rag/index.ts:2334`), so limits reset on restart and do not work across replicas.

### P3 (Nice-to-have)

**BE-P3-1 Tool API uses in-memory storage**
- Tool and assignment data is stored in module-level dicts (`server/api/tools.py:61`), which is not durable and will reset on restart.

## Accounting/Tax Correctness Risks

### P0 (Must fix before production)

**AT-P0-1 Double-entry integrity is not enforced in the ledger schema**
- `ledger_entries` has `debit` and `credit` columns without any CHECK constraints or batch balancing enforcement (`supabase/migrations/20250924103000_accounting_close_gl.sql:139`, `supabase/migrations/20250924103000_accounting_close_gl.sql:140`).

### P1 (Strongly recommended before production)

**AT-P1-1 Two parallel ledger schemas risk conflicting sources of truth**
- Older journal tables (`journal_entries`/`journal_lines`) include debit/credit checks (`supabase/migrations/20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql:433`) while the new `ledger_entries` model does not (`supabase/migrations/20250924103000_accounting_close_gl.sql:139`).

**AT-P1-2 Posting rules and immutability are not enforced**
- `journal_batches.status` is free text with no enum/check constraints (`supabase/migrations/20250924103000_accounting_close_gl.sql:120`).
- `ledger_entries` lacks status or immutability fields (only `created_at`) (`supabase/migrations/20250924103000_accounting_close_gl.sql:146`).

**AT-P1-3 Multi-currency controls are insufficient**
- Currency defaults to `EUR` on both accounts and entries, and FX rate is optional with no constraints (`supabase/migrations/20250924103000_accounting_close_gl.sql:106`, `supabase/migrations/20250924103000_accounting_close_gl.sql:141`).

**AT-P1-4 Tax guidance is LLM-generated with no deterministic calculations or citations**
- Tax agents call Gemini to generate guidance (`server/agents/tax/base.py:64`) and return empty citations by default (`server/agents/tax/base.py:116`).

### P2 (Fix soon after go-live)

**AT-P2-1 VAT/GST rates are hard-coded with a fixed effective date**
- Static rate table in `packages/tax/src/agents/tax-vat-028.ts:26` with fixed `effectiveDate` (`packages/tax/src/agents/tax-vat-028.ts:49`).

**AT-P2-2 Reconciliation matching is naive**
- Reconciliation matches only exact date and amount within a fixed tolerance (`server/agents/accounting/bookkeeping_tools.py:61`).

**AT-P2-3 Ledger precision may be insufficient for FX/tax**
- Debit/credit and trial balance totals are fixed to 2 decimals (`supabase/migrations/20250924103000_accounting_close_gl.sql:139`, `supabase/migrations/20250924103000_accounting_close_gl.sql:155`).

### P3 (Nice-to-have)

**AT-P3-1 Default currency assumptions**
- Accounts default to `EUR` without org-level override enforcement (`supabase/migrations/20250924103000_accounting_close_gl.sql:106`).

## Database Findings

### Inventory (Accounting Core Tables)
- **Database tech**: PostgreSQL (Supabase) with extensions `pgcrypto`, `vector`, `pg_trgm` and RLS enabled (`supabase/migrations/001_initial_schema.sql:1`, `supabase/migrations/001_initial_schema.sql:83`).
- **Migration tooling**: SQL migrations under `supabase/migrations/*.sql`, with additional SQL migration roots in `migrations/sql/*.sql` and `db/migrations/001_init.sql`.
- **Users/roles**: `public.users` + `public.memberships` (`supabase/migrations/20250821115118_c8efec61-c52e-4db8-ac92-82c3ca0a7579.sql:13`, `supabase/migrations/20250821115118_c8efec61-c52e-4db8-ac92-82c3ca0a7579.sql:33`), `app_users` + `members` (`supabase/migrations/20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql:33`, `supabase/migrations/20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql:39`), and `profiles` (`supabase/migrations/001_initial_schema.sql:8`).
- **Customers/vendors**: `clients` (`supabase/migrations/20250821115118_c8efec61-c52e-4db8-ac92-82c3ca0a7579.sql:43`) and `vendors` (`supabase/migrations/20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql:387`).
- **Chart of accounts**: `chart_of_accounts` (`supabase/migrations/20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql:378`) and `ledger_accounts` (`supabase/migrations/20250924103000_accounting_close_gl.sql:99`).
- **Journal entries**: `journal_entries`/`journal_lines` (`supabase/migrations/20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql:419`, `supabase/migrations/20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql:428`) and `journal_batches` (`supabase/migrations/20250924103000_accounting_close_gl.sql:114`).
- **Ledgers/balances**: `ledger_entries` and `trial_balance_snapshots` (`supabase/migrations/20250924103000_accounting_close_gl.sql:131`, `supabase/migrations/20250924103000_accounting_close_gl.sql:149`).
- **Tax tables**: `vat_rules`/`vat_returns` (`supabase/migrations/20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql:462`, `supabase/migrations/20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql:473`), `tax_entities`/`cit_computations` (`supabase/migrations/20250924100500_tax_mt_cit_imputation.sql:41`, `supabase/migrations/20250924100500_tax_mt_cit_imputation.sql:70`), and `treaty_wht_calculations` (`supabase/migrations/20250924210000_tax_treaty_wht.sql:12`).
- **Audit/event logs**: `activity_log` (`supabase/migrations/20250821115118_c8efec61-c52e-4db8-ac92-82c3ca0a7579.sql:115`), `audit_logs` (`db/migrations/001_init.sql:25`), `analytics_events` (`supabase/migrations/001_initial_schema.sql:64`).

### P0 (Must fix before production)

**DB-P0-1 Destructive migrations without rollback safeguards**
- Unconditional `DROP TABLE` statements can delete production data if executed (`supabase/migrations/20251111090000_audit_ctrl1_ada1_rec1.sql:74`, `supabase/migrations/20251113093000_audit_acceptance_foundation.sql:197`, `supabase/migrations/20250924100500_tax_mt_cit_imputation.sql:68`).
- `idempotency_keys` migration drops constraints/columns in-place (`supabase/migrations/20250925221000_idempotency_keys_patch.sql:34`).

### P1 (Strongly recommended before production)

**DB-P1-1 Ledger entries can be deleted via account deletion**
- `ledger_entries.account_id` uses `ON DELETE CASCADE`, which can erase accounting history if a ledger account is removed (`supabase/migrations/20250924103000_accounting_close_gl.sql:137`).

**DB-P1-2 VAT returns lack an organization foreign key**
- `vat_returns.org_id` is not declared as a FK to `organizations` (`supabase/migrations/20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql:473`), allowing orphans.

**DB-P1-3 Tenant/RBAC functions use multiple membership tables**
- `app.is_org_member` checks `members` (`supabase/migrations/20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql:93`) while `public.is_member_of` checks `memberships` (`supabase/migrations/20250821115118_c8efec61-c52e-4db8-ac92-82c3ca0a7579.sql:137`).
- Policies also reference `organization_members` without a matching create-table migration in this repo (UNVERIFIED; see references in `supabase/migrations/20251128000000_comprehensive_rls_policies.sql:318`).

**DB-P1-4 Separate migration roots define overlapping schema**
- `db/migrations/001_init.sql` defines `audit_logs`, `accounting_transactions`, and `tax_filings` without any RLS statements (`db/migrations/001_init.sql:25`, `db/migrations/001_init.sql:42`, `db/migrations/001_init.sql:61`), which is unsafe if applied to prod (UNVERIFIED deployment path).

### P2 (Fix soon after go-live)

**DB-P2-1 Ledger tables lack indexes for common access patterns (UNVERIFIED)**
- `ledger_entries`, `ledger_accounts`, and `trial_balance_snapshots` are created without any `CREATE INDEX` statements in the ledger migration (`supabase/migrations/20250924103000_accounting_close_gl.sql:99`).

## Data Model Gaps

**Gap-1 Invoices and invoice lines are not modeled (UNVERIFIED)**
- No `invoices`/`invoice_lines` tables found in migrations; only seeded text references appear (`supabase/migrations/20250901063007_ebc6d971-3a9c-401b-adc0-7724a804337f.sql:84`).

**Gap-2 Payments/receipts are not modeled (UNVERIFIED)**
- No payment/receipt tables found; only `payment_type` appears in tax treaty WHT (`supabase/migrations/20250924210000_tax_treaty_wht.sql:17`).

**Gap-3 Multiple accounting sources of truth**
- Operational transactions (`transactions`) live separately from double-entry (`journal_entries`/`journal_lines`) and GL (`ledger_entries`) with no linking FK or invariant (`supabase/migrations/20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql:403`, `supabase/migrations/20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql:419`, `supabase/migrations/20250924103000_accounting_close_gl.sql:131`).
- `db/migrations/001_init.sql` adds `accounting_transactions` in yet another table (`db/migrations/001_init.sql:42`).

**Gap-4 Chart-of-accounts type is unconstrained**
- `chart_of_accounts.type` is free text without enum/check constraints (`supabase/migrations/20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql:383`).

## Recommendations
1. Enforce `require_auth` and org checks across all APIs, and remove service role keys from user-facing paths.
2. Consolidate membership tables and role enums to one schema; update RLS and application logic.
3. Fix `server/api/rag.py` syntax error and restore missing RAG modules/exports.
4. Add ledger integrity constraints and double-entry validation.
5. Align rate limiting across services and avoid fail-open behaviors.
6. Repair test suite imports and missing routes, then add regression coverage for auth/RBAC and ledger integrity.
7. Restrict CORS in edge functions and redact sensitive response bodies in logs.
8. Replace hard-coded tax data with versioned sources and update cadence.

### Frontend UX Hardening Steps
1. Move Gemini/OpenAI calls to backend-only endpoints; issue per-user auth tokens and remove all LLM API keys from browser bundles.
2. Enforce auth + role gating in `apps/web` and the SPA: apply Next middleware guards, use `useRequireAuth` in layouts, and require manager roles on tax/admin routes.
3. Standardize currency/rounding: store org currency + precision in settings and render with consistent `Intl.NumberFormat` (show decimals for cents) plus currency codes.
4. Add explicit confirmation flows for close-period lock/post actions and irreversible tax submissions; use idempotency keys to prevent duplicates.
5. Validate all financial inputs with schemas (e.g., Zod) and reject NaN/negative values both client- and server-side.
6. Remove PWA caching for financial APIs or add “stale data” indicators + forced refresh on critical screens.
7. Improve accessibility for icon-only controls (aria-labels, keyboard focus) and remove `tabIndex={-1}` where not required.

## Implemented Fixes
- None in this audit.

## Production Readiness Score
Weighted score: **33 / 100**

- Security & Secrets (25): 6
- Data Integrity & Accounting Correctness (20): 6
- Reliability/Observability (15): 6
- Testing/QA/UAT coverage (15): 3
- Deployment/CI/CD maturity (10): 5
- Performance/Scalability (10): 4
- Documentation/Operability (5): 3

## Tests/Lints/Builds Executed (D)
- `pnpm -r test` (failed: missing node_modules/vitest/jest).
- `pnpm -r lint` (failed: missing node_modules/next/eslint).
- `pnpm -r build` (failed: missing node_modules/next).
- `python3 -m pytest -q` (failed: missing imports and missing files).
- `pnpm install` (root workspace) (ok; warning: supabase bin symlink).
- `pnpm --filter @prisma-glow/web typecheck` (failed: missing `@tauri-apps/api/tauri` types).
- `pnpm --filter @prisma-glow/web lint` (failed: interactive Next lint prompt).
- `pnpm --filter @prisma-glow/web test` (ok: “No tests”).
- `pnpm --filter @prisma-glow/web build` (failed: missing `@tauri-apps/api/tauri`).
- `pnpm --filter @prisma-glow/admin typecheck` (ok).
- `pnpm --filter @prisma-glow/admin lint` (warning: react-refresh in `apps/admin/app/layout.tsx`).
- `pnpm --filter @prisma-glow/admin test` (ok: “No tests”).
- `pnpm --filter @prisma-glow/admin build` (ok; Tailwind content warning).
- `pnpm --filter @prisma-glow/client typecheck` (ok).
- `pnpm --filter @prisma-glow/client lint` (warnings: react-refresh in `apps/client/app/layout.tsx`).
- `pnpm --filter @prisma-glow/client test` (ok: “No tests”).
- `pnpm --filter @prisma-glow/client build` (ok; Tailwind content warning).
- `npm install` (in `prisma-glow-ui`) (ok after retry; initial timeout).
- `npm run type-check` (in `prisma-glow-ui`) (failed: missing `tsconfig.node.json`).
- `npm run lint` (in `prisma-glow-ui`) (failed: ESLint flat-config CLI flags).
- `npm run test` (in `prisma-glow-ui`) (failed: no tests found).
- `npm run build` (in `prisma-glow-ui`) (failed: missing `tsconfig.node.json`).
- `pnpm exec tsc -p tsconfig.app.json --noEmit` (failed: TSX parse errors).
- `pnpm exec eslint src` (failed: parse errors + no-console violations).
- `pnpm exec vitest run src` (failed: missing `@vitejs/plugin-react-swc`).
- `pnpm build:desktop-ui` (failed: `vite` not installed).

## Audit Log (timestamps, commands) (E)
- 2026-01-02T17:02:12Z `ls`
- 2026-01-02T17:02:12Z `rg --files -g 'package.json'`
- 2026-01-02T17:02:12Z `cat package.json`
- 2026-01-02T17:02:12Z `cat apps/web/package.json`
- 2026-01-02T17:02:12Z `cat apps/gateway/package.json`
- 2026-01-02T17:02:12Z `cat services/rag/package.json`
- 2026-01-02T17:02:12Z `ls db` and `cat db/migrations/001_init.sql`
- 2026-01-02T17:02:12Z `ls supabase/migrations` and sampled `sed -n` reads
- 2026-01-02T17:02:12Z `sed -n` reads for `server/main.py`, `server/api_helpers.py`, `server/api/*.py`, `apps/gateway/*`, `services/rag/*`, `supabase/functions/api/index.ts`
- 2026-01-02T17:02:12Z Secret scan via python script (redacted output)
- 2026-01-02T17:02:12Z `pnpm -r test`
- 2026-01-02T17:02:12Z `pnpm -r lint`
- 2026-01-02T17:02:12Z `pnpm -r build`
- 2026-01-02T17:02:12Z `python3 -m pytest -q`
- 2026-01-02T17:49:49Z `pnpm install`
- 2026-01-02T17:49:49Z `pnpm --filter @prisma-glow/web typecheck`
- 2026-01-02T17:49:49Z `pnpm --filter @prisma-glow/web lint`
- 2026-01-02T17:49:49Z `pnpm --filter @prisma-glow/web test`
- 2026-01-02T17:49:49Z `pnpm --filter @prisma-glow/web build`
- 2026-01-02T17:49:49Z `pnpm --filter @prisma-glow/admin typecheck`
- 2026-01-02T17:49:49Z `pnpm --filter @prisma-glow/admin lint`
- 2026-01-02T17:49:49Z `pnpm --filter @prisma-glow/admin test`
- 2026-01-02T17:49:49Z `pnpm --filter @prisma-glow/admin build`
- 2026-01-02T17:49:49Z `pnpm --filter @prisma-glow/client typecheck`
- 2026-01-02T17:49:49Z `pnpm --filter @prisma-glow/client lint`
- 2026-01-02T17:49:49Z `pnpm --filter @prisma-glow/client test`
- 2026-01-02T17:49:49Z `pnpm --filter @prisma-glow/client build`
- 2026-01-02T17:49:49Z `npm install` (prisma-glow-ui, initial timeout then succeeded)
- 2026-01-02T17:49:49Z `npm run type-check` (prisma-glow-ui)
- 2026-01-02T17:49:49Z `npm run lint` (prisma-glow-ui)
- 2026-01-02T17:49:49Z `npm run test` (prisma-glow-ui)
- 2026-01-02T17:49:49Z `npm run build` (prisma-glow-ui)
- 2026-01-02T17:49:49Z `pnpm exec tsc -p tsconfig.app.json --noEmit`
- 2026-01-02T17:49:49Z `pnpm exec eslint src`
- 2026-01-02T17:49:49Z `pnpm exec vitest run src`
- 2026-01-02T17:49:49Z `pnpm build:desktop-ui`
- 2026-01-02T17:49:49Z `rg --files -g "package.json" apps`
- 2026-01-02T17:49:49Z `rg -n "supabase" apps/web`
- 2026-01-02T17:49:49Z `rg -n "dangerouslySetInnerHTML" apps prisma-glow-ui src`
- 2026-01-02T17:49:49Z `nl -ba apps/web/components/features/auth/auth-provider.tsx`
- 2026-01-02T17:49:49Z `nl -ba apps/web/app/(public)/auth/callback/page.tsx`
- 2026-01-02T17:49:49Z `nl -ba src/services/gemini/gemini-client.ts`
- 2026-01-02T17:49:49Z `nl -ba src/App.tsx`
- 2026-01-02T17:49:49Z `nl -ba src/pages/tax/treaty-wht.tsx`
- 2026-01-02T17:49:49Z `nl -ba src/pages/accounting/index.tsx`
- 2026-01-02T17:49:49Z `cat apps/web/next.config.mjs`
- 2026-01-02T19:06:33Z `ls`
- 2026-01-02T19:06:33Z `ls server` and `ls server/api`
- 2026-01-02T19:06:33Z `date -u +%Y-%m-%dT%H:%M:%SZ`
- 2026-01-02T19:06:33Z `tail -n 30 AUDIT_REPORT.md`
- 2026-01-02T19:06:33Z `sed -n '1,220p' AUDIT_REPORT.md` and `sed -n '240,340p' AUDIT_REPORT.md`
- 2026-01-02T19:06:33Z `rg -n "Audit Log|audit log|Log" AUDIT_REPORT.md`
- 2026-01-02T19:06:33Z `rg -n "get_current_user"` and `rg -n "authMiddleware" services/rag/index.ts`
- 2026-01-02T19:06:33Z `rg -n "handleTaxRwandaWebhook|verifyWebhook" -g "*.ts"`
- 2026-01-02T19:06:33Z `rg -n "include_router" server/main.py`
- 2026-01-02T19:06:33Z `rg -n "@router\\.(get|post|put|delete|patch)" server/api -g "*.py"` and `rg -n "require_auth" server/api -g "*.py"`
- 2026-01-02T19:06:33Z `sed -n`/`nl -ba` reads for `server/api/agents.py`, `server/api/executions.py`, `server/api/agents_sdk.py`, `server/api/agents_v2.py`, `server/api/gemini_chat.py`, `server/api/tax_agents.py`, `server/api/deep_search.py`, `server/api/workflows_api.py`, `server/api/collaboration_api.py`, `server/api/websocket_api.py`, `server/api/workflows.py`, `server/api/learning.py`, `server/api/learning/__init__.py`, `server/api/tools.py`, `server/api/analytics.py`
- 2026-01-02T19:06:33Z `nl -ba server/main.py` and `rg -n "analytics" server/main.py`
- 2026-01-02T19:06:33Z `rg -n "APIRouter" server/routers -g "*.py"` and `nl -ba server/routers/iam.py`, `nl -ba server/routers/documents.py`
- 2026-01-02T19:06:33Z `rg -n "invite_token|invite token|invite" server/routers/iam.py`
- 2026-01-02T19:06:33Z `nl -ba apps/gateway/src/index.ts`, `apps/gateway/src/middleware/auth.ts`, `apps/gateway/src/services/AgentService.ts`
- 2026-01-02T19:06:33Z `rg -n "app\\.(get|post|put|patch|delete)|router" apps/gateway/src -g "*.ts"`
- 2026-01-02T19:06:33Z `rg -n "auth" services/rag/index.ts` and `nl -ba services/rag/index.ts`
- 2026-01-02T19:06:33Z `nl -ba supabase/functions/api/index.ts` and `nl -ba services/analytics/app.py`
- 2026-01-02T19:06:33Z `nl -ba server/api_helpers.py` and `nl -ba server/rate_limiter.py`
- 2026-01-02T19:06:33Z `rg -n "ledger" server -g "*.py"`
- 2026-01-02T19:06:33Z `rg -n "ledger_entries|journal_batches|trial_balance|close_period" supabase/migrations -g "*.sql"` and `nl -ba` reads for accounting migrations
- 2026-01-02T19:06:33Z `rg -n "debit|credit|balance" supabase/migrations -g "*.sql"` and `rg -n "invoice" supabase/migrations db/migrations -g "*.sql"`
- 2026-01-02T19:06:33Z `ls packages/tax/src` and `ls packages/tax/src/agents`
- 2026-01-02T19:06:33Z `nl -ba packages/tax/src/agents/tax-vat-028.ts` and `nl -ba server/agents/accounting/bookkeeping_tools.py`
- 2026-01-02T19:06:33Z `sed -n '1,200p' server/agents/tax/base.py`, `sed -n '1,200p' server/agents/tax/specialists.py`, `sed -n '1,200p' server/services/gemini_service.py`
- 2026-01-02T19:06:33Z `sed -n '1,200p' packages/tax/src/utils/index.ts` and `sed -n '1,200p' packages/tax/src/types/index.ts`
- 2026-01-02T19:06:33Z `rg -n "webhook" src -g "*.ts"` and `nl -ba src/routes/webhooks/whatsapp.ts`
- 2026-01-02T20:42:35Z `rg --files -g "*.sql" supabase/migrations db/migrations migrations`
- 2026-01-02T20:42:35Z `date -u +%Y-%m-%dT%H:%M:%SZ`
- 2026-01-02T20:42:35Z `sed -n '1,200p' RELEASE_READINESS_CHECKLIST.md`
- 2026-01-02T20:42:35Z `nl -ba supabase/migrations/001_initial_schema.sql | sed -n '1,240p'`
- 2026-01-02T20:42:35Z `rg -n "create table if not exists .*members|create table .*members" supabase/migrations -g "*.sql"`
- 2026-01-02T20:42:35Z `nl -ba supabase/migrations/20250830125235_4127fb8d-0f84-4062-a3cc-b5d8933cb1ad.sql | sed -n '1,200p'`
- 2026-01-02T20:42:35Z `nl -ba supabase/migrations/20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql | sed -n '1,220p'`
- 2026-01-02T20:42:35Z `rg -n "create table if not exists (clients|vendors|chart_of_accounts|journal_entries|journal_lines|invoices|invoice_lines|payments|receipts|transactions)" supabase/migrations/20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
- 2026-01-02T20:42:35Z `rg -n "create table if not exists (clients|invoices|invoice_lines|payments|receipts)" supabase/migrations -g "*.sql"`
- 2026-01-02T20:42:35Z `rg -n "invoice" supabase/migrations -g "*.sql"`
- 2026-01-02T20:42:35Z `rg -n "payment" supabase/migrations db/migrations migrations -g "*.sql"`
- 2026-01-02T20:42:35Z `rg -n "receipt" supabase/migrations db/migrations migrations -g "*.sql"`
- 2026-01-02T20:42:35Z `nl -ba db/migrations/001_init.sql | sed -n '1,260p'`
- 2026-01-02T20:42:35Z `rg -n "clients\\b|customers\\b" supabase/migrations -g "*.sql"`
- 2026-01-02T20:42:35Z `nl -ba supabase/migrations/20250821115118_c8efec61-c52e-4db8-ac92-82c3ca0a7579.sql | sed -n '1,160p'`
- 2026-01-02T20:42:35Z `rg -n "clients_read|clients_insert|clients_update|clients_delete" supabase/migrations/20250821115118_c8efec61-c52e-4db8-ac92-82c3ca0a7579.sql`
- 2026-01-02T20:42:35Z `nl -ba supabase/migrations/20250821115118_c8efec61-c52e-4db8-ac92-82c3ca0a7579.sql | sed -n '200,240p'`
- 2026-01-02T20:42:35Z `nl -ba supabase/migrations/20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql | sed -n '360,460p'`
- 2026-01-02T20:42:35Z `nl -ba supabase/migrations/20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql | sed -n '460,560p'`
- 2026-01-02T20:42:35Z `rg -n "chart_of_accounts|journal_entries|journal_lines|transactions|vat_rules|vat_returns|clients" supabase/migrations/20250825140114_857b5b5b-3328-448c-b83b-a9aca978a9d6.sql`
- 2026-01-02T20:42:35Z `rg -n "deleted_at|deleted boolean|is_deleted|deleted\\b" supabase/migrations -g "*.sql"`
- 2026-01-02T20:42:35Z `nl -ba supabase/migrations/20250926090000_tasks_documents_notifications.sql | sed -n '90,200p'`
- 2026-01-02T20:42:35Z `rg -n "DROP TABLE|DROP COLUMN|ALTER TABLE .* DROP|DELETE FROM" supabase/migrations -g "*.sql"`
- 2026-01-02T20:42:35Z `nl -ba supabase/migrations/20251111090000_audit_ctrl1_ada1_rec1.sql | sed -n '60,120p'`
- 2026-01-02T20:42:35Z `nl -ba supabase/migrations/20251113093000_audit_acceptance_foundation.sql | sed -n '180,230p'`
- 2026-01-02T20:42:35Z `nl -ba supabase/migrations/20250925221000_idempotency_keys_patch.sql | sed -n '1,120p'`
- 2026-01-02T20:42:35Z `rg -n "tax_entities" supabase/migrations -g "*.sql"`
- 2026-01-02T20:42:35Z `nl -ba supabase/migrations/20250924100500_tax_mt_cit_imputation.sql | sed -n '1,140p'`
- 2026-01-02T20:42:35Z `nl -ba supabase/migrations/20250924210000_tax_treaty_wht.sql | sed -n '1,200p'`
- 2026-01-02T20:42:35Z `nl -ba supabase/migrations/20250924103000_accounting_close_gl.sql | sed -n '90,190p'`
- 2026-01-02T20:42:35Z `rg -n "index" supabase/migrations/20250924103000_accounting_close_gl.sql`
- 2026-01-02T20:42:35Z `rg -n "index.*ledger_entries|ledger_entries.*index" supabase/migrations -g "*.sql"`
- 2026-01-02T20:42:35Z `nl -ba supabase/migrations/20250924103001_accounting_close_gl_rls.sql | sed -n '1,80p'`
- 2026-01-02T20:42:35Z `rg -n "organization_members" supabase/migrations -g "*.sql"`
- 2026-01-02T20:42:35Z `rg -n "create table .*organization_members" supabase/migrations -g "*.sql"`
- 2026-01-02T20:42:35Z `rg -n "create table .*organization_members" migrations/sql -g "*.sql"`
- 2026-01-02T20:42:35Z `nl -ba supabase/migrations/20260201000000_comprehensive_agent_portal.sql | sed -n '1,200p'`
- 2026-01-02T20:42:35Z `rg -n "activity_log|activity_event" supabase/migrations -g "*.sql"`
