# Environment Gap Analysis

## Overview
This document compares the environment variable keys required by the application code with the shared `.env.example` template. It also captures the status of live secret exports from hosting platform, Supabase, and Vault so that missing credentials can be backfilled quickly.

## Key Inventory Comparison
The table below shows whether each key is present in the source files that validate environment variables. A check mark means the key is required or consumed in that layer. A dot indicates that the key is optional in that layer but present in `.env.example` for completeness.

| Key | `.env.example` | Gateway (`apps/gateway/src/env.ts`) | Web (`apps/web/src/env.*.ts`) | RAG (`services/rag/env.ts`) | Notes |
| --- | --- | --- | --- | --- | --- |
| AGENT_SERVICE_API_KEY | ✓ | ✓ | ✓ | – | Added to template for gateway & web service parity. |
| AGENT_SERVICE_URL | ✓ | ✓ | ✓ | – | |
| API_BASE_URL | ✓ | ✓ | – | – | Runtime override for gateway. |
| API_KEYS | ✓ | ✓ | – | – | |
| API_RATE_LIMIT | ✓ | – | – | ✓ | Shared rate-limiting defaults. |
| API_RATE_WINDOW_SECONDS | ✓ | – | – | ✓ | |
| API_ALLOWED_ORIGINS | ✓ | ✓ | – | – | |
| AUTOPILOT_JOB_RATE_LIMIT | ✓ | – | – | – | Existing template value retained (not validated in code). |
| AUTOPILOT_JOB_RATE_WINDOW_SECONDS | ✓ | – | – | – | |
| AUTOPILOT_SCHEDULE_RATE_LIMIT | ✓ | – | – | – | |
| AUTOPILOT_SCHEDULE_RATE_WINDOW_SECONDS | ✓ | – | – | – | |
| AUTOMATION_WEBHOOK_SECRET | ✓ | – | ✓ | – | |
| AUTH_CLIENT_ID | ✓ | – | ✓ | – | |
| AUTH_CLIENT_SECRET | ✓ | – | ✓ | – | |
| AUTH_ISSUER | ✓ | – | ✓ | – | |
| DATABASE_URL | ✓ | ✓ | ✓ | ✓ | |
| DIRECT_URL | ✓ | – | – | – | Used for Prisma migrations only. |
| DOCUMENT_UPLOAD_RATE_LIMIT | ✓ | – | – | – | |
| DOCUMENT_UPLOAD_RATE_WINDOW_SECONDS | ✓ | – | – | – | |
| EMBEDDING_ALERT_WEBHOOK | ✓ | – | – | ✓ | |
| EMBEDDING_CRON_SECRET | ✓ | – | ✓ | ✓ | |
| EMBEDDING_DELTA_DOCUMENT_LIMIT | ✓ | – | – | ✓ | |
| EMBEDDING_DELTA_LOOKBACK_HOURS | ✓ | – | – | ✓ | |
| EMBEDDING_DELTA_POLICY_LIMIT | ✓ | – | – | ✓ | |
| ENVIRONMENT | ✓ | ✓ | – | ✓ | |
| ERROR_NOTIFY_WEBHOOK | ✓ | – | – | – | |
| FASTAPI_BASE_URL | ✓ | ✓ | – | – | |
| GATEWAY_API_KEYS | ✓ | ✓ | – | – | |
| GDRIVE_FOLDER_ID | ✓ | – | – | – | External integration not validated in TS schema. |
| GDRIVE_SERVICE_ACCOUNT_EMAIL | ✓ | – | – | – | |
| GDRIVE_SERVICE_ACCOUNT_KEY | ✓ | – | – | – | |
| GDRIVE_SHARED_DRIVE_ID | ✓ | – | – | – | |
| GDRIVE_WATCH_CHANNEL_TOKEN | ✓ | – | – | – | |
| GOOGLE_SERVICE_ACCOUNT_KEY_PATH | ✓ | – | – | – | |
| GOOGLE_SHEET_ID | ✓ | – | – | – | |
| NEXT_PUBLIC_ACCOUNTING_MODE | ✓ | – | ✓ | – | |
| NEXT_PUBLIC_API_BASE | ✓ | – | ✓ | – | |
| NEXT_PUBLIC_DEMO_ENGAGEMENT_ID | ✓ | – | ✓ | – | |
| NEXT_PUBLIC_DEMO_ORG_ID | ✓ | – | ✓ | – | |
| NEXT_PUBLIC_DEMO_USER_ID | ✓ | – | ✓ | – | |
| NEXT_PUBLIC_GROUP_AUDIT_MODE | ✓ | – | ✓ | – | |
| NEXT_PUBLIC_RECONCILIATION_MODE | ✓ | – | ✓ | – | |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | ✓ | – | ✓ | – | |
| NEXT_PUBLIC_SUPABASE_URL | ✓ | – | ✓ | – | |
| NODE_ENV | ✓ | ✓ | ✓ | ✓ | |
| N8N_WEBHOOK_SECRET | ✓ | – | ✓ | – | |
| OPENAI_AGENT_ID | ✓ | – | – | – | |
| OPENAI_AGENT_PLATFORM_ENABLED | ✓ | – | – | – | |
| OPENAI_API_KEY | ✓ | – | ✓ | ✓ | |
| OPENAI_DEBUG_FETCH_DETAILS | ✓ | – | – | – | |
| OPENAI_DEBUG_LOGGING | ✓ | – | – | – | |
| OPENAI_FILE_SEARCH_FILTERS | ✓ | – | – | – | |
| OPENAI_FILE_SEARCH_INCLUDE_RESULTS | ✓ | – | – | – | |
| OPENAI_FILE_SEARCH_MAX_RESULTS | ✓ | – | – | – | |
| OPENAI_FILE_SEARCH_MODEL | ✓ | – | – | – | |
| OPENAI_FILE_SEARCH_VECTOR_STORE_ID | ✓ | – | – | – | |
| OPENAI_ORCHESTRATOR_ENABLED | ✓ | – | – | – | |
| OPENAI_REALTIME_ENABLED | ✓ | – | – | – | |
| OPENAI_REALTIME_MODEL | ✓ | – | – | – | |
| OPENAI_REALTIME_TURN_SERVERS | ✓ | – | – | – | |
| OPENAI_REALTIME_VOICE | ✓ | – | – | – | |
| OPENAI_RETRIEVAL_VECTOR_STORE_ID | ✓ | – | – | – | |
| OPENAI_RETRIEVAL_VECTOR_STORE_NAME | ✓ | – | – | – | |
| OPENAI_RPM | ✓ | – | – | – | |
| OPENAI_SORA_ASPECT_RATIO | ✓ | – | – | – | |
| OPENAI_SORA_ENABLED | ✓ | – | – | – | |
| OPENAI_SORA_MODEL | ✓ | – | – | – | |
| OPENAI_STREAMING_ENABLED | ✓ | – | – | – | |
| OPENAI_STREAMING_TOOL_ENABLED | ✓ | – | – | – | |
| OPENAI_TRANSCRIPTION_MODEL | ✓ | – | – | – | |
| OPENAI_TTS_FORMAT | ✓ | – | – | – | |
| OPENAI_TTS_MODEL | ✓ | – | – | – | |
| OPENAI_TTS_VOICE | ✓ | – | – | – | |
| OPENAI_WEB_SEARCH_ENABLED | ✓ | – | – | – | |
| OPENAI_WEB_SEARCH_MODEL | ✓ | – | – | – | |
| ORCHESTRATION_POLL_INTERVAL_MS | ✓ | – | – | – | |
| OTEL_EXPORTER_OTLP_ENDPOINT | ✓ | ✓ | – | ✓ | |
| OTEL_SERVICE_NAME | ✓ | ✓ | – | ✓ | |
| PORT | ✓ | ✓ | – | – | |
| RAG_INGEST_RATE_LIMIT | ✓ | – | – | – | |
| RAG_INGEST_RATE_WINDOW_SECONDS | ✓ | – | – | – | |
| RAG_REEMBED_RATE_LIMIT | ✓ | – | – | – | |
| RAG_REEMBED_RATE_WINDOW_SECONDS | ✓ | – | – | – | |
| RAG_SEARCH_RATE_LIMIT | ✓ | – | – | – | |
| RAG_SEARCH_RATE_WINDOW_SECONDS | ✓ | – | – | – | |
| RAG_SERVICE_API_KEY | ✓ | ✓ | ✓ | – | |
| RAG_SERVICE_URL | ✓ | ✓ | ✓ | – | |
| RATE_LIMIT_ALERT_WEBHOOK | ✓ | – | – | – | |
| RECONCILIATION_MODE | ✓ | – | ✓ | – | |
| REDIS_URL | ✓ | ✓ | – | – | |
| SAMPLING_C1_API_KEY | ✓ | – | ✓ | – | |
| SAMPLING_C1_BASE_URL | ✓ | – | ✓ | – | |
| SENTRY_DSN | ✓ | – | – | ✓ | |
| SENTRY_ENVIRONMENT | ✓ | ✓ | – | ✓ | |
| SENTRY_RELEASE | ✓ | ✓ | – | ✓ | |
| SERVICE_VERSION | ✓ | ✓ | – | ✓ | |
| SIGNED_URL_DEFAULT_TTL_SECONDS | ✓ | – | – | – | |
| SIGNED_URL_EVIDENCE_TTL_SECONDS | ✓ | – | – | – | |
| SKIP_HEALTHCHECK_DB | ✓ | – | ✓ | – | |
| SUPABASE_ALLOW_STUB | ✓ | – | ✓ | – | |
| SUPABASE_JWT_AUDIENCE | ✓ | – | – | ✓ | |
| SUPABASE_JWT_SECRET | ✓ | – | – | ✓ | |
| SUPABASE_JWT_VAULT_FIELD | ✓ | – | – | – | |
| SUPABASE_SERVICE_ROLE_KEY | ✓ | – | ✓ | ✓ | |
| SUPABASE_SERVICE_ROLE_VAULT_FIELD | ✓ | – | – | – | |
| SUPABASE_URL | ✓ | ✓ | ✓ | ✓ | |
| SUPABASE_VAULT_PATH | ✓ | – | – | – | |
| TELEMETRY_ALERT_WEBHOOK | ✓ | – | – | ✓ | |
| VAULT_ADDR | ✓ | – | – | – | |
| VAULT_KV_MOUNT | ✓ | – | – | – | |
| VAULT_TOKEN | ✓ | – | – | – | |
| VITE_API_BASE_URL | ✓ | – | – | – | |
| VITE_ENABLE_DEMO_LOGIN | ✓ | – | – | – | |
| VITE_ENABLE_PWA | ✓ | – | – | – | |
| VITE_SUPABASE_PROJECT_ID | ✓ | – | – | – | |
| VITE_SUPABASE_PUBLISHABLE_KEY | ✓ | – | – | – | |
| VITE_SUPABASE_URL | ✓ | – | – | – | |
| VITE_TRACKING_ENABLED | ✓ | – | – | – | |
| WEB_FETCH_CACHE_RETENTION_DAYS | ✓ | – | – | – | |

