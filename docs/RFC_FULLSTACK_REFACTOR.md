# RFC: Full-Stack Refactor Alignment

## Status
- **Owner:** Engineering (Full-stack core team)
- **Reviewers:** Gateway, Infra, AI/RAG, Frontend guilds
- **State:** Draft for stakeholder feedback

## Progress (2025-10-10)
- ✅ Extracted a reusable Node config loader at `packages/system-config/` and pointed the RAG service
  at it; gateway migration remains queued.
- ✅ Introduced pnpm workspace scaffolding for gateway/RAG packages plus a dedicated CI workflow
  (`workspace-ci.yml`) that builds/lints each Node service; pytest step remains skipped pending
  wheelhouse availability.
- ⚠️ Full `pytest` coverage is still blocked in this sandbox until the FastAPI/redis wheels are
  installed offline (see README backend setup notes).

## Motivation
The codebase has grown around parallel delivery tracks (legacy Vite app, Next.js portal, FastAPI
services, RAG/agent experiments, Supabase functions). Configuration, tooling, and deployment
contracts diverged across these surfaces, creating friction for onboarding, testing, and production
hardening. We recently standardised configuration loading, but broader refactors are required to:

- Eliminate duplicate frontends and design drift.
- Untangle inter-service boundaries (Express gateway ↔ FastAPI ↔ RAG).
- Restore deterministic builds/tests for both Node and Python stacks.
- Codify configuration/secrets handling across services and edge functions.
- Enable consistent observability, rate-limiting, and rollout guardrails.

## Goals
1. Provide a clear dependency topology (workspace tooling for Node packages, requirements for
   Python services).
2. Modularise backend services so routing, domain logic, and storage facades live in testable units.
3. Establish typed contracts between gateway, FastAPI, and RAG services.
4. Consolidate frontends around a single stack and shared component library.
5. Automate migration/testing of Supabase functions and Postgres schema.
6. Deliver comprehensive documentation/runbooks that remain accurate through CI validation.

## Non-Goals
- Rewrite of existing business logic (e.g. audit/tax workflows) unless required for separation.
- Replacing Supabase or OpenAI dependencies.
- Re-architecting infrastructure provisioning beyond necessary CI/CD changes.

## Current State Summary
- Root `package.json` mixes dependencies for gateway, RAG service, and shared UI; `apps/web`
  (Next.js) carries its own `package.json`, while the legacy Vite app lives at `src/`.
- Python stack lacks pinned/declared dependencies in automation (recently addressed with
  `server/requirements.txt` but not yet in CI); `pytest` needs manual `PYTHONPATH` tweaks.
- `server/main.py` (>7k LOC) and `services/rag/index.ts` (>4k LOC) blend routing, orchestration, and
  persistence, limiting unit coverage.
- Config files (`system.yaml`, env vars) are consumed via ad-hoc loaders; Supabase edge functions
  replicate logic in multiple directories.
- Observability, logging, and rate limiting are implemented differently per service, complicating
  production readiness.

## Proposed Plan

### Phase 0 – Tooling & Dependencies (Weeks 0–2)
1. Introduce pnpm/NPM workspace layout (`pnpm-workspace.yaml`) covering `apps/web`, `gateway`,
   `services/rag`, `packages/ui`, and future shared modules.
2. Align Python dependencies via `server/requirements.txt` (pinned versions), `pytest.ini`, and CI
   job installing them.
3. Add pre-commit hooks (ESLint, Prettier, ruff/black) and base GitHub checks (lint, unit tests).

### Phase 1 – Configuration & Secrets (Weeks 2–3)
1. Upgrade gateway and Supabase functions to consume configuration via shared loader package.
2. Validate `system.yaml` against schema (zod/pydantic) and surface `npm run config:validate` +
   `pytest` checks in CI.
3. Consolidate `.env.example` per package, document secrets import pipeline, and create a `scripts/`
   helper to bootstrap local environments.

### Phase 2 – Backend Decomposition (Weeks 3–6)
1. Break FastAPI into routers (`routes/documents.py`, `routes/autonomy.py`...), service modules, and
   repositories; adopt Pydantic v2 models for I/O.
2. Extract permission/autonomy helpers; write unit tests for release-controls, rate-limiting, and
   membership gates.
3. Generate OpenAPI schema, publish typed client for gateway/Next.js.

### Phase 3 – Gateway & Contracts (Weeks 6–8)
1. Port Express gateway to TypeScript with strict typings; consume generated FastAPI client.
2. Normalise middleware (idempotency, trace context, rate limits) and reuse across services.
3. Document service topology (diagram + README); remove redundant proxies.

### Phase 4 – RAG/Agents Modularisation (Weeks 8–12)
1. Split `services/rag/index.ts` into feature modules (ingestion, streaming, MCP, chatkit).
2. Migrate to TypeScript, add Vitest coverage for ingestion, approvals, streaming flows.
3. Align logging/metrics with FastAPI/gateway (OTel + structlog).

### Phase 5 – Frontend Consolidation (Weeks 12–16)
1. Decide on canonical frontend (target: Next.js App Router).
2. Extract design system into `packages/ui`; migrate Vite pages or retire the Vite app.
3. Replace bespoke fetches with React Query + generated API client; ensure SSR-safe data flows.

### Phase 6 – Supabase & Data Layer (Weeks 16–20)
1. Organise Supabase functions into workspace packages; factor shared utilities.
2. Add automated Deno/Vitest tests for functions; run pgTAP migrations in CI.
3. Document data contracts and update `IMPLEMENTATION_PLAN.md` with new automation steps.

### Phase 7 – Observability & Hardening (Parallel, begins Week 4)
1. Standardise logging/tracing pipeline across services (OTel exporters, severity levels).
2. Add synthetic checks for critical endpoints (autonomy status, document upload, release controls).
3. Update runbooks (`GO-LIVE`, `OPERATIONS`) with new automation and failure playbooks.

## Risks & Mitigations
- **Scope creep:** Phased delivery with RFC updates; each phase requires test coverage before merge.
- **Service downtime:** Feature flags and dark deploys for gateway/RAG changes; ensure backward
  compatibility while new clients roll out.
- **Team alignment:** Weekly syncs across guilds; RFC updates capture deviations.
- **Package churn:** Workspace introduction may affect the legacy Vite flows; provide migration doc and
  maintain compatibility until completion.

## Rollout & Verification
- Each phase produces a status PR with:
  - Tests/lint added to CI.
  - Documentation updates.
  - Migration steps (if any) captured in `DECISIONS.md`.
- Final milestone includes:
  - Clean `pnpm install` & `pip install -r server/requirements.txt`.
  - `npm test`, `pytest`, pgTAP checks all green.
  - Updated runbooks and training for ops/support.

## Open Questions
- Should we remove the legacy Vite frontend entirely or keep it behind feature flags until clients
  migrate?
- Do we adopt Poetry/UV for Python package management or keep `requirements.txt`?
- How do we stage Supabase edge function refactors without interrupting production jobs (blue/green,
  feature flags)?

Please leave feedback on scope, sequencing, and ownership so we can finalise the schedule.
