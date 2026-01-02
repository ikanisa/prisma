# Security Review - Accounting & Tax AI Agent System

Generated: 2026-01-02T17:02:12Z

## Scope
- API surfaces: Python FastAPI (`server/*`), Express gateway (`apps/gateway/*`), RAG service (`services/rag/*`), Supabase Edge function (`supabase/functions/*`).
- Auth/RBAC: Supabase JWT and policy config (`server/api_helpers.py`, `config/system.yaml`, `POLICY/permissions.json`).
- Data stores: Supabase Postgres + Storage and Redis.

## Threat Model (Summary)
- Assets: financial records (ledger, tax, audit), documents, AI outputs, user/org data, secrets.
- Primary risks: unauthorized access (tenant isolation), prompt injection/tool abuse, credential leakage, data integrity errors, and unbounded AI costs.

## Findings

### P0 - Unauthenticated and/or unauthorized API surfaces
- The FastAPI agent management and execution endpoints expose CRUD and execution without authentication or org authorization (`server/api/agents.py`, `server/api/executions.py`). The router is included in production app wiring (`server/main.py#L6431-L6437`).
- Additional management APIs for tools, personas, and knowledge are unauthenticated and use in-memory stores (no persistence, no isolation) (`server/api/tools.py`, `server/api/personas.py`, `server/api/knowledge.py`).
- Database access in these paths uses Supabase service role key, bypassing RLS (`server/services/database_service.py#L28-L41`).

Evidence:
- `server/api/agents.py:96` (list), `server/api/agents.py:156` (create) have no `Depends(require_auth)`.
- `server/api/executions.py:70` executes agents without auth.
- `server/api/tools.py:61`, `server/api/personas.py:55`, `server/api/knowledge.py:69` use in-memory stores.
- `server/main.py:6431` and `server/main.py:6440` include these routers.
- `server/services/database_service.py:28` uses `SUPABASE_SERVICE_ROLE_KEY` for all queries.

### P0 - Gateway uses service role key without tenant enforcement
- Gateway initializes Supabase with the service role key (`apps/gateway/src/index.ts:60`), then allows optional `organization_id` filters without binding to the authenticated user or org (`apps/gateway/src/services/AgentService.ts:60`).
- Middleware populates `req.orgId`, but it is not enforced (no `requireOrganization` use) (`apps/gateway/src/middleware/auth.ts:91`).

Evidence:
- `apps/gateway/src/index.ts:60` service role client.
- `apps/gateway/src/services/AgentService.ts:60` optional org filter.
- `apps/gateway/src/middleware/auth.ts:91` org context lookup is optional only.

### P0 - FastAPI app import failure from invalid RAG router
- `server/api/rag.py` contains duplicate `detail` keyword arguments, which is a syntax error and prevents module import. The router is included in `server/main.py`.

Evidence:
- `server/api/rag.py:57` duplicate `detail` keyword.
- `server/main.py:6461` includes `rag_router`.

### P0 - Missing runtime modules referenced by RAG service
- `services/rag/index.ts` imports `@prisma-glow/lib/secrets` and `@prisma-glow/lib/security/signed-url-policy`, but `packages/lib/package.json` does not export these paths and no matching files are present in the repo. `services/rag` also depends on a missing `packages/system-config` path.

Evidence:
- `services/rag/index.ts:61` import of `@prisma-glow/lib/secrets`.
- `services/rag/package.json:29` depends on `@prisma-glow/system-config`.
- `services/rag/tsconfig.json:23` references `../../packages/system-config/tsconfig.json`.
- `packages/lib/package.json:8` exports only `.` and `./knowledge-web-sources`.

### P1 - RBAC data model mismatch across services
- Multiple membership tables are referenced across services: `members`, `memberships`, and `organization_members`. Role vocabularies also diverge (e.g., `config/system.yaml` includes PARTNER/EQR while DB enum `role_level` is EMPLOYEE/MANAGER/SYSTEM_ADMIN).

