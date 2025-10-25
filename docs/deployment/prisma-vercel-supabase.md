# Prisma → Supabase → Vercel Deployment Runbook

This document operationalises the end-to-end workflow for the Prisma-backed Next.js service under `apps/web/`. Follow these steps to provision, deploy, and operate the stack safely.

---

## A) Discovery & Service Boundaries

- **Monorepo layout:** Vite SPA (root), Next.js app (`apps/web`), FastAPI backend (`server/`), RAG services (`services/`). Only `apps/web` deploys to Vercel in this workflow.
- **Framework:** Next.js 14 app router with API routes. Health endpoint implemented at `/api/healthz` verifying Prisma connectivity.
- **Runtime assumptions:** Node.js 20 on CI/Vercel, Prisma Client 5.x, Supabase Postgres (pgvector enabled). Prisma schema resides in `apps/web/prisma/schema.prisma` with SQL migrations under `apps/web/prisma/migrations/`.

## B) GitHub Repository & Protections

1. **Default branch:** `main`. Enable branch protection with:
   - Required status checks: `Monorepo CI (root-app)`, `Monorepo CI (next-web)`, Vercel preview deployment.
   - Require pull request reviews (≥1) and conversation resolution.
   - Enforce linear history (no force pushes).
2. **Templates & docs:** Pull-request template at `.github/pull_request_template.md` mandates Prisma migration review. Runbook (this file) plus `apps/web/prisma/README.md` guide developers.
3. **GitHub Actions:**
   - `.github/workflows/ci.yml` → lint/test/build for root + Next.js and Prisma validation/diff.
   - `.github/workflows/prisma-migrate.yml` → automated preview deploy on `main` and manual promotion to production.
