# Environment Gap Analysis

## Method
- Enumerated every `process.env` reference in the repository and compared the unique keys against the root `.env.example` contents.
- Diff was produced with `rg --no-filename -o "process\\.env\\.([A-Z0-9_]+)"` and `comm` to highlight variables that are referenced in code but missing from the template; grouped findings by owning service for readability.

## Missing from `.env.example`

### Gateway API (`apps/gateway`)
- Runtime schema expects service coordination variables such as `PORT`, `OTEL_SERVICE_NAME`, `OTEL_EXPORTER_OTLP_ENDPOINT`, `SERVICE_VERSION`, `SENTRY_RELEASE`, `SENTRY_ENVIRONMENT`, `REDIS_URL`, `GATEWAY_API_KEYS`, `API_KEYS`, `AGENT_SERVICE_URL`, `AGENT_SERVICE_API_KEY`, `RAG_SERVICE_URL`, and `RAG_SERVICE_API_KEY`.【F:apps/gateway/src/env.ts†L15-L88】
- Dynamic routing also honours `FASTAPI_BASE_URL` / `API_BASE_URL` at runtime for proxying to the FastAPI backend.【F:apps/gateway/src/env.ts†L62-L87】

### Web application (`apps/web`)
- Server-side env validation requires identity and downstream credentials (`AUTH_CLIENT_ID`, `AUTH_CLIENT_SECRET`, `AUTH_ISSUER`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) plus optional integrations such as `AGENT_SERVICE_URL`, `SAMPLING_C1_BASE_URL`, `SAMPLING_C1_API_KEY`, `AUTOMATION_WEBHOOK_SECRET`, `N8N_WEBHOOK_SECRET`, `RAG_SERVICE_URL`, `EMBEDDING_CRON_SECRET`, `DATABASE_URL`, and `SKIP_HEALTHCHECK_DB` / `RECONCILIATION_MODE` overrides.【F:apps/web/src/env.server.ts†L17-L129】
- Public-facing feature flags and demo placeholders are read via `NEXT_PUBLIC_API_BASE`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_ACCOUNTING_MODE`, `NEXT_PUBLIC_RECONCILIATION_MODE`, `NEXT_PUBLIC_GROUP_AUDIT_MODE`, and optional demo identifiers (`NEXT_PUBLIC_DEMO_ORG_ID`, `NEXT_PUBLIC_DEMO_ENGAGEMENT_ID`, `NEXT_PUBLIC_DEMO_USER_ID`).【F:apps/web/src/env.server.ts†L35-L141】
- Client bundle expects those public keys to be present at runtime in addition to supporting custom accounting modes.【F:apps/web/src/env.client.ts†L3-L21】

### Retrieval & agent services (`services/rag` and shared libraries)
- Core service config pulls tracing, Supabase, and OpenAI credentials (`OTEL_SERVICE_NAME`, `OTEL_EXPORTER_OTLP_ENDPOINT`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `SUPABASE_JWT_AUDIENCE`, `OPENAI_API_KEY`, `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_RELEASE`, `TELEMETRY_ALERT_WEBHOOK`, `EMBEDDING_ALERT_WEBHOOK`, and embedding deltas) from environment variables not documented in `.env.example`.【F:services/rag/env.ts†L15-L73】【F:services/rag/index.ts†L693-L706】
- Chat, search, and orchestration pipelines depend on OpenAI tuning knobs (`OPENAI_WEB_SEARCH_ENABLED`, `OPENAI_WEB_SEARCH_MODEL`, `OPENAI_SUMMARY_MODEL`, `OPENAI_DEBUG_LOGGING`, `OPENAI_DEBUG_FETCH_DETAILS`, `OPENAI_STREAMING_ENABLED`, `OPENAI_REALTIME_ENABLED`, `OPENAI_STREAMING_TOOL_ENABLED`, `OPENAI_SORA_ENABLED`, `OPENAI_ORCHESTRATOR_ENABLED`, `ORCHESTRATION_POLL_INTERVAL_MS`, `OPENAI_REQUEST_TAGS`, `OPENAI_REQUEST_QUOTA_TAG`, `OPENAI_DEFAULT_REASONING_EFFORT`, `OPENAI_DEFAULT_VERBOSITY`, `OPENAI_AGENT_REASONING_EFFORT`, `OPENAI_AGENT_VERBOSITY`, `OPENAI_SUMMARY_REASONING_EFFORT`, `OPENAI_SUMMARY_VERBOSITY`, `OPENAI_AGENT_MODEL`) that are only defined in code defaults.【F:services/rag/index.ts†L2345-L2395】【F:services/rag/index.ts†L4769-L4823】
- Knowledge ingestion and notifications use additional service hooks: `WEB_HARVEST_INTERVAL_MS`, `CHAT_COMPLETIONS_STREAM_HEARTBEAT_INTERVAL_MS`, `GDRIVE_PROCESS_BATCH_LIMIT`, `DOCUMENT_SIGN_TTL`, and the notification fan-out settings (`NOTIFY_USER_DISPATCH_BATCH`, `NOTIFY_USER_DISPATCH_INTERVAL_MS`, `NOTIFY_USER_DISPATCH_MAX_ATTEMPTS`, `NOTIFY_USER_DISPATCH_RETRY_BASE_MS`, `NOTIFY_USER_EMAIL_WEBHOOK`, `NOTIFY_USER_EMAIL_WEBHOOK_AUTH`, `NOTIFY_USER_SMS_WEBHOOK`, `NOTIFY_USER_SMS_WEBHOOK_AUTH`).【F:services/rag/index.ts†L199-L213】【F:services/rag/index.ts†L766-L904】【F:services/rag/notifications/fanout.ts†L44-L151】
- Audio/vision helpers reference `OPENAI_TRANSCRIPTION_MODEL`, `OPENAI_WHISPER_MODEL`, `OPENAI_TTS_MODEL`, `OPENAI_TTS_VOICE`, `OPENAI_TTS_FORMAT`, and `OPENAI_VISION_MODEL` for media workflows.【F:services/rag/openai-audio.ts†L51-L141】【F:services/rag/openai-vision.ts†L56-L118】
- OpenAI routing libraries expect `OPENAI_BASE_URL`, workload overrides (`OPENAI_ORG_ID`, `OPENAI_REQUEST_TAGS`, `OPENAI_REQUEST_QUOTA_TAG`, `OPENAI_FINANCE_WORKLOAD`), and optional finance workload secrets to be populated.【F:lib/openai/url.ts†L21-L33】【F:lib/openai/workloads.ts†L13-L106】
- Agent runtime reads `AGENT_POLICY_PACK_VERSION`, `AGENT_PLANNER_MODEL`, and `AGENT_MODEL` when generating fallback plans.【F:lib/agents/runtime.ts†L3-L34】

### Tooling & automation scripts
- Agent evaluation harness requires `AGENT_EVALUATION_BASE_URL` and `AGENT_EVALUATION_BEARER_TOKEN` to run outside CI skips.【F:scripts/run_agent_evaluations.js†L273-L277】
- Bundle budget check honours `BUNDLE_MAX_MAIN_GZ_KB` and `BUNDLE_MAX_CHUNK_GZ_KB` for alerts in CI.【F:scripts/check_bundlesize.mjs†L8-L9】
- OpenAI file search secret publisher consumes staging/production mappings (`STAGING_OPENAI_FILE_SEARCH_*`, `PRODUCTION_OPENAI_FILE_SEARCH_*`).【F:scripts/operations/publish-openai-file-search-secrets.ts†L58-L138】
- Supabase migration helper needs `SUPABASE_PROJECTS` to know which refs to update during cache deployments.【F:scripts/operations/apply-web-cache-migrations.mjs†L15-L78】
- Vercel bootstrap scripts look for `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, and `VERCEL_CLI_MODE` when seeding preview environments.【F:scripts/vercel-preflight.mjs†L31-L104】
- System configuration loader respects `SYSTEM_CONFIG_PATH` overrides for pointing to bespoke `system.yaml` manifests.【F:packages/system-config/index.js†L6-L69】

