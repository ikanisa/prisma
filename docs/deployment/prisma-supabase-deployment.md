# Prisma → Supabase Deployment Runbook

This runbook documents the workflows required to ship the Prisma-backed Next.js service in `apps/web/` together with its Supabase database dependencies. It replaces the prior platform-specific plan with guidance that applies to any container-capable hosting provider (Render, Fly.io, Railway, Cloud Run, etc.).

---

## A) Discovery & Service Boundaries

- **Monorepo layout:** Vite SPA (`src/`), Next.js app (`apps/web`), FastAPI backend (`server/`), RAG workers (`services/`). Only `apps/web` is covered by this runbook.
- **Framework:** Next.js 14 App Router. `/api/healthz` checks Prisma connectivity so external monitors can validate deploys.
- **Runtime assumptions:** Node.js 20 for CI/build, Prisma Client 5.x, Supabase Postgres with `pgvector` enabled. Prisma schema lives at `apps/web/prisma/schema.prisma`; SQL migrations are under `apps/web/prisma/migrations/`.

## B) Repository & Change Controls

1. **Branch protection:**
   - Default branch: `main`.
   - Require status checks `Monorepo CI (root-app)` and `Monorepo CI (next-web)`.
   - Enforce ≥1 approving review, conversation resolution, and linear history.
2. **Templates & docs:** `.github/pull_request_template.md` enforces Prisma migration review. Pair this runbook with `apps/web/prisma/README.md` for schema workflow details.
3. **CI jobs:**
   - `.github/workflows/ci.yml` – lint/test/build for the Vite SPA and Next.js app plus Prisma validation/diff.
   - `.github/workflows/prisma-migrate.yml` – reusable workflow for applying migrations against Supabase environments (preview/production).
