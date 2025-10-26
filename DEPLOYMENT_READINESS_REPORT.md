# Deployment Readiness Report

## Overview
- **Target platform:** Container hosting (Node 18/20 compatible)
- **Primary app:** `apps/web` (Next.js 14 App Router)
- **Supporting services:** `apps/gateway` (Express proxy), `services/rag` (RAG/worker service)
- **Package manager:** pnpm 9.12.3 (pinned via `packageManager` field)
- **Node version:** 22.12.0 (enforced via `.nvmrc` and `package.json` engines)

## Inventory Summary
See [`audit/inventory.json`](audit/inventory.json) for the full machine-readable snapshot.

| Workspace | Framework | Build Command | Notes |
| --- | --- | --- | --- |
| `apps/web` | Next.js 14 App Router | `pnpm --filter web build` | Requires Supabase + Keycloak credentials; uses Prisma + NextAuth. |
| `apps/gateway` | Express (TypeScript) | `pnpm --filter @prisma-glow/gateway build` | Proxies API calls to FastAPI and RAG services; tracing via OTEL. |
| `services/rag` | Node workers + Express | `pnpm --filter @prisma-glow/rag-service build` | Long-running RAG orchestrator; deploy alongside other services, not the Next.js host. |

## Environment Status
- Full matrix captured in [`audit/env-matrix.csv`](audit/env-matrix.csv).
- App-specific `.env.example` files generated under `apps/web/`, `apps/gateway/`, and `services/rag/` with documentation.
- Runtime validators:
  - `apps/web/src/env.server.ts` + `env.client.ts` guard both server and browser variables.
  - `apps/gateway/src/env.ts` validates required telemetry + upstream configuration and exposes helpers for dynamic overrides.
  - `services/rag/env.ts` enforces core Supabase/OpenAI prerequisites; imported at startup for fail-fast behaviour.
- RAG staging/production manifests now include `OPENAI_FILE_SEARCH_VECTOR_STORE_ID` (plus optional model/max/filter overrides) so hosted file search targets the correct vector store on deploy. Use `pnpm openai:file-search:secrets` to populate GitHub environment secrets in a single step.

## Deployment Plan
Detailed notes in [`docs/deployment/prisma-supabase-deployment.md`](docs/deployment/prisma-supabase-deployment.md). Key points:
- Build artefacts are produced in CI; promote container images through preview → production.
- Gateway and RAG services run as long-lived workloads; expose endpoints through environment variables consumed by the web app.
- Prisma migrations execute via the `prisma-migrate` workflow, with manual approval required for production promotion.

## CI / Automation
- `.github/workflows/ci.yml` covers lint/test/build for the monorepo.
- `.github/workflows/prisma-migrate.yml` applies database migrations against Supabase environments.
- Health checks and smoke tests run through dedicated workflows (`Healthz Smoke`).

## Risks & Follow-ups
- `services/rag` still relies on optional feature flags; ensure downstream infra injects required OpenAI/Supabase secrets before enabling those features.
- Prisma migrations are not executed automatically during application deploys; trigger `pnpm --filter web prisma:migrate:deploy` (or the workflow) when schema changes ship.
- Gateway tests mutate runtime env values; dynamic parsing is preserved via helper functions but secrets must be injected before scaling to production traffic.

## Status Summary
| Component | Status | Notes |
| --- | --- | --- |
| `apps/web` | 🟢 Ready | Validated env schema, CI parity, container deployment runbook in place. |
| `apps/gateway` | 🟡 External Deploy | Env validator and docs added; requires routing decisions for production ingress. |
| `services/rag` | 🟡 External Deploy | Validated core env; run on background worker infrastructure with sufficient GPU/CPU budget. |