### Testing & QA pipelines
- Playwright configuration toggles headless automation with `PLAYWRIGHT_BASE_URL`, `PLAYWRIGHT_START_WEB_SERVER`, `PLAYWRIGHT_RUN`, and loads org context via `PLAYWRIGHT_ORG_SLUG` / `PLAYWRIGHT_SMOKE_PATHS`; CI toggles traces with the `CI` flag.【F:playwright.config.ts†L3-L38】【F:tests/playwright/a11y.spec.ts†L19-L42】【F:tests/playwright/smoke.spec.ts†L1-L11】
- Vitest coverage thresholds depend on `VITEST_COVERAGE_STATEMENTS`, `VITEST_COVERAGE_BRANCHES`, `VITEST_COVERAGE_FUNCTIONS`, `VITEST_COVERAGE_LINES`, and the `VITEST` sentinel used to auto-seed defaults during tests.【F:vitest.config.ts†L240-L265】【F:apps/web/src/env.server.ts†L46-L90】

## Recommendations
- Document the above keys in the deployment password vaults and CI secrets so staging/production parity is maintained.
- Update `.env.example` (or provide layered templates) to include placeholder values for each missing key, keeping defaults aligned with the runtime schemas referenced above.
- Mirror these secrets in the Vercel/Supabase environments before promoting new releases to avoid runtime validation failures.
