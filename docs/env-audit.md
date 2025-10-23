# Environment Variable Audit

## Methodology
- Parsed `.env.example` and compared the declared keys to every `process.env`, `os.getenv`, and `environ[...]` access within the monorepo.
- Grouped the 100+ uncovered variables by owning subsystem so that missing secrets can be sourced from the relevant platform vaults (Vercel, Supabase, Vault, CI, etc.).

## Summary of Missing Keys
The following variables are consumed in code or tests but absent from `.env.example`. Populate them in the shared secrets manager before promoting changes.

### Agent Platform & Evaluations
- `AGENT_EVALUATION_BASE_URL`, `AGENT_EVALUATION_BEARER_TOKEN` — evaluation runner script. `scripts/run_agent_evaluations.js`
- `AGENT_MODEL`, `AGENT_PLANNER_MODEL`, `AGENT_POLICY_PACK_VERSION` — core agent runtime & manifests. `lib/agents/runtime.ts`, `services/agents/audit-execution.ts`
- `AGENT_SERVICE_URL`, `AGENT_SERVICE_API_KEY` — Gateway proxy + server-side web code. `apps/gateway/src/env.ts`, `apps/web/src/env.server.ts`, `tests/web/agent-api.test.ts`

### API Gateway & Express Worker
- `API_BASE_URL`, `API_KEYS`, `FASTAPI_BASE_URL`, `GATEWAY_API_KEYS`, `PORT` — Express config and contracts. `apps/gateway/src/env.ts`, `apps/gateway/server.js`
- `RAG_SERVICE_URL`, `RAG_SERVICE_API_KEY`, `REDIS_URL` — upstream integrations and caching. `apps/gateway/src/env.ts`, `server/main.py`
- `SERVICE_VERSION`, `SKIP_HEALTHCHECK_DB` — health endpoints & smoke tests. `apps/web/src/env.server.ts`, `server/main.py`

### Supabase & Authentication
- `AUTH_CLIENT_ID`, `AUTH_CLIENT_SECRET`, `AUTH_ISSUER`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Next.js auth bootstrap and tests. `apps/web/src/env.server.ts`, `tests/web/agent-proxy.test.ts`
- `SUPABASE_ALLOW_STUB`, `SUPABASE_JWT_AUDIENCE`, `SUPABASE_PROJECTS` — serverless stubs and migration tooling. `lib/idempotency.ts`, `server/main.py`, `scripts/operations/apply-web-cache-migrations.mjs`

### OpenAI & RAG Operations
- `OPENAI_AGENT_MODEL`, `OPENAI_AGENT_REASONING_EFFORT`, `OPENAI_AGENT_VERBOSITY`, `OPENAI_SUMMARY_MODEL`, `OPENAI_SUMMARY_REASONING_EFFORT`, `OPENAI_SUMMARY_VERBOSITY`, `OPENAI_VISION_MODEL`, `OPENAI_WHISPER_MODEL`, `OPENAI_FINANCE_WORKLOAD`, `OPENAI_ORG_ID`, `OPENAI_REQUEST_TAGS`, `OPENAI_REQUEST_QUOTA_TAG`, `OPENAI_BASE_URL` — agent + reporting workloads. `services/rag/index.ts`, `lib/agents/runtime.ts`
- `PRODUCTION_OPENAI_FILE_SEARCH_*`, `STAGING_OPENAI_FILE_SEARCH_*` — secret publishing automation. `scripts/operations/publish-openai-file-search-secrets.ts`
- `WEB_HARVEST_INTERVAL_MS`, `CHAT_COMPLETIONS_STREAM_HEARTBEAT_INTERVAL_MS`, `DOCUMENT_SIGN_TTL` — ingestion throttles and RAG helpers. `services/rag/index.ts`

### Embedding & Analytics Jobs
- `EMBEDDING_ALERT_WEBHOOK`, `EMBEDDING_CRON_SECRET`, `EMBEDDING_DELTA_DOCUMENT_LIMIT`, `EMBEDDING_DELTA_LOOKBACK_HOURS`, `EMBEDDING_DELTA_POLICY_LIMIT` — analytics cron configuration. `services/analytics/jobs.py`, `services/rag/env.ts`
- `GDRIVE_PROCESS_BATCH_LIMIT` — Drive ingestion service tuning. `services/rag/index.ts`

### Notifications & Webhooks
- `AUTOMATION_WEBHOOK_SECRET`, `N8N_WEBHOOK_SECRET` — automation triggers. `apps/web/src/env.server.ts`
- `NOTIFY_USER_*` webhooks, `TELEMETRY_ALERT_WEBHOOK`, `EMBEDDING_ALERT_WEBHOOK` — notification fan-out. `services/rag/index.ts`
- `RATE_LIMIT_ALERT_WEBHOOK`, `DOCUMENT_SIGN_TTL` — alerting + signing TTLs. `services/rag/index.ts`, `tests/security/signed-url-policy.test.ts`

### Front-end Feature Flags & Demos
- `NEXT_PUBLIC_ACCOUNTING_MODE`, `NEXT_PUBLIC_GROUP_AUDIT_MODE`, `NEXT_PUBLIC_RECONCILIATION_MODE`, `NEXT_PUBLIC_DEMO_*`, `NEXT_PUBLIC_API_BASE` — demo toggles consumed by Remix app. `apps/web/src/env.server.ts`
- `VITEST`, `VITEST_COVERAGE_*`, `PLAYWRIGHT_*`, `CI` — test harness settings. `apps/web/src/env.server.ts`, `vitest.config.ts`, `playwright.config.ts`
- `BUNDLE_MAX_MAIN_GZ_KB`, `BUNDLE_MAX_CHUNK_GZ_KB` — bundle guardrails. `scripts/check_bundlesize.mjs`

### Observability & Telemetry
- `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_RELEASE` — Sentry wiring. `server/main.py`, `services/rag/index.ts`
- `OTEL_EXPORTER_OTLP_ENDPOINT`, `OTEL_SERVICE_NAME` — OpenTelemetry exporters. `apps/gateway/src/env.ts`, `services/analytics/app.py`
- `TELEMETRY_ALERT_WEBHOOK` — telemetry sync reporting. `services/rag/index.ts`

### Infrastructure & Deployment
- `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `VERCEL_TOKEN`, `VERCEL_CLI_MODE` — deployment preflight scripts. `scripts/vercel-preflight.mjs`
- `SERVICE_VERSION`, `NODE_ENV`, `CI` — release metadata across services. `server/main.py`, `index.js`

Ensure each key is recorded in the shared `.env.example` (with safe placeholders) and in the appropriate secret store before deployment.
