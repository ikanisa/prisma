# Remediation Plan

Generated: 2026-01-02T17:02:12Z

## Phase 0 - Immediate (P0, block release)
1. **Secure all public APIs** (Owner: Backend Eng, Effort: L)
   - Add `require_auth` + org access checks to `server/api/agents.py`, `server/api/executions.py`, `server/api/tools.py`, `server/api/personas.py`, `server/api/knowledge.py`.
   - Remove in-memory stores or guard them behind feature flags.
2. **Gateway tenant enforcement** (Owner: Backend Eng, Effort: M)
   - Bind `organization_id` to verified membership; reject requests without org context.
   - Replace service role key with user-scoped JWT or use `service_role` only for admin routes.
3. **Fix FastAPI RAG router import** (Owner: Backend Eng, Effort: S)
   - Remove duplicate keyword args in `server/api/rag.py` and add tests to block regressions.
4. **Restore missing modules** (Owner: Platform Eng, Effort: M)
   - Add `@prisma-glow/lib/secrets` and `@prisma-glow/lib/security/signed-url-policy` exports or update imports.
   - Add or remove `packages/system-config` dependency in `services/rag`.

## Phase 1 - High Priority (P1)
5. **Normalize RBAC data model** (Owner: Security + Backend, Effort: L)
   - Choose a single membership table and role enum.
   - Update RLS functions and all services to use the unified model.
6. **Ledger integrity constraints** (Owner: Data Eng + Accounting SME, Effort: M)
   - Add constraints to enforce non-negative debit/credit and balanced batches.
   - Add immutability guards and audit trails for posted entries.
7. **Rate limiting hardening** (Owner: Platform Eng, Effort: M)
   - Fail-closed on Redis errors for sensitive endpoints.
   - Ensure all services use Redis-backed rate limiting.
8. **Test suite recovery** (Owner: QA + Backend, Effort: M)
   - Implement missing `get_db` and agent registry exports.
   - Restore missing route files referenced in tests or update tests.

## Phase 2 - Medium Priority (P2)
9. **Tax data sources** (Owner: Tax SME, Effort: M)
   - Replace hard-coded rates with versioned tax data sources + update cadence.
10. **CORS tightening** (Owner: Security, Effort: S)
   - Restrict edge-function CORS to approved domains.
11. **Log scrubbing** (Owner: Platform Eng, Effort: S)
   - Remove response bodies from error logs or redact PII fields.
12. **UI data wiring** (Owner: Frontend Eng, Effort: M)
   - Replace mock UI data with real API integrations and add E2E tests.

## Owners (Suggested)
- Backend Eng: Python API + Gateway
- Platform Eng: CI/CD, secrets, rate limiting, telemetry
- Security: auth, RBAC, secret hygiene
- Data Eng + Accounting SME: ledger integrity
- QA: automated test plan and UAT