## Environment-Specific Findings
- **Gateway service** – `.env.example` now contains every key required by `apps/gateway/src/env.ts`. The newly added Sentry, Redis, agent, and RAG credentials were previously missing.
- **Web application** – Added OAuth, Supabase, automation webhook, and public NEXT_PUBLIC keys so that the server/client schemas can be satisfied when running locally or in CI.
- **RAG service** – Added observability, Supabase JWT, OpenAI, embedding, and alert webhook values to cover the validation schema.
- **Global template-only keys** – Several keys (e.g. rate limit buckets, Google integrations, legacy Vite client values) are not validated in TypeScript but remain in `.env.example` to support optional features documented elsewhere.

## Live Secret Inventory (Normalized Names)
Live exports could not be generated from this workspace because the deployment managers require authenticated access. Use the commands below from an authenticated terminal and store the results alongside this analysis when available:

| Platform | Command | Normalization Notes |
| --- | --- | --- |
| hosting platform | `<platform-cli> env pull --environment production --yes ./hosting.env` | Convert names to uppercase snake case and map aliases (e.g. NEXT_PUBLIC_SUPABASE_ANON_KEY). |
| Supabase | `supabase secrets list --project-ref <project>` | Ensure secrets align with Supabase dashboard names; normalize to match the keys above. |
| Vault | `vault kv get -format=json secret/apps/prisma-glow-15` | Flatten nested JSON keys and uppercase to match application expectations. |

Record the normalized results in `docs/env-gap-analysis.md` once retrieved so reviewers can confirm parity with the template.

## Next Steps
Refer to `docs/env-next-actions.md` for owner-specific follow-up required to backfill missing secrets across environments.
