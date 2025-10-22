# Vercel Release Checklist

This checklist ensures Vercel deployments stay aligned with the Supabase backend, serverless functions, and caching/rate-limit expectations. Complete every section before promoting a build to production.

## 1. Environment Configuration
- [ ] Confirm the target Vercel environment (Preview, Staging, Production) is selected in the dashboard.
- [ ] Compare `.env.production` (or secrets manager) with `apps/web/src/env.server.ts` and `apps/web/src/env.client.ts` to ensure all `NEXT_PUBLIC_*` and server-only values are populated.
- [ ] Set `AGENT_CHAT_RATE_LIMIT_PER_MINUTE`, `AGENT_CHAT_RATE_LIMIT_WINDOW_SECONDS`, and `AGENT_CHAT_CACHE_CONTROL` when staging requires bespoke throttling.
- [ ] Validate Supabase credentials: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and service-role keys referenced in `SUPABASE_SERVICE_ROLE_KEY`.
- [ ] Re-sync secrets for gateway/server processes (`OPENAI_API_KEY`, `TELEMETRY_WRITE_KEY`, etc.) using `vercel env pull` / `vercel env push`.

## 2. Database & Storage
- [ ] Run `supabase db diff` to confirm no pending migrations locally.
- [ ] Apply latest Supabase migrations to staging: `supabase db push --env staging`.
- [ ] Execute seeded scripts if required (`supabase/seed/*.sql`) for new features (e.g. agent tool registry entries).
- [ ] Verify storage buckets referenced by document upload flows (`client/upload`) exist and have appropriate RLS policies.

## 3. Serverless Functions & Edge Handlers
- [ ] Audit `apps/web/app/api/**` for new routes and confirm Vercel build output includes corresponding functions (`vercel build --prod` locally for preview).
- [ ] Ensure `apps/gateway` deployment (if proxied) is updated with any rate-limit or caching changes; redeploy Docker image if necessary.
- [ ] Validate `apps/gateway/routes/agent.js` env overrides by running `AGENT_CHAT_RATE_LIMIT_PER_MINUTE=60 npm start` locally and confirming headers in `/v1/agent/chat` responses.
- [ ] Run `pnpm lint && pnpm test` to ensure unit/integration coverage meets thresholds captured in `coverage/lcov.info`.

## 4. End-to-End & Load Verification
- [ ] Execute Playwright suite with fixtures: `npx playwright test tests/playwright/core-journeys.spec.ts --project=Chromium`.
- [ ] Run k6 smoke for agent chat: `k6 run tests/perf/agent-chat-load.js --vus 5 --duration 30s` (against staging) and observe caching + rate-limit metrics.
- [ ] Confirm webhook endpoints (`/api/agent/respond`, `/api/agent/conversations`) return `Cache-Control`/`ETag` headers via `curl -I` spot checks.

## 5. Observability & Alerts
- [ ] Update telemetry dashboards/alert rules for new rate-limit values (Grafana, Datadog, etc.).
- [ ] Verify `X-Request-Id` propagation via sample request to `/api/agent/start` and confirm traces appear in the monitoring suite.
- [ ] Rotate temporary logging levels back to defaults post-validation.

## 6. Rollback Plan
- [ ] Identify the previous successful deployment URL in Vercel (“Deployments” tab) and keep it bookmarked.
- [ ] Ensure Supabase migrations are reversible or backed up: export diff SQL before applying and prepare `supabase db reset --shadow` validation.
- [ ] Document the toggle/flag to disable the feature (`AGENT_CHAT_RATE_LIMIT_PER_MINUTE`, `OPENAI_STREAMING_ENABLED`, etc.) in incident response runbook.
- [ ] Communicate rollback steps (who, where, expected timeline) in the release Slack channel or incident doc.

Once every item is checked, proceed with `vercel deploy --prod`. Record verification artefacts (screenshots, k6 summaries, coverage reports) in the release ticket for auditing.