4. **Secrets registry (names only):** store under repository or environment secrets.
   - `DATABASE_URL` – Supabase connection string (staging/production via environments).
   - `DIRECT_URL` – Optional transactional/pooled connection for migrations.
   - `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `SUPABASE_URL`, `OPENAI_API_KEY`, `API_RATE_LIMIT`, `API_RATE_WINDOW_SECONDS`, etc. (as required by app tests or seed scripts).
   - GPT-5 tuning defaults (`OPENAI_DEFAULT_REASONING_EFFORT`, `OPENAI_DEFAULT_VERBOSITY`, `OPENAI_AGENT_REASONING_EFFORT`, `OPENAI_AGENT_VERBOSITY`, `OPENAI_SUMMARY_REASONING_EFFORT`, `OPENAI_SUMMARY_VERBOSITY`) – mirror values across Vercel Preview/Production env groups and backend secret stores so Responses API calls stay aligned.

## C) Environment Matrix

| Variable | Scope | Notes |
| --- | --- | --- |
| `DATABASE_URL` | GitHub Actions (all jobs), Vercel Preview, Vercel Production | Primary Postgres connection used by Prisma Client. |
| `DIRECT_URL` | GitHub Actions (migrations), optional Vercel Production | Point to Supabase transactional pooler to avoid timeouts during migrations. |
| `SUPABASE_URL` | Vercel Preview/Production, local dev | Base URL for Supabase client. |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel Preview/Production | Client-side Supabase configuration surfaced to the browser. |
| `SUPABASE_SERVICE_ROLE_KEY` | GitHub Actions (seeding/tests), Vercel Preview/Production | Privileged key used by API routes and optional seeds. |
| `SUPABASE_JWT_SECRET` | GitHub Actions (tests), Vercel Preview/Production | Required for verifying Supabase-issued JWTs and signing NextAuth sessions. |
| `AUTH_CLIENT_ID`, `AUTH_CLIENT_SECRET`, `AUTH_ISSUER` | Vercel Preview/Production | Keycloak/OpenID Connect credentials consumed by NextAuth (`apps/web/auth.ts`). |
| `NEXT_PUBLIC_API_BASE`, `AGENT_SERVICE_URL` | Vercel Preview/Production | Base URL for API fetches from the browser and server-side agent proxy. |
| `OPENAI_API_KEY` | Vercel Preview/Production, GitHub Actions (optional integration tests) | Used by RAG/agent flows. |
| GPT-5 tuning (`OPENAI_DEFAULT_REASONING_EFFORT`, `OPENAI_DEFAULT_VERBOSITY`, `OPENAI_AGENT_REASONING_EFFORT`, `OPENAI_AGENT_VERBOSITY`, `OPENAI_SUMMARY_REASONING_EFFORT`, `OPENAI_SUMMARY_VERBOSITY`) | Vercel Preview/Production, backend containers | Keeps agent/summarisation workloads aligned with GPT-5 defaults; mirror values across Vercel env groups and Compose deployments. |
| `API_RATE_LIMIT`, `API_RATE_WINDOW_SECONDS` | Vercel Preview/Production | Align with FastAPI/env defaults for rate limiting. |
| `TURNSTILE_SECRET_KEY`, `VITE_TURNSTILE_SITE_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Vercel Preview/Production, local dev | Enable CAPTCHA verification on sign-in/sign-up flows. Site keys surface to the client; the secret key stays server-side. |
| `AUTOMATION_WEBHOOK_SECRET`, `N8N_WEBHOOK_SECRET` | Vercel Preview/Production | Shared secrets for webhook verification inside API routes. |
| `SAMPLING_C1_BASE_URL`, `SAMPLING_C1_API_KEY` | Vercel Preview/Production | Required by audit sampling client for downstream service calls. |
| Front-end toggles (`NEXT_PUBLIC_ACCOUNTING_MODE`, etc.) | Vercel Preview/Production | Control demo/feature flags for UI routes; safe defaults exist. |
| Front-end vars (`VITE_*`) | Local dev, legacy Vite app | Legacy SPA configuration; keep parity until old UI retires. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL`, `SMTP_FROM_NAME`, `SMTP_USE_SSL`, `SMTP_USE_STARTTLS` | Vercel Preview/Production, Supabase secrets | SMTP credentials for outbound invite emails. Configure at least host, port, and from address. |
| `INVITE_ACCEPT_BASE_URL` | Vercel Preview/Production | Base URL used when generating membership invitation links (defaults to `/auth/accept-invite`). |

Map the same variable names into Supabase Secrets for server-side functions/tasks when required.

`.env.example` lists only variable names and sample placeholders. `.env`, `.env.*` stay ignored.

If Vault is available, configure `VAULT_ADDR`, `VAULT_TOKEN`, `VAULT_KV_MOUNT`, and the Supabase overrides (`SUPABASE_VAULT_PATH`, `SUPABASE_SERVICE_ROLE_VAULT_FIELD`, `SUPABASE_JWT_VAULT_FIELD`). On Vercel, those fall back to direct environment variables.

## D) Database & Prisma Workflow

1. **Supabase project:** Provision separate projects/branches for preview and production. Enable `pgvector` extension.
2. **Schema source:** Prisma schema mirrors Supabase SQL migrations. The baseline migration (`apps/web/prisma/migrations/0001_init/`) seeds Prisma with the current structure; future changes should be authored with `prisma migrate dev`.
3. **Developer flow:**
   ```bash
   cd apps/web
   npm run prisma:format
   npm run prisma:migrate:dev -- --name feature_slug
   npm run prisma:generate
   ```
   Inspect generated SQL, commit alongside schema changes.
4. **CI safeguards:** `Monorepo CI` runs `prisma validate`, `prisma generate`, and `prisma migrate diff --from-empty --to-schema-datamodel` to render SQL for reviewers without applying.
5. **Apply cadence:**
   - **Preview:** merge to `main` triggers `Supabase Prisma Deploy` (preview job) executing `prisma migrate deploy` with staging secrets.
   - **Production:** manual `workflow_dispatch` → choose `production` to run the same command with production secrets. Require DBA/lead approval before triggering.
- **Web search cache:** run both `supabase/migrations/20251115122000_web_fetch_cache.sql` and `supabase/migrations/20251115123000_web_fetch_cache_retention.sql` against every Supabase project before enabling the production feature flag. When coordinating the extension rollout, include `20251202120000_extensions_schema_reset.sql` and `20251202121000_role_search_path_extensions.sql` via the `--extra` flag:
  ```bash
  SUPABASE_PROJECTS="preview=<ref>,production=<ref>" pnpm supabase:migrate:web-cache --extra=20251202120000_extensions_schema_reset.sql,20251202121000_role_search_path_extensions.sql
  ```
  Drop the `--extra` flag once the extensions live in every environment. The helper script wraps the Supabase CLI and will sequentially apply the SQL files for each project listed in `SUPABASE_PROJECTS="<env>=<ref>,..."`. Fall back to the Supabase SQL editor when the CLI is unavailable.
6. **Post-apply checklist:**
   - `npx prisma db pull` (optional) to confirm schema matches.
   - `npm run prisma:generate` to refresh client.
   - Run seeds / smoke tests (health endpoint, representative query).
   - Verify Supabase logs and RLS policies.

## E) Vercel Configuration

1. **Project import:** Vercel team scope → import GitHub repo, set root directory to `apps/web`.
2. **Framework preset:** Next.js 14, build command `npm run build`, install command `npm install`, output `.next`.
3. **Runtime:** Node.js 20. Enable `NODE_OPTIONS=--max-old-space-size=4096` if builds need additional memory.
4. **Environment variables:** configure Preview and Production with the matrix above (names only). Keep secrets out of code and PRs.
5. **Domains:** map production domain (e.g., `app.prisma-cpa.vercel.app`) and optional custom preview domain. Document Vercel project URL and alias.
6. **Integrations:** Ensure Vercel GitHub app reports preview deployments back to PRs. Optionally enable Edge Config / Serverless regions close to Supabase region.

## F) CI/CD Policy

- **PR gating:** Require `Monorepo CI` (both jobs) and Vercel preview deployment status before merging. Prisma SQL review must be acknowledged in PR comments.
- **Deploy chain:** PR → Vercel preview (auto). Merge to `main` → CI + Supabase preview migration → Vercel production deploy.
- **Additional checks:** optional Supabase CLI diff, Python service lint/tests, or gitleaks scanning can be appended to `.github/workflows/ci.yml` if needed.

## F1) Container Images (Compose Deployments)

When deploying via Docker Compose instead of Vercel, provision container images per service and reference them through environment variables consumed by `docker-compose.prod.yml`:

Required envs for images (see `.env.compose.example`):

- `GATEWAY_IMAGE` – e.g., `ghcr.io/<owner>/<repo>/gateway:latest`
- `RAG_IMAGE` – e.g., `ghcr.io/<owner>/<repo>/rag:latest`
- `AGENT_IMAGE` – e.g., `ghcr.io/<owner>/<repo>/agent:latest`
- `ANALYTICS_IMAGE` – e.g., `ghcr.io/<owner>/<repo>/analytics:latest`
- `UI_IMAGE` – legacy Vite UI image
- `WEB_IMAGE` – Next.js app image
- `SERVICE_VERSION` – optional version string propagated to containers for trace correlation

Front-end selection uses Compose profiles:

- `--profile web` runs the Next.js app (`apps/web`)
- `--profile ui` runs the legacy Vite UI (`ui/`)

Example:

```
cp .env.compose.example .env.compose
docker compose --env-file .env.compose --profile web -f docker-compose.prod.yml up -d
```

## G) Verification Procedures

1. **Automated:** After deploy, call `/api/healthz` (returns JSON + DB latency) via monitoring or GitHub Actions smoke test.
2. **Manual:**
   - Validate sample org/user data loads in dashboard.
   - Confirm Prisma client is initialised (no hot reload errors in logs).
   - Ensure RLS still enforces tenant boundaries via Supabase SQL console.
3. **Artifacts to capture:**
   - Vercel Preview URL (e.g., `https://<branch>--web.vercel.app`).
   - Production domain + latest deployment ID.
   - Supabase project reference.
   - CI run URL for migrations.

