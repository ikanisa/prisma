# Risk Register

Generated: 2026-01-02T17:02:12Z

| ID | Risk | Impact | Likelihood | Severity | Evidence | Owner | Mitigation | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R-001 | Unauthenticated agent/tool/persona/knowledge/execution APIs | Data exposure, unauthorized actions | High | P0 | `server/api/agents.py:96`, `server/api/executions.py:70`, `server/api/tools.py:61`, `server/api/personas.py:55`, `server/api/knowledge.py:69`, `server/main.py:6431` | Backend Eng | Require auth and org-role checks, remove service role access from public APIs | Open |
| R-002 | Gateway uses service role key without tenant enforcement | Cross-tenant data access | High | P0 | `apps/gateway/src/index.ts:60`, `apps/gateway/src/services/AgentService.ts:60` | Backend Eng | Use user-scoped Supabase client or enforce org filters | Open |
| R-003 | RAG router import failure | API downtime, deployment failure | High | P0 | `server/api/rag.py:57`, `server/main.py:6461` | Backend Eng | Fix syntax and add tests to block regressions | Open |
| R-004 | Missing runtime modules for RAG build | Build failure | High | P0 | `services/rag/index.ts:61`, `services/rag/package.json:29`, `services/rag/tsconfig.json:23` | Platform Eng | Restore modules or update imports/exports | Open |
| R-005 | Membership model mismatch (members/memberships/organization_members) | Authorization failures or bypass | Medium | P1 | `apps/web/components/features/auth/auth-provider.tsx:37`, `server/api_helpers.py:270`, `apps/gateway/src/middleware/auth.ts:91` | Security + Backend | Consolidate membership tables and role enums | Open |
| R-006 | Ledger integrity lacks constraints | Incorrect financial statements | Medium | P1 | `supabase/migrations/20250924103000_accounting_close_gl.sql:72` | Data Eng | Add DB constraints and balancing checks | Open |
| R-007 | Rate limiting fail-open | Abuse/cost overruns | Medium | P1 | `server/rate_limiter.py:107` | Platform Eng | Fail-closed or circuit breaker with alerts | Open |
| R-008 | Edge function CORS is wide open | Increased abuse surface | Medium | P2 | `supabase/functions/api/index.ts:4` | Security | Restrict CORS origins | Open |
| R-009 | Hard-coded tax rates in agents | Compliance errors | Medium | P2 | `packages/tax/src/agents/tax-vat-028.ts:26` | Tax SME | Replace with versioned data sources and audit trail | Open |
| R-010 | Token-like strings in docs/scripts (UNVERIFIED) | Secret leakage | Low | P0 | `SETUP_COMPLETE.md:121`, `DEPLOYMENT_SUCCESS.md:111` | Security | Verify, rotate if real; keep placeholders only | Open |
