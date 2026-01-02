# QA & UAT Plan - Accounting & Tax AI Agent System

Generated: 2026-01-02T17:02:12Z

## Objectives
- Validate correctness of accounting and tax workflows end-to-end.
- Verify authorization/tenant isolation across all services.
- Ensure AI agent outputs are traceable, explainable, and bounded by policy.
- Confirm operational readiness (monitoring, alerts, recovery).

## Test Environments
- Staging Supabase project with production-like RLS and storage.
- Dedicated Redis, Postgres (if used by `server/db.py`), and OpenAI/Gemini sandbox keys.
- Seeded orgs/users representing roles: SYSTEM_ADMIN, PARTNER, MANAGER, EMPLOYEE, CLIENT.

## Entry Criteria
- All services build and start (Python API, gateway, RAG service, Next apps).
- Secrets are stored in a vault and not in source files.
- Basic health checks available for each service.

## Exit Criteria
- All P0/P1 findings resolved.
- Regression suite passes for critical journeys.
- No open security test failures (auth bypass, RLS, secret scans).

## Test Strategy

### 1) Unit Tests
- Validate RBAC helpers and permission maps.
- Validate ledger integrity utilities (if added).
- Validate agent tool policy enforcement.

### 2) Integration Tests
- Supabase CRUD with RLS enabled.
- Document ingestion -> embeddings -> search (RAG service).
- Agent execution: request -> orchestration -> response persistence.
- Rate limiters across services.

### 3) API Contract Tests
- Ensure all endpoints require auth where expected.
- Verify schema validations and error shapes.

### 4) E2E (UI)
- Authentication and role-based navigation.
- Client portal visibility rules (documents, tasks, audit).
- Ledger import and reconciliation flows.

### 5) Security Tests
- Auth bypass attempts for agent/tool/knowledge APIs.
- Cross-org access attempts.
- Injection and tool misuse.
- Secret scanning and dependency auditing.

### 6) Performance & Load
- Burst tests for ingestion, RAG search, agent execution.
- Long-running batch jobs (analytics, re-embedding).

## UAT Scenarios (Core Journeys)
1. Login and org selection (roles differ).
2. Upload documents -> run ADA analytics -> review exceptions.
3. Create and execute accounting/tax agents -> verify org-scoped data.
4. Ledger account import -> journal entry import -> trial balance snapshot.
5. Tax return preparation (VAT) -> review -> approval (HITL).
6. Notification and audit log review for critical actions.

## Known Gaps From Audit (Must Resolve Before UAT)
- Unauthenticated endpoints in `server/api/*`.
- Gateway tenant scoping with service role key.
- RAG router import failure (`server/api/rag.py`).
- Missing modules for RAG service build (`@prisma-glow/lib/secrets`, `packages/system-config`).
- Test suite failing in collection due to missing functions.

## Tooling Recommendations
- Add CI jobs for `pnpm -r test`, `pnpm -r lint`, `pnpm -r build`, and `pytest`.
- Add API regression tests for RBAC and tenant isolation.
- Add LLM safety regression tests for tool policy enforcement.

