# Deployment Readiness Report

## Overview
- **Target platform:** Self-hosted container platform (Node 22)
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
| `services/rag` | Node workers + Express | `pnpm --filter @prisma-glow/rag-service build` | Long-running RAG orchestrator; deploy to dedicated container runtime. |

## Environment Status
- Full matrix captured in [`audit/env-matrix.csv`](audit/env-matrix.csv).
- App-specific `.env.example` files generated under `apps/web/`, `apps/gateway/`, and `services/rag/` with documentation.
- Runtime validators:
  - `apps/web/src/env.server.ts` + `env.client.ts` guard both server and browser variables.
  - `apps/gateway/src/env.ts` validates required telemetry + upstream configuration and exposes helpers for dynamic overrides.
  - `services/rag/env.ts` enforces core Supabase/OpenAI prerequisites; imported at startup for fail-fast behaviour.
- RAG staging/production manifests now include `OPENAI_FILE_SEARCH_VECTOR_STORE_ID` (plus optional model/max/filter overrides) so hosted file search targets the correct vector store on deploy. Use `pnpm openai:file-search:secrets` to populate GitHub environment secrets in a single step.

## Deployment Plan
- `apps/web` builds via `pnpm --filter web build` and publishes the `.next/standalone` artefact to the container registry; runtime manifests set install/build commands explicitly.
- Preview/production builds run the same install/lint/test/build pipeline before publishing images.
- Gateway and RAG services remain external to the web frontend; expose endpoints via configured environment variables.

## CI / Automation
- `.github/workflows/compose-deploy.yml` mirrors the production build/lint/test steps and pushes container images.
- Workflows expect the same secrets listed in `docs/deployment/configuration-audit.md`.
- Artifacts upload build logs for triage of failed releases.
- Local helper scripts under `scripts/operations/` reproduce the CI pipeline as needed.

## Risks & Follow-ups
- `services/rag` still relies on numerous optional feature flags; ensure downstream infra injects required OpenAI/Supabase secrets before enabling those features.
- Prisma migrations are not executed automatically in the workflow; run `pnpm --filter web prisma:migrate:deploy` during deployment when schema changes.
- When Deployment Protection is enabled, surface `VERCEL_AUTOMATION_BYPASS_SECRET` to CI and web app environments.
- Gateway tests mutate runtime env values; dynamic parsing is preserved via helper functions but ensure secrets are injected before scaling to production traffic.

## Status Summary
| Component | Status | Notes |
| --- | --- | --- |
| `apps/web` | 🟢 Ready | Validated env schema, CI parity, and deployment plan in place. |
| `apps/gateway` | 🟡 External Deploy | Env validator and docs added; deployment to managed hosting requires routing decisions. |
| `services/rag` | 🟡 External Deploy | Validated core env; keep on container runtime alongside the rest of the stack. |
