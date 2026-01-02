# Accounting & Tax AI Agent System - Architecture

Generated: 2026-01-02T17:02:12Z

## Repository Inventory (High-Level)
Top-level directories (key focus areas):
- `apps/` (Next.js web/admin/client apps, gateway API)
- `server/` (Python FastAPI backend)
- `services/` (RAG, agents, tax, ledger, analytics, cache, OTEL)
- `supabase/` (migrations, edge functions, config)
- `db/` (SQL migrations)
- `packages/` (shared TS packages: agents, tax, lib, ui, security)
- `src/` (Vite/React app)
- `src-tauri/` (Tauri desktop)
- `tests/`, `server/tests/`, `services/*/tests/`, `packages/*/tests/`
- `scripts/` (ops and ingestion scripts)
- `infra/`, `ops/` (infra configs, runbooks)
- `.github/workflows/` (CI/CD)

## Context Diagram (Textual)
```
Actors
- Internal staff: accountants, tax managers, audit partners
- Clients: portal users

System Boundary: Prisma Glow Platform
- Web/Admin/Client UIs (Next.js)
- Gateway API (Express)
- Python API (FastAPI)
- RAG + agent orchestration (Express)
- Supabase Edge functions

External Systems
- Supabase Auth/DB/Storage
- OpenAI API
- Google Gemini / Generative AI
- Google Drive API
- Google Maps API
- SMTP Email provider
- Sentry + OpenTelemetry collector
- Redis
- Postgres (local or external)
```

## Component Diagram (Textual)
```
[Next.js Apps]
  - apps/web
  - apps/admin
  - apps/client
     | (Supabase auth client)
     v
[Supabase Auth + DB + Storage]

[Gateway API - apps/gateway]
  - Express REST for agents/tools/knowledge
  - Supabase client (service role)

[Python API - server/main.py]
  - FastAPI routers
  - Supabase REST via service role
  - Redis rate limiting + RQ jobs

[RAG Service - services/rag/index.ts]
  - Express service
  - Postgres/pgvector
  - Supabase (service role)
  - OpenAI/Gemini/Drive/OCR

[Supabase Edge Function - supabase/functions/api]
  - Deno runtime
  - OpenAI calls + Supabase RPC
```

## Data Flow Diagram (Textual) - Accounting/Tax
```
1) Source data ingestion
   - Documents uploaded (storage + metadata)
   - Ledger accounts/entries imported (UNVERIFIED routes)

2) Normalization + storage
   - Supabase tables: ledger, documents, tasks
   - RAG service stores embeddings in pgvector

3) Analytics & validation
   - ADA runs and exceptions logged (server/api/documents.py)
   - Control checks, reconciliation workflows (server/main.py)

4) Tax computation
   - Agent tax logic (packages/tax, server/agents)
   - RAG context retrieval + LLM reasoning

5) Reporting
   - Trial balance snapshots, close status
   - Audit/tax summaries exported to UI

UNVERIFIED: end-to-end wiring between UI routes and ledger/tax compute flows is not fully observable in repo tests.
```

## Auth/RBAC Model (As Implemented)
- **Web UI** reads user role from `members` table (`apps/web/components/features/auth/auth-provider.tsx:37`).
- **FastAPI** verifies JWT using `SUPABASE_JWT_SECRET` and checks org membership in `memberships` (`server/api_helpers.py:270`). Uses Supabase service role for data access.
- **Gateway** validates JWT and optionally resolves `organization_members` (`apps/gateway/src/middleware/auth.ts:91`), but org context is not enforced in queries.
- **RLS** policies exist in Supabase migrations; helper functions `is_member_of` and `has_min_role` are used by RLS (`supabase/migrations/20250924103001_accounting_close_gl_rls.sql`).
- **Policy config**: `POLICY/permissions.json` and `config/system.yaml` define required roles; use is inconsistent across services.

## Frameworks, Languages, Package Managers
- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind (`apps/*`).
- **Gateway**: Node.js + Express + TypeScript (`apps/gateway`).
- **RAG Service**: Node.js + Express + TypeScript (`services/rag`).
- **Backend API**: FastAPI (Python 3), SQLAlchemy (`server`).
- **Serverless**: Deno (Supabase Edge Functions) (`supabase/functions`).
- **Desktop**: Tauri (Rust + TS/React) (`src-tauri`).
- **Package managers**: pnpm (workspace), pip (Python requirements), cargo (Rust).

## Entry Points & Start Commands
- **Root workspace**: `pnpm dev`, `pnpm build`, `pnpm test` (`package.json`).
- **Web**: `pnpm --filter @prisma-glow/web dev` -> Next.js dev server (`apps/web/package.json`).
- **Admin**: `pnpm --filter @prisma-glow/admin dev` (`apps/admin/package.json`).
- **Client**: `pnpm --filter @prisma-glow/client dev` (`apps/client/package.json`).
- **Gateway**: `pnpm --filter @prisma-glow/gateway dev` (tsx watch) (`apps/gateway/package.json`).
- **RAG Service**: build via `pnpm --filter @prisma-glow/rag-service build`; runtime start command is not defined (UNVERIFIED).
- **FastAPI**: `uvicorn server.main:app --reload --port 8000` (`docs/local-hosting.md:65`).
- **Supabase Edge Function**: deploy via `supabase functions deploy` (UNVERIFIED; see `supabase/functions/api/index.ts`).
- **Tauri**: `pnpm tauri dev` or `pnpm dev:tauri` (`package.json`).

