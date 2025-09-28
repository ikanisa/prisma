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

## C) Environment Matrix

| Variable | Scope | Notes |
| --- | --- | --- |
| `DATABASE_URL` | GitHub Actions (all jobs), Vercel Preview, Vercel Production | Primary Postgres connection used by Prisma Client. |
| `DIRECT_URL` | GitHub Actions (migrations), optional Vercel Production | Point to Supabase transactional pooler to avoid timeouts during migrations. |
| `SUPABASE_URL` | Vercel Preview/Production, local dev | Base URL for Supabase client. |
| `SUPABASE_SERVICE_ROLE_KEY` | GitHub Actions (seeding/tests), Vercel Preview/Production | Privileged key used by API routes and optional seeds. |
| `SUPABASE_JWT_SECRET` | GitHub Actions (tests), Vercel Preview/Production | Required for verifying Supabase-issued JWTs. |
| `OPENAI_API_KEY` | Vercel Preview/Production, GitHub Actions (optional integration tests) | Used by RAG/agent flows. |
| `API_RATE_LIMIT`, `API_RATE_WINDOW_SECONDS` | Vercel Preview/Production | Align with FastAPI/env defaults for rate limiting. |
| Front-end vars (`VITE_*`) | Local dev, Vercel Preview/Production | Already modelled in `.env.example`; keep parity. |

Map the same variable names into Supabase Secrets for server-side functions/tasks when required.

`.env.example` lists only variable names and sample placeholders. `.env`, `.env.*` stay ignored.

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
5. **Domains:** map production domain (e.g., `app.example.com`) and optional custom preview domain. Document Vercel project URL and alias.
6. **Integrations:** Ensure Vercel GitHub app reports preview deployments back to PRs. Optionally enable Edge Config / Serverless regions close to Supabase region.

## F) CI/CD Policy

- **PR gating:** Require `Monorepo CI` (both jobs) and Vercel preview deployment status before merging. Prisma SQL review must be acknowledged in PR comments.
- **Deploy chain:** PR → Vercel preview (auto). Merge to `main` → CI + Supabase preview migration → Vercel production deploy.
- **Additional checks:** optional Supabase CLI diff, Python service lint/tests, or gitleaks scanning can be appended to `.github/workflows/ci.yml` if needed.

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
Production URL: https://app.example.com
Supabase project: https://app.supabase.com/project/<ref>
Latest Prisma migration: 2025xxxx_<name> (reviewer, approval date)
Env matrix: DATABASE_URL, DIRECT_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_JWT_SECRET, OPENAI_API_KEY, ...
Post-deploy checklist: healthz 200 ✅, seed run ✅, smoke tests ✅
Rollback readiness: last restore point, on-call rotation link
Open items: <secrets to rotate, DNS cutover, analytics hooks, etc.>
```

Keep this report in `AUDIT_REPORT.md` or share via the chosen compliance channel.

---

### Related References
- [`apps/web/prisma/README.md`](../../apps/web/prisma/README.md) – developer-centric instructions.
- [`PRODUCTION_READINESS_CHECKLIST.md`](../../PRODUCTION_READINESS_CHECKLIST.md) – compliance baseline.
- [`ENDPOINTS_AND_WORKFLOWS.md`](../../ENDPOINTS_AND_WORKFLOWS.md) – API contract overview.