4. **Secrets registry (names only):**
   - `DATABASE_URL`, `DIRECT_URL` – Supabase connection strings.
   - `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `SUPABASE_URL` – service credentials.
   - `OPENAI_API_KEY`, `API_RATE_LIMIT`, `API_RATE_WINDOW_SECONDS`, `AUTOMATION_WEBHOOK_SECRET`, `N8N_WEBHOOK_SECRET`, `SAMPLING_C1_BASE_URL`, `SAMPLING_C1_API_KEY` – downstream integrations.
   - GPT-5 tuning defaults (`OPENAI_DEFAULT_REASONING_EFFORT`, `OPENAI_DEFAULT_VERBOSITY`, `OPENAI_AGENT_REASONING_EFFORT`, `OPENAI_AGENT_VERBOSITY`, `OPENAI_SUMMARY_REASONING_EFFORT`, `OPENAI_SUMMARY_VERBOSITY`).

Store values in GitHub Actions environments or your hosting platform secret manager; keep real values out of code/PRs.

## C) Environment Matrix

| Variable | Scope | Notes |
| --- | --- | --- |
| `DATABASE_URL` | GitHub Actions (all jobs), app runtime | Primary Postgres connection used by Prisma Client. |
| `DIRECT_URL` | GitHub Actions (migrations), optional runtime | Point to Supabase transactional pooler when long migrations run. |
| `SUPABASE_URL` | Runtime, local dev | Base URL for Supabase client. |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Runtime | Browser-visible Supabase configuration. |
| `SUPABASE_SERVICE_ROLE_KEY` | GitHub Actions (seeding/tests), runtime API routes | Privileged key used by API routes and seed scripts. |
| `SUPABASE_JWT_SECRET` | GitHub Actions (tests), runtime | Validates Supabase-issued JWTs and signs NextAuth sessions. |
| `AUTH_CLIENT_ID`, `AUTH_CLIENT_SECRET`, `AUTH_ISSUER` | Runtime | Keycloak / OpenID Connect credentials consumed by NextAuth. |
| `NEXT_PUBLIC_API_BASE`, `AGENT_SERVICE_URL` | Runtime | Base URL for API fetches from the browser and server-side agent proxy. |
| `OPENAI_API_KEY` | Runtime, GitHub Actions (optional integration tests) | Required by RAG/agent flows. |
| GPT-5 tuning vars | Runtime, backend workers | Keep values aligned across environments to avoid drift. |
| `AUTOMATION_WEBHOOK_SECRET`, `N8N_WEBHOOK_SECRET` | Runtime | Shared secrets for webhook verification. |
| `SAMPLING_C1_BASE_URL`, `SAMPLING_C1_API_KEY` | Runtime | Downstream sampling client configuration. |
| Front-end toggles (`NEXT_PUBLIC_ACCOUNTING_MODE`, etc.) | Runtime | Feature flags for UI routes. |
| Front-end vars (`VITE_*`) | Local dev / legacy SPA | Maintain until the Vite UI is retired. |

Mirror the same names in Supabase secrets for Edge Functions or background tasks. `.env.example` files list placeholders only; real `.env` files remain ignored.

If Vault is available, configure `VAULT_ADDR`, `VAULT_TOKEN`, `VAULT_KV_MOUNT`, plus Supabase overrides (`SUPABASE_VAULT_PATH`, `SUPABASE_SERVICE_ROLE_VAULT_FIELD`, `SUPABASE_JWT_VAULT_FIELD`). In hosted environments, fall back to the direct secrets above.

## D) Database & Prisma Workflow

1. **Supabase project provisioning:** Create separate Supabase projects (or branches) for preview and production. Enable `pgvector` via the SQL editor.
2. **Schema source of truth:** Prisma schema mirrors Supabase migrations. The baseline migration (`apps/web/prisma/migrations/0001_init/`) captures the current state; author future changes using `pnpm --filter web prisma:migrate:dev`.
3. **Developer loop:**
   ```bash
   cd apps/web
   pnpm prisma:format
   pnpm prisma:migrate:dev -- --name feature_slug
   pnpm prisma:generate
   ```
   Inspect generated SQL and commit with related application changes.
4. **CI safeguards:** `Monorepo CI` runs `prisma validate`, `prisma generate`, and `prisma migrate diff --from-empty --to-schema-datamodel` so reviewers can inspect SQL before apply.
5. **Apply cadence:**
   - **Preview:** merge to `main` triggers `prisma-migrate.yml` with preview secrets, running `prisma migrate deploy`.
   - **Production:** manual `workflow_dispatch` targeting the production environment. Require lead/DBA approval before triggering.
   - **Special migrations:** run `pnpm supabase:migrate:web-cache` to execute the cache-related SQL scripts on every project before enabling related feature flags.
6. **Post-apply checklist:**
   - `pnpm --filter web prisma:generate` to refresh the client.
   - Health-check `/api/healthz`.
   - Seed representative data or run smoke tests.
   - Review Supabase logs/RLS policies.

## E) Hosting Configuration

Use any container-capable platform (e.g., Fly.io, Render, Railway, Cloud Run, ECS/Fargate). Minimum requirements:

1. **Build pipeline:** container image or build artifact produced by CI (`pnpm --filter web build`). Include Prisma client generation before packaging.
2. **Runtime:** Node.js 20, 512MB memory baseline. Propagate `SERVICE_VERSION` (commit SHA) for trace correlation.
3. **Environment variables:** inject the matrix from section C in both preview and production environments. Keep secrets in platform vaults; rotate quarterly.
4. **Networking:** expose HTTP(S) endpoint forwarding to the Next.js server. Configure health checks against `/api/healthz`.
5. **Observability:** forward stdout/stderr to your logging stack; configure tracing endpoint via OpenTelemetry exporter if available.

## F) CI/CD Policy

- **PR gating:** require CI to pass and Prisma SQL review to be acknowledged before merge.
- **Deploy chain:**
  1. PR merged → CI builds container/image → publish artifact.
  2. Continuous delivery job updates preview or staging environment.
  3. Promotion to production happens via manual approval (GitHub environment protection or platform-specific gates).
- **Optional extras:** add gitleaks scanning, dependency review, or Supabase diff comparison as needed.

## G) Verification Procedures

1. **Automated checks:** monitor `/api/healthz` after deploy; alert on non-200 responses or slow DB latency.
2. **Manual checks:**
   - Confirm dashboards load expected sample data.
   - Verify Prisma client operates without hot reload errors.
   - Ensure Supabase Row Level Security policies still enforce tenant isolation.
3. **Artifacts to capture:**
   - Deployment URL and build ID from hosting provider.
  - Supabase project reference.
  - CI run URL that executed migrations.

### G1) Healthz Smoke Workflow

- Trigger `Healthz Smoke` GitHub Action with `app_url` set to the deployed `/api/healthz` endpoint.
- The job validates a `200` response and `{ "status": "ok" }` payload.

### G2) Trigger Prisma Migrate (Production)

- Ensure GitHub environment `production` has `DATABASE_URL` (and optional `DIRECT_URL`).
- Run `Supabase Prisma Deploy` with `environment=production` from the Actions tab.
- Workflow resolves baseline (`npx prisma migrate resolve --applied 0001_init`) then runs `prisma migrate deploy`.

## H) Rollback Strategy

1. **Application:** promote the previous container/image in your hosting platform (e.g., `fly deploy --image <tag>` or Render rollback). Document deployment ID in the incident log.
2. **Code:** `git revert <sha>` on `main`; CI rebuilds and redeploys the reverted artifact.
3. **Database:** prefer forward-only migrations. If a rollback is unavoidable, use Supabase PITR or custom down migrations stored with the up scripts.
4. **Comms:** notify engineering on-call, DBA, and compliance distribution (see `PRODUCTION_READINESS_CHECKLIST.md`) within 15 minutes of incident declaration.

## I) Release Report Template

```text
Repo: https://github.com/<org>/<repo>
Branch protections: <summary/link>
CI pipelines: Monorepo CI (run URL)
Deployment target: <hosting provider/project link>
Preview URL (if applicable): https://preview.example.com
Production URL: https://app.example.com
Supabase project: https://app.supabase.com/project/<ref>
Latest Prisma migration: 2025xxxx_<name> (reviewer, approval date)
Env matrix: DATABASE_URL, DIRECT_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_JWT_SECRET, OPENAI_API_KEY, ...
Post-deploy checklist: healthz 200 ✅, seed run ✅, smoke tests ✅
Rollback readiness: last restore point, on-call rotation link
Open items: <secrets to rotate, DNS cutover, analytics hooks, etc.>
```

Store the report in `AUDIT_REPORT.md` or your compliance knowledge base.

---

### Related References

- [`apps/web/prisma/README.md`](../../apps/web/prisma/README.md) – developer workflow.
- [`PRODUCTION_READINESS_CHECKLIST.md`](../../PRODUCTION_READINESS_CHECKLIST.md) – compliance baseline.
- [`ENDPOINTS_AND_WORKFLOWS.md`](../../ENDPOINTS_AND_WORKFLOWS.md) – API contract overview.