### G1) Healthz Smoke Workflow

- Trigger the workflow `Healthz Smoke` from the Actions tab with input:
  - `app_url`: e.g., `https://app.prisma-cpa.vercel.app/api/healthz`
- The job validates HTTP 200 and JSON `{ status: "ok" }`.
- Optionally set `PRODUCTION_HEALTH_URL` in `.env.production.example` for reference.

### G2) Trigger Prisma Migrate (Production)

- Ensure GitHub environment `production` has secrets `DATABASE_URL` (and optional `DIRECT_URL`).
- From the Actions tab, run `Supabase Prisma Deploy` with `environment=production` (workflow_dispatch).
- The workflow first resolves baseline (`npx prisma migrate resolve --applied 0001_init`) then runs `prisma migrate deploy`.

## H) Rollback Strategy

1. **Application:** Use Vercel's "Promote previous" to instant-rollback. Document offending deployment ID in incident channel.
2. **Code:** `git revert <sha>` on `main`, push; CI + migrations (no-op) rerun; Vercel redeploys reverted build.
3. **Database:**
   - Prefer forward-only migrations; for accidental deploy, trigger Supabase point-in-time recovery or run manual down migration stored alongside the up script.
   - Record rollback steps + owner in incident doc.
4. **Communications:** Notify engineering on-call, DBA, and compliance contact list (see `PRODUCTION_READINESS_CHECKLIST.md`) within 15 minutes of incident declaration.

## I) Final Report Template

After each production release provide the following to stakeholders:

```
Repo: https://github.com/<org>/<repo>
Branch protections: <summary/link>
CI pipelines: Monorepo CI (run URL)
Vercel project: https://vercel.com/<team>/<project>
Preview URL: https://<branch>--web.vercel.app
Production URL: https://app.prisma-cpa.vercel.app
Supabase project: https://app.supabase.com/project/<ref>
Latest Prisma migration: 2025xxxx_<name> (reviewer, approval date)
Env matrix: DATABASE_URL, DIRECT_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_JWT_SECRET, OPENAI_API_KEY, ...
Post-deploy checklist: healthz 200 ✅, seed run ✅, smoke tests ✅
Rollback readiness: last restore point, on-call rotation link
Open items: <secrets to rotate, DNS cutover, analytics hooks, etc.>
```

Keep this report in `AUDIT_REPORT.md` or share via the chosen compliance channel.

## J) Vercel Deployment Checklist (Preview & Production)

1. **Pre-flight validation**
   - [ ] Confirm the latest commit on the release branch has passed `pnpm test`, `pnpm lint`, Playwright (`pnpm test:playwright`), and Python test suites (`pytest`).
   - [ ] Review coverage summaries in `coverage/lcov.info` (Vitest) and the pytest-cov report (e.g., `pytest --cov` output captured in CI artifacts) to ensure lines/functions stay within historical thresholds before approving the release.
   - [ ] Tag the release candidate in GitHub with an annotated tag (e.g., `vercel-v2025.02.14`) for traceability.

2. **Environment parity checks**
   - [ ] In Vercel → Project Settings → Environment Variables, verify the Preview and Production groups mirror the matrix in Section C (especially `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_API_BASE`, `OPENAI_API_KEY`, rate limiting knobs, and GPT-5 tuning values).
   - [ ] Run `pnpm run agents:generate` followed by `pnpm run agents:update` to ensure agent manifests/serverless metadata match the Supabase tables before deploying.
   - [ ] Confirm Supabase secrets for server-side functions (Vault path or direct variables) match the Vercel environment values.

3. **Database & migrations**
   - [ ] Execute `pnpm supabase:migrate:web-cache` (or `supabase db push` for ad hoc changes) against staging. Capture the CLI output artifact in the deployment ticket.
   - [ ] Review generated SQL under `apps/web/prisma/migrations` and obtain sign-off from the data owner.
   - [ ] Schedule production `prisma migrate deploy` via the `Supabase Prisma Deploy` GitHub Action (environment = `production`) immediately after the Vercel promotion window.

4. **Serverless & edge functions**
   - [ ] Run `pnpm build` from the repo root to ensure Next.js, edge functions under `apps/web/app/api/*`, and shared packages compile without warnings.
   - [ ] Re-run `pnpm test:playwright --project=Chromium` to validate auth, agent chat, and document upload flows using the fixture suite added in `tests/playwright/core-journeys.spec.ts`.
   - [ ] For Supabase Edge functions or scheduled tasks, verify the latest bundle hash recorded in `audit/edge-function-manifest.json` matches the deployed version.

5. **Deployment execution**
   - [ ] Trigger a Vercel Preview deployment by pushing the release branch; validate `/api/healthz`, agent chat streaming controls, and document upload success states manually or via scripted smoke tests.
   - [ ] Promote the Preview deployment to Production once migrations finish and smoke tests pass. Capture the deployment URL and ID.

6. **Post-deploy monitoring**
   - [ ] Confirm Datadog/New Relic dashboards show healthy p95 latency (<800 ms) for `/api/agent/*` and no 429 spikes (correlate with the k6/Artillery thresholds).
   - [ ] Review Supabase rate limit metrics; adjust `API_RATE_LIMIT`/`API_RATE_WINDOW_SECONDS` if throttling appears during load.
   - [ ] Update `DEPLOYMENT_READINESS_REPORT.md` with the deployment ID, migration batch, and verification timestamps.

7. **Rollback playbook**
   - [ ] Use Vercel’s “Promote previous deployment” for immediate rollback, then `git revert` the offending commits to keep `main` accurate.
   - [ ] If a migration must be undone, execute the documented Supabase PITR or manual down script; record actions in the incident log and notify stakeholders per Section H.
   - [ ] Post-rollback, run smoke tests and update the checklist to reflect the restored state.

---

### Related References
- [`apps/web/prisma/README.md`](../../apps/web/prisma/README.md) – developer-centric instructions.
- [`PRODUCTION_READINESS_CHECKLIST.md`](../../PRODUCTION_READINESS_CHECKLIST.md) – compliance baseline.
- [`ENDPOINTS_AND_WORKFLOWS.md`](../../ENDPOINTS_AND_WORKFLOWS.md) – API contract overview.