Evidence:
- `apps/web/components/features/auth/auth-provider.tsx:37` reads `members`.
- `server/api_helpers.py:270` checks `memberships`.
- `apps/gateway/src/middleware/auth.ts:91` reads `organization_members`.
- `supabase/migrations/20250830125756_a814a60a-2361-4a22-86ab-243f73b901ba.sql:17` creates `members`.
- `supabase/migrations/20250821115118_c8efec61-c52e-4db8-ac92-82c3ca0a7579.sql:33` creates `memberships`.
- `supabase/migrations/20251128000000_comprehensive_rls_policies.sql:33` uses `organization_members`.
- `config/system.yaml:52` defines roles beyond the DB enum.

### P1 - Rate limiting fails open and is not distributed everywhere
- Redis-backed limiter fails open on Redis errors (`server/rate_limiter.py:107`).
- RAG service rate limiting uses in-memory buckets (`services/rag/index.ts:2334`), which will not work across instances.

### P1 - Ledger integrity constraints are incomplete
- Ledger entries allow both debit and credit without database checks, and no enforced double-entry balancing. This risks inconsistent financial statements.

Evidence:
- `supabase/migrations/20250924103000_accounting_close_gl.sql:72` defines `ledger_entries` with debit/credit but no check constraints.

### P1 - Automated tests fail during collection
- Pytest cannot import missing functions (`get_db`, `get_agent_registry`, `AgentSecurityService`) and references non-existent paths. This blocks CI and weakens QA.

Evidence:
- `server/db.py` has no `get_db` (file only defines `init_db` and `get_supabase_client`).
- `server/agents/registry.py` does not define `get_agent_registry`.
- `tests/accounting/test_workspace.py` expects `apps/web/app/accounting/page.tsx` which is absent.

### P2 - Broad CORS in Edge Function
- Edge function allows `Access-Control-Allow-Origin: *`, which increases exposure for endpoints handling OpenAI requests. Auth is required but CORS should be narrowed in production.

Evidence:
- `supabase/functions/api/index.ts:4`.

### P2 - Potential leakage of sensitive data in logs
- Error logs include upstream response bodies, which may contain PII or sensitive metadata.

Evidence:
- `server/routers/iam.py:124` logs `body=...` on failures.

### P2 - Prompt/data quality risks in tax agents
- Tax agent rates are hard-coded with a fixed effective date and limited jurisdictions, increasing the risk of outdated advice.

Evidence:
- `packages/tax/src/agents/tax-vat-028.ts:26`.

### P2 - Web source policy allows all domains
- URL source policies in `config/system.yaml` allow `*` domains, increasing prompt injection and data exfiltration risk if enforced as-is.

Evidence:
- `config/system.yaml:91` and `config/system.yaml:136`.

### P0 (UNVERIFIED) - Secret-like tokens in docs/scripts
- Automated scan found token-like strings and key assignments in documentation and scripts. These appear to be examples, but must be verified to ensure no real secrets are committed.

Evidence (redacted):
- `SETUP_COMPLETE.md:121`, `SETUP_COMPLETE.md:126` (JWT-like strings).
- `DEPLOYMENT_SUCCESS.md:111` (apikey header example).
- `ENV_GUIDE.md:323`, `ENV_GUIDE.md:338` (key placeholders).

## Recommendations (Security)
1. Enforce authentication and tenant authorization on all API routes; require org context and role checks before DB access.
2. Remove service role key usage from user-facing services or wrap all access in strict org scoping and authorization middleware.
3. Fix `server/api/rag.py` syntax error and ensure all routers import cleanly.
4. Restore missing modules (`@prisma-glow/lib/secrets`, `@prisma-glow/lib/security/signed-url-policy`, `packages/system-config`) or update imports/exports accordingly.
5. Normalize membership tables and role enums across services; migrate to one source of truth.
6. Add ledger integrity constraints (debit/credit checks, batch balance validation, immutable audit markers).
7. Make rate limiting fail-closed for critical endpoints and use Redis-backed distributed limiters across services.
8. Restrict CORS origins in edge functions to known domains.
9. Review docs for any real secrets and rotate if found; enforce secret scanning in CI.

## Implemented Fixes
- None in this audit.
