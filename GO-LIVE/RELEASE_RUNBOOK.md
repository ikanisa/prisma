# Release Runbook (Prisma Glow / prisma-glow-15)

> Non-destructive only. All commands listed are suggestions; run from a clean workspace on a release branch.

## 1. Pre-flight
- Confirm P0 issues closed (`GO-LIVE/OPEN_ISSUES.md`).
- Verify clean git status (`git status -sb`).
- Export final env configuration (Supabase URL/service role key, OTEL endpoint, Sentry DSN, `API_ALLOWED_ORIGINS`).
- Confirm `DOMAIN_TOOL_MODEL`, `DOMAIN_IMAGE_MODEL`, and `OPENAI_WEB_SEARCH_ENABLED` are set in the production secrets store for the rag service deployment.
- Ensure `VITE_ENABLE_PWA=true` and `AUTOPILOT_WORKER_DISABLED=false` in production `.env`.
- Review `PRODUCTION_READINESS_CHECKLIST.md` and `docs/observability.md` for updated gates.

## 2. Build & Test
1. `npm ci`
2. `npm run lint`
3. `npm run build`
4. `npm test`
5. `npm run test:playwright`
6. Capture artifacts (coverage, screenshots) under `/GO-LIVE/artifacts/<release-tag>/`.
7. Run Lighthouse + axe locally against staging bundle (record scores).
8. Execute Phase D load tests where required (`tests/perf/autonomy-burst.js`,
   `tests/perf/doc-ingestion-spike.js`, `tests/perf/archive-rebuild.js`) and
   archive the JSON summaries alongside release-control outputs.

## 3. Database / Supabase migrations
- Apply migrations in chronological order using `supabase db push` or the CI workflow:
  1. `supabase/migrations/20250926090000_tasks_documents_notifications.sql`
  2. `supabase/migrations/20250926181500_activity_event_catalog_rls.sql`
  3. `supabase/migrations/20251115122000_web_fetch_cache.sql`
  4. `supabase/migrations/20251115123000_web_fetch_cache_retention.sql`
- Run `SUPABASE_PROJECTS="preview=<ref>,production=<ref>" pnpm supabase:migrate:web-cache --dry-run` to verify CLI connectivity, then execute without `--dry-run` to commit the cache migrations to each Supabase project prior to code promotion. Capture CLI output in the deployment log.
- Confirm helper functions exist (`supabase/migrations/20250821115406_.sql`) and storage policies (new migration from P1 task once merged).
- Record migration hash in deployment log.

## 4. Deployment
- Frontend: build artefact (`dist/`) deployed to CDN (Vercel/Netlify as configured).
- Backend: build FastAPI container (tag with release + git sha). Push to container registry; deploy to environment (Fly/Render/Kubernetes).
- Run database migrations as part of release pipeline before backend rollout.
- Toggle feature flags (if any) via config service.

## 5. Post-deploy Verification
- API:
  - `curl -H "Authorization: Bearer <jwt>" "$API_BASE_URL/v1/tasks?orgSlug=<slug>&limit=1"`
  - `curl -H "Authorization: Bearer <jwt>" "$API_BASE_URL/v1/storage/documents?orgSlug=<slug>&limit=1"`
  - `curl -H "Authorization: Bearer <jwt>" -X POST "$API_BASE_URL/v1/notifications/mark-all" -d '{"orgSlug":"<slug>"}'`
  - `curl -H "Authorization: Bearer <jwt>" -H "Content-Type: application/json" -X POST "$API_BASE_URL/api/release-controls/check" -d '{"orgSlug":"<slug>"}'`
    - Confirm `environment.autonomy.state == "satisfied"`, `environment.mfa.state == "satisfied"`, and `environment.telemetry.open <= maxOpen`.
- Health:
  - `curl "$API_BASE_URL/health"`
  - `curl "$API_BASE_URL/readiness"`
- Frontend:
  - Load Tasks/Documents/Onboarding/Assistant pages; verify assistant dock available.
  - Confirm PWA install prompt appears (Chrome/Edge dev tools > Application > Manifest).
- Autopilot:
  - Trigger test job `POST /v1/autopilot/jobs/run` (kind `extract_documents`) with staging org; monitor logs.
- RAG file search:
  - Publish the staged/production vector store ids with `pnpm openai:file-search:secrets` (requires `gh auth login`).
  - Inspect Supabase `openai_debug_events` for recent `scope=rag_file_search` rows from staging/production traffic and verify the `vector_store_id` and citations match expectations.
  - If early runs surface irrelevant citations, adjust `OPENAI_FILE_SEARCH_FILTERS` or `OPENAI_FILE_SEARCH_MAX_RESULTS` secrets and redeploy the RAG service.
- Storage:
  - Upload document via UI and confirm signed URL download returns 200 while direct GET fails.
- Observability:
  - Confirm Sentry receives an intentional test error.
  - Check OTLP collector for new trace with correlation ID.
  - Query `select * from web_fetch_cache_metrics;` (Supabase SQL editor or CLI) and verify `oldest_fetched_at` is within the configured 14-day retention window. Investigate anomalies before sign-off.

## 6. Runbooks & Sign-off
- Update `/GO-LIVE/GO-LIVE_SCORECARD.md` with final status.
- Attach evidence to change ticket / CAB log.
- Obtain approvals from Security, DevOps, Product per governance policy.

## 7. Rollback
- See `GO-LIVE/ROLLBACK_PLAN.md` for detailed steps per component.