## Integration Inventory
- **Supabase**: Auth, Postgres, Storage, Edge Functions.
- **LLMs**: OpenAI (`services/rag`, `supabase/functions/api`), Gemini (`server/services/gemini_service.py`, `packages/agents/src/gemini/runner.ts`).
- **OCR**: Tesseract (`services/rag/index.ts`) and Google Document AI (`server/rag.py`).
- **Google Drive**: ingestion and sync (`services/rag/knowledge/ingestion.ts`).
- **Google Maps**: agent tools (`server/integrations/google_maps.py`).
- **Email**: SMTP via `server/mailer.py`.
- **Analytics/Telemetry**: Sentry + OpenTelemetry (`server/main.py`, `services/rag/index.ts`).
- **Cache/Queue**: Redis (`server/main.py`, `services/rag/index.ts`).
- **Payments/Banking**: none observed in code (UNVERIFIED).

## Environment Variables (Key, Non-Exhaustive)
Full list: `ENV_GUIDE.md`. Below are key variables and component usage.

- **SUPABASE_URL**: FastAPI (`server/main.py`), auth helpers (`server/api_helpers.py`), gateway (`apps/gateway/src/index.ts`), RAG (`services/rag/index.ts`), edge function (`supabase/functions/api/index.ts`).
- **SUPABASE_SERVICE_ROLE_KEY**: FastAPI (`server/api_helpers.py`, `server/services/database_service.py`), RAG (`services/rag/index.ts`), scripts (`ENV_GUIDE.md`).
- **SUPABASE_SERVICE_KEY**: gateway env (`apps/gateway/src/config/env.ts`).
- **SUPABASE_ANON_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY**: web/admin/client (`apps/web/lib/env.ts`), gateway auth lookup (`apps/gateway/src/middleware/auth.ts`), edge function (`supabase/functions/api/index.ts`).
- **SUPABASE_JWT_SECRET**: FastAPI (`server/api_helpers.py`), gateway (`apps/gateway/src/middleware/auth.ts`), RAG (`services/rag/index.ts`).
- **SUPABASE_JWT_AUDIENCE**: FastAPI, gateway, RAG.
- **REDIS_URL**: FastAPI rate limiting + jobs (`server/main.py`).
- **DATABASE_URL**: RAG Postgres client (`services/rag/index.ts`), SQLAlchemy (`server/db.py`).
- **OPENAI_API_KEY**: RAG service, Edge function, server OpenAI client (`server/services/openai_service.py`).
- **GEMINI_API_KEY / GOOGLE_API_KEY**: Gemini runners (`server/services/gemini_service.py`, `packages/agents/src/gemini/runner.ts`), image generation (`server/integrations/image_generation.py`).
- **TURNSTILE_SECRET_KEY**: FastAPI security endpoint (`server/api/security.py`).
- **SMTP_HOST/PORT/USERNAME/PASSWORD/FROM**: email invites (`server/mailer.py`).
- **SENTRY_DSN / SENTRY_ENVIRONMENT / SENTRY_RELEASE**: FastAPI + RAG (`server/main.py`, `services/rag/index.ts`).
- **OTEL_EXPORTER_OTLP_ENDPOINT / OTEL_SERVICE_NAME**: FastAPI + RAG (`server/main.py`, `services/rag/index.ts`).
- **API_ALLOWED_ORIGINS / ALLOWED_HOSTS**: FastAPI CORS/TrustedHost (`server/main.py`).
- **GATEWAY_ALLOWED_ORIGINS**: gateway CORS (`apps/gateway/src/index.ts`).
- **RAG_SERVICE_URL**: gateway health checks (`apps/gateway/src/index.ts`).
- **DOCUMENT_MAX_UPLOAD_BYTES / SUPABASE_DOCUMENTS_BUCKET**: FastAPI storage (`server/main.py`).
- **OPENAI_WEB_SEARCH_ENABLED / OPENAI_WEB_SEARCH_MODEL / WEB_FETCH_CACHE_RETENTION_DAYS**: FastAPI + RAG (`server/main.py`, `services/rag/env.ts`).

## Deployment Topology (Observed)
- **Web/Admin/Client**: Next.js apps (likely hosted on a web platform; default URLs reference Cloudflare Pages in configs, UNVERIFIED).
- **Gateway**: Node/Express service.
- **FastAPI**: Python service.
- **RAG**: Node/Express service with Postgres + Redis.
- **Supabase**: hosted Postgres/Auth/Storage + Edge Functions.
- **Docker Compose**: local dev/prod support via `docker-compose*.yml`.

