# Environment Variables Guide

## Status
- **Version:** 1.0.0
- **Last Updated:** 2025-11-02
- **Owner:** Engineering & Operations Teams

## Executive Summary

This guide documents all 150+ environment variables used across the Prisma Glow platform. Variables are organized into 14 categories with detailed descriptions, default values, validation rules, and security considerations.

**Coverage:**
- Core Runtime (15 variables)
- Database (10 variables)
- Supabase (12 variables)
- OpenAI & AI Platform (25 variables)
- Authentication & Security (18 variables)
- Caching & Performance (12 variables)
- Rate Limiting (15 variables)
- Observability & Monitoring (18 variables)
- External Integrations (15 variables)
- Service URLs & Endpoints (10 variables)
- Client Configuration (12 variables)
- Feature Flags (8 variables)
- Testing & Performance (10 variables)
- Encryption & Secrets (10 variables)

**Usage:**
- Development: Use `.env.development.example` as template
- Production: Use `.env.production.example` as template
- CI/CD: Variables set via GitHub Secrets
- Local: Copy `.env.example` to `.env.local` and customize

---

## 1. Core Runtime Configuration

### NODE_ENV
**Required:** Yes  
**Default:** `development`  
**Values:** `development`, `production`, `test`  
**Description:** Node.js environment mode. Controls logging verbosity, error details, and optimization.

```bash
NODE_ENV="production"
```

**Validation:**
```javascript
const validEnvs = ['development', 'production', 'test'];
if (!validEnvs.includes(process.env.NODE_ENV)) {
  throw new Error('Invalid NODE_ENV');
}
```

### ENVIRONMENT
**Required:** Yes  
**Default:** `development`  
**Values:** `development`, `staging`, `production`, `local`  
**Description:** Deployment environment. Used for feature flags and configuration selection.

```bash
ENVIRONMENT="production"
```

### PORT
**Required:** No  
**Default:** `3000`  
**Type:** Integer (1-65535)  
**Description:** Server listening port for Next.js application.

```bash
PORT="3000"
```

### SERVICE_VERSION
**Required:** No  
**Default:** `""` (empty, read from package.json)  
**Description:** Application version for telemetry and deployment tracking.

```bash
SERVICE_VERSION="1.2.3"
```

### OTEL_SERVICE_NAME
**Required:** No  
**Default:** `gateway`  
**Values:** `gateway`, `rag`, `agent`, `analytics`, `web`  
**Description:** OpenTelemetry service identifier for distributed tracing.

```bash
OTEL_SERVICE_NAME="gateway"
```

### OTEL_EXPORTER_OTLP_ENDPOINT
**Required:** No (production-recommended)  
**Format:** `https://collector.example.com:4318`  
**Description:** OpenTelemetry collector endpoint for traces/metrics.

```bash
OTEL_EXPORTER_OTLP_ENDPOINT="https://otel-collector.prismaglow.com"
```

**Security:** Use HTTPS in production. Validate certificate.

### SENTRY_DSN
**Required:** No (production-recommended)  
**Format:** `https://<key>@sentry.io/<project>`  
**Description:** Global Sentry DSN fallback for error tracking.

```bash
SENTRY_DSN="https://abc123@o12345.ingest.sentry.io/67890"
```

**Security:** DSN is semi-public (client-side). Use organization-level rate limiting.

### WEB_SENTRY_DSN
**Required:** No  
**Description:** Next.js server-side Sentry DSN (overrides global).

```bash
WEB_SENTRY_DSN="https://def456@o12345.ingest.sentry.io/67891"
```

### NEXT_PUBLIC_SENTRY_DSN
**Required:** No  
**Description:** Browser-side Sentry DSN (must mirror WEB_SENTRY_DSN).

```bash
NEXT_PUBLIC_SENTRY_DSN="https://def456@o12345.ingest.sentry.io/67891"
```

**Note:** `NEXT_PUBLIC_*` variables are embedded in client bundle.

### GATEWAY_SENTRY_DSN
**Required:** No  
**Description:** Express gateway Sentry DSN.

```bash
GATEWAY_SENTRY_DSN="https://ghi789@o12345.ingest.sentry.io/67892"
```

### SENTRY_ENVIRONMENT
**Required:** No  
**Default:** Inherits from `ENVIRONMENT`  
**Description:** Sentry environment tag for issue filtering.

```bash
SENTRY_ENVIRONMENT="production"
```

### SENTRY_RELEASE
**Required:** No  
**Default:** Inherits from `SERVICE_VERSION`  
**Description:** Sentry release tag for deploy tracking and source maps.

```bash
SENTRY_RELEASE="prisma-glow@1.2.3"
```

### ALLOW_SENTRY_DRY_RUN
**Required:** No  
**Default:** `false`  
**Values:** `true`, `false`  
**Description:** Enable Sentry dry-run mode (logs events without sending).

```bash
ALLOW_SENTRY_DRY_RUN="true"
```

### SESSION_COOKIE_SECRET
**Required:** Yes (production)  
**Format:** 32+ character random string  
**Description:** Secret for signing session cookies. Rotate every 90 days.

```bash
SESSION_COOKIE_SECRET="$(openssl rand -base64 32)"
```

**Security:**
- Store in secrets manager (Vault, AWS Secrets Manager)
- Never commit to version control
- Rotate on suspected compromise

### SESSION_COOKIE_NAME
**Required:** No  
**Default:** `__Secure-prisma-glow`  
**Description:** Session cookie name. Use `__Secure-` prefix for HTTPS-only.

```bash
SESSION_COOKIE_NAME="__Secure-prisma-glow"
```

### SESSION_COOKIE_PATH
**Required:** No  
**Default:** `/`  
**Description:** Cookie path scope.

```bash
SESSION_COOKIE_PATH="/"
```

### SESSION_COOKIE_SAME_SITE
**Required:** No  
**Default:** `lax`  
**Values:** `strict`, `lax`, `none`  
**Description:** SameSite cookie attribute. Use `strict` for maximum CSRF protection.

```bash
SESSION_COOKIE_SAME_SITE="lax"
```

### SESSION_COOKIE_SECURE
**Required:** No (production: true)  
**Default:** `true`  
**Values:** `true`, `false`  
**Description:** Require HTTPS for cookie transmission.

```bash
SESSION_COOKIE_SECURE="true"
```

**Production:** Must be `true`.

### SESSION_COOKIE_HTTP_ONLY
**Required:** No  
**Default:** `true`  
**Values:** `true`, `false`  
**Description:** Prevent JavaScript access to cookie (XSS mitigation).

```bash
SESSION_COOKIE_HTTP_ONLY="true"
```

**Production:** Must be `true`.

### SESSION_COOKIE_DOMAIN
**Required:** No  
**Default:** `""` (host-only)  
**Description:** Cookie domain for subdomain sharing.

```bash
SESSION_COOKIE_DOMAIN=".prismaglow.com"
```

**Note:** Leave blank for single-host cookies.

---

## 2. Database Configuration

### DATABASE_URL
**Required:** Yes  
**Format:** `postgresql://user:pass@host:port/db?params`  
**Description:** PostgreSQL connection string for Prisma and FastAPI.

```bash
DATABASE_URL="postgresql://postgres:password@localhost:5432/prisma_glow?schema=public"
```

**Security:**
- Store in secrets manager
- Use connection pooling in production (pgBouncer)
- Limit database user permissions (no DROP, TRUNCATE)

**Production Example:**
```bash
DATABASE_URL="postgresql://app_user:${DB_PASSWORD}@db.internal:5432/prisma_glow_prod?sslmode=require&pool_size=20"
```

### DIRECT_URL
**Required:** No (recommended for migrations)  
**Format:** PostgreSQL connection string  
**Description:** Direct database connection bypassing pgBouncer for migrations.

```bash
DIRECT_URL="postgresql://postgres:password@localhost:5432/prisma_glow?pgbouncer=true"
```

**Use Case:** Prisma migrations require transaction mode, not pgBouncer session mode.

### SKIP_HEALTHCHECK_DB
**Required:** No  
**Default:** `false`  
**Values:** `true`, `false`  
**Description:** Skip database health checks on startup.

```bash
SKIP_HEALTHCHECK_DB="false"
```

**Use Case:** CI environments without live database.

### RECONCILIATION_MODE
**Required:** No  
**Default:** `db`  
**Values:** `db`, `memory`  
**Description:** Bank reconciliation persistence mode.

```bash
RECONCILIATION_MODE="db"
```

---

## 3. Supabase Configuration

### SUPABASE_URL
**Required:** Yes  
**Format:** `https://<project>.supabase.co`  
**Description:** Supabase project URL for API and storage access.

```bash
SUPABASE_URL="https://abcdefghijklmnop.supabase.co"
```

### SUPABASE_SERVICE_ROLE_KEY
**Required:** Yes (server-side only)  
**Format:** JWT token (200+ characters)  
**Description:** Supabase service role key with admin privileges. Bypasses RLS.

```bash
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Security:**
- Never expose to client
- Store in secrets manager
- Rotate every 90 days
- Audit usage in Supabase dashboard

### SUPABASE_JWT_SECRET
**Required:** Yes  
**Format:** 32+ character string  
**Description:** JWT signing secret for Supabase tokens.

```bash
SUPABASE_JWT_SECRET="your-super-secret-jwt-token-with-at-least-32-characters"
```

**Security:** Rotate with SUPABASE_SERVICE_ROLE_KEY.

### SUPABASE_JWT_AUDIENCE
**Required:** No  
**Default:** `authenticated`  
**Description:** JWT audience claim for token validation.

```bash
SUPABASE_JWT_AUDIENCE="authenticated"
```

### SUPABASE_ALLOW_STUB
**Required:** No  
**Default:** `false`  
**Values:** `true`, `false`  
**Description:** Allow stubbed Supabase client for testing.

```bash
SUPABASE_ALLOW_STUB="true"
```

**Use Case:** Unit tests without live Supabase instance.

### SUPABASE_VAULT_PATH
**Required:** No (production-recommended)  
**Format:** `apps/<app-name>/supabase`  
**Description:** HashiCorp Vault path for Supabase secrets.

```bash
SUPABASE_VAULT_PATH="apps/prisma-glow-prod/supabase"
```

### SUPABASE_SERVICE_ROLE_VAULT_FIELD
**Required:** No  
**Default:** `service_role_key`  
**Description:** Vault field name for service role key.

```bash
SUPABASE_SERVICE_ROLE_VAULT_FIELD="service_role_key"
```

### SUPABASE_JWT_VAULT_FIELD
**Required:** No  
**Default:** `jwt_secret`  
**Description:** Vault field name for JWT secret.

```bash
SUPABASE_JWT_VAULT_FIELD="jwt_secret"
```

### NEXT_PUBLIC_SUPABASE_URL
**Required:** Yes (client-side)  
**Description:** Supabase URL for browser clients (mirrors SUPABASE_URL).

```bash
NEXT_PUBLIC_SUPABASE_URL="https://abcdefghijklmnop.supabase.co"
```

### NEXT_PUBLIC_SUPABASE_ANON_KEY
**Required:** Yes (client-side)  
**Format:** JWT token  
**Description:** Supabase anonymous (public) key for browser access.

```bash
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Security:** This key is public. Protect data with RLS policies.

### VITE_SUPABASE_URL
**Required:** No (legacy Vite app only)  
**Description:** Supabase URL for legacy Vite client.

```bash
VITE_SUPABASE_URL="https://abcdefghijklmnop.supabase.co"
```

### VITE_SUPABASE_PROJECT_ID
**Required:** No (legacy)  
**Description:** Supabase project ID.

```bash
VITE_SUPABASE_PROJECT_ID="abcdefghijklmnop"
```

### VITE_SUPABASE_PUBLISHABLE_KEY
**Required:** No (legacy)  
**Description:** Legacy name for anonymous key.

```bash
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 4. OpenAI & AI Platform Configuration

### OPENAI_API_KEY
**Required:** Yes  
**Format:** `sk-proj-...` or `sk-...`  
**Description:** OpenAI API key for GPT, embeddings, and file search.

```bash
OPENAI_API_KEY="sk-proj-abc123..."
```

**Security:**
- Store in secrets manager
- Use project-scoped keys (sk-proj-*)
- Rotate every 90 days
- Monitor usage in OpenAI dashboard

### OPENAI_RPM
**Required:** No  
**Default:** `60`  
**Type:** Integer  
**Description:** OpenAI requests per minute rate limit.

```bash
OPENAI_RPM="60"
```

**Note:** Enforce client-side rate limiting to avoid 429 errors.

### OPENAI_WEB_SEARCH_ENABLED
**Required:** No  
**Default:** `false`  
**Values:** `true`, `false`  
**Description:** Enable OpenAI web search capability.

```bash
OPENAI_WEB_SEARCH_ENABLED="true"
```

### OPENAI_WEB_SEARCH_MODEL
**Required:** No  
**Default:** `gpt-4.1-mini`  
**Values:** `gpt-4`, `gpt-4.1-mini`, etc.  
**Description:** Model for web search queries.

```bash
OPENAI_WEB_SEARCH_MODEL="gpt-4.1-mini"
```

### WEB_FETCH_CACHE_RETENTION_DAYS
**Required:** No  
**Default:** `14`  
**Type:** Integer  
**Description:** Days to retain cached web search results.

```bash
WEB_FETCH_CACHE_RETENTION_DAYS="14"
```

### OPENAI_DEBUG_LOGGING
**Required:** No  
**Default:** `false`  
**Values:** `true`, `false`  
**Description:** Enable verbose OpenAI SDK logging.

```bash
OPENAI_DEBUG_LOGGING="true"
```

### OPENAI_DEBUG_FETCH_DETAILS
**Required:** No  
**Default:** `false`  
**Values:** `true`, `false`  
**Description:** Log OpenAI HTTP request/response details.

```bash
OPENAI_DEBUG_FETCH_DETAILS="true"
```

### OPENAI_AGENT_PLATFORM_ENABLED
**Required:** No  
**Default:** `false`  
**Values:** `true`, `false`  
**Description:** Enable OpenAI Agents platform (beta).

```bash
OPENAI_AGENT_PLATFORM_ENABLED="true"
```

### OPENAI_AGENT_ID
**Required:** No (if agent platform enabled)  
**Format:** `agent_<id>`  
**Description:** OpenAI agent instance ID.

```bash
OPENAI_AGENT_ID="agent_abc123def456"
```

### OPENAI_STREAMING_ENABLED
**Required:** No  
**Default:** `false`  
**Values:** `true`, `false`  
**Description:** Enable streaming responses for chat completions.

```bash
OPENAI_STREAMING_ENABLED="true"
```

### OPENAI_REALTIME_ENABLED
**Required:** No  
**Default:** `false`  
**Values:** `true`, `false`  
**Description:** Enable OpenAI Realtime API for voice.

```bash
OPENAI_REALTIME_ENABLED="true"
```

### OPENAI_REALTIME_MODEL
**Required:** No (if realtime enabled)  
**Default:** `gpt-4o-realtime-preview`  
**Description:** Model for realtime voice interactions.

```bash
OPENAI_REALTIME_MODEL="gpt-4o-realtime-preview"
```

### OPENAI_REALTIME_VOICE
**Required:** No  
**Default:** `verse`  
**Values:** `alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer`, `verse`  
**Description:** Voice preset for realtime audio.

```bash
OPENAI_REALTIME_VOICE="verse"
```

### OPENAI_REALTIME_TURN_SERVERS
**Required:** No  
**Format:** JSON array or comma-delimited  
**Description:** TURN servers for WebRTC connections.

```bash
OPENAI_REALTIME_TURN_SERVERS="stun:stun.example.com:3478,turn:turn.example.com:3478"
```

### OPENAI_TRANSCRIPTION_MODEL
**Required:** No  
**Default:** `gpt-4o-mini-transcribe`  
**Description:** Model for audio transcription.

```bash
OPENAI_TRANSCRIPTION_MODEL="gpt-4o-mini-transcribe"
```

### OPENAI_TTS_MODEL
**Required:** No  
**Default:** `gpt-4o-mini-tts`  
**Description:** Model for text-to-speech.

```bash
OPENAI_TTS_MODEL="gpt-4o-mini-tts"
```

### OPENAI_TTS_VOICE
**Required:** No  
**Default:** `alloy`  
**Values:** `alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer`  
**Description:** TTS voice preset.

```bash
OPENAI_TTS_VOICE="alloy"
```

### OPENAI_TTS_FORMAT
**Required:** No  
**Default:** `mp3`  
**Values:** `mp3`, `opus`, `aac`, `flac`  
**Description:** TTS audio format.

```bash
OPENAI_TTS_FORMAT="mp3"
```

### OPENAI_STREAMING_TOOL_ENABLED
**Required:** No  
**Default:** `false`  
**Values:** `true`, `false`  
**Description:** Enable streaming for tool calls.

```bash
OPENAI_STREAMING_TOOL_ENABLED="true"
```

### OPENAI_SORA_ENABLED
**Required:** No  
**Default:** `false`  
**Values:** `true`, `false`  
**Description:** Enable OpenAI Sora (video generation).

```bash
OPENAI_SORA_ENABLED="true"
```

### OPENAI_SORA_MODEL
**Required:** No (if Sora enabled)  
**Default:** `sora-2`  
**Description:** Sora model version.

```bash
OPENAI_SORA_MODEL="sora-2"
```

### OPENAI_SORA_ASPECT_RATIO
**Required:** No  
**Default:** `16:9`  
**Values:** `16:9`, `9:16`, `1:1`, `4:3`, `3:4`  
**Description:** Video aspect ratio for Sora.

```bash
OPENAI_SORA_ASPECT_RATIO="16:9"
```

### OPENAI_ORCHESTRATOR_ENABLED
**Required:** No  
**Default:** `false`  
**Values:** `true`, `false`  
**Description:** Enable agent orchestration service.

```bash
OPENAI_ORCHESTRATOR_ENABLED="true"
```

### ORCHESTRATION_POLL_INTERVAL_MS
**Required:** No (if orchestrator enabled)  
**Default:** `15000`  
**Type:** Integer (milliseconds)  
**Description:** Polling interval for orchestrator status checks.

```bash
ORCHESTRATION_POLL_INTERVAL_MS="15000"
```

### OPENAI_RETRIEVAL_VECTOR_STORE_ID
**Required:** No  
**Format:** `vs_<id>`  
**Description:** OpenAI vector store ID for file search.

```bash
OPENAI_RETRIEVAL_VECTOR_STORE_ID="vs_abc123def456"
```

**Note:** Set either ID or NAME, not both.

### OPENAI_RETRIEVAL_VECTOR_STORE_NAME
**Required:** No  
**Description:** OpenAI vector store name (alternative to ID).

```bash
OPENAI_RETRIEVAL_VECTOR_STORE_NAME="prisma-glow-knowledge"
```

### OPENAI_FILE_SEARCH_VECTOR_STORE_ID
**Required:** No  
**Format:** `vs_<id>`  
**Description:** Hosted file search vector store ID.

```bash
OPENAI_FILE_SEARCH_VECTOR_STORE_ID="vs_xyz789"
```

### OPENAI_FILE_SEARCH_MODEL
**Required:** No  
**Default:** `gpt-4.1-mini`  
**Description:** Model for file search queries.

```bash
OPENAI_FILE_SEARCH_MODEL="gpt-4.1-mini"
```

### OPENAI_FILE_SEARCH_MAX_RESULTS
**Required:** No  
**Default:** `8`  
**Type:** Integer (1-50)  
**Description:** Maximum search results returned.

```bash
OPENAI_FILE_SEARCH_MAX_RESULTS="8"
```

### OPENAI_FILE_SEARCH_FILTERS
**Required:** No  
**Format:** JSON object  
**Description:** Metadata filters for file search.

```bash
OPENAI_FILE_SEARCH_FILTERS='{"orgId":"org_123","repoFolder":"02_Tax"}'
```

### OPENAI_FILE_SEARCH_INCLUDE_RESULTS
**Required:** No  
**Default:** `true`  
**Values:** `true`, `false`  
**Description:** Include search results in response.

```bash
OPENAI_FILE_SEARCH_INCLUDE_RESULTS="true"
```

### EMBEDDING_MODEL
**Required:** No  
**Default:** `text-embedding-3-small`  
**Values:** `text-embedding-3-small`, `text-embedding-3-large`  
**Description:** Embedding model for RAG ingestion.

```bash
EMBEDDING_MODEL="text-embedding-3-large"
```

### CHAT_MODEL
**Required:** No  
**Default:** `gpt-4o-mini`  
**Values:** `gpt-4`, `gpt-4o`, `gpt-4o-mini`, `gpt-4.1-mini`  
**Description:** Chat completion model for agents.

```bash
CHAT_MODEL="gpt-4o-mini"
```

---

## 5. Gateway / API Platform Configuration

### API_BASE_URL
**Required:** Yes  
**Format:** `http://host:port` or `https://domain`  
**Description:** Gateway API base URL for server-side requests.

```bash
API_BASE_URL="https://api.prismaglow.com"
```

### FASTAPI_BASE_URL
**Required:** Yes  
**Format:** `http://host:port` or `https://domain`  
**Description:** FastAPI backend base URL.

```bash
FASTAPI_BASE_URL="https://backend.internal:8000"
```

### API_ALLOWED_ORIGINS
**Required:** No  
**Default:** `*` (development only)  
**Format:** Comma-separated list  
**Description:** CORS allowed origins.

```bash
API_ALLOWED_ORIGINS="https://app.prismaglow.com,https://admin.prismaglow.com"
```

**Production:** Restrict to specific origins. Never use `*`.

### ALLOWED_HOSTS
**Required:** No  
**Format:** Comma-separated hostnames  
**Description:** Allowed Host headers for CSRF protection.

```bash
ALLOWED_HOSTS="app.prismaglow.com,www.prismaglow.com"
```

### REDIS_URL
**Required:** No (recommended for production)  
**Format:** `redis://host:port` or `rediss://host:port`  
**Description:** Redis connection string for caching and rate limiting.

```bash
REDIS_URL="rediss://redis.internal:6379?tls_cert_file=/certs/redis.crt"
```

**Production:** Use TLS (`rediss://`) and authentication.

### CACHE_DEFAULT_TTL_SECONDS
**Required:** No  
**Default:** `60`  
**Type:** Integer (seconds)  
**Description:** Default cache TTL.

```bash
CACHE_DEFAULT_TTL_SECONDS="60"
```

### CACHE_CONTROLS_TTL_SECONDS
**Required:** No  
**Default:** `45`  
**Type:** Integer (seconds)  
**Description:** Cache TTL for control data (low-churn).

```bash
CACHE_CONTROLS_TTL_SECONDS="45"
```

### CACHE_GROUP_COMPONENTS_TTL_SECONDS
**Required:** No  
**Default:** `120`  
**Type:** Integer (seconds)  
**Description:** Cache TTL for group components.

```bash
CACHE_GROUP_COMPONENTS_TTL_SECONDS="120"
```

### CACHE_OTHER_INFORMATION_TTL_SECONDS
**Required:** No  
**Default:** `90`  
**Type:** Integer (seconds)  
**Description:** Cache TTL for miscellaneous data.

```bash
CACHE_OTHER_INFORMATION_TTL_SECONDS="90"
```

### CACHE_SPECIALISTS_TTL_SECONDS
**Required:** No  
**Default:** `180`  
**Type:** Integer (seconds)  
**Description:** Cache TTL for specialist data.

```bash
CACHE_SPECIALISTS_TTL_SECONDS="180"
```

### GATEWAY_API_KEYS
**Required:** No (production-recommended)  
**Format:** Comma-separated API keys  
**Description:** API keys for gateway authentication.

```bash
GATEWAY_API_KEYS="key_abc123,key_def456"
```

**Security:**
- Generate with `openssl rand -hex 32`
- Rotate every 90 days
- Use separate keys per service

### API_KEYS
**Required:** No  
**Description:** Legacy API keys (alias for GATEWAY_API_KEYS).

```bash
API_KEYS="key_abc123,key_def456"
```

### AGENT_SERVICE_URL
**Required:** No  
**Format:** `https://host:port`  
**Description:** Agent orchestration service URL.

```bash
AGENT_SERVICE_URL="https://agent-service.internal:8001"
```

### AGENT_SERVICE_API_KEY
**Required:** No (if agent service used)  
**Description:** API key for agent service authentication.

```bash
AGENT_SERVICE_API_KEY="agent-key-abc123"
```

### RAG_SERVICE_URL
**Required:** No  
**Format:** `https://host:port`  
**Description:** RAG service URL.

```bash
RAG_SERVICE_URL="https://rag-service.internal:8002"
```

### RAG_SERVICE_API_KEY
**Required:** No (if RAG service used)  
**Description:** API key for RAG service authentication.

```bash
RAG_SERVICE_API_KEY="rag-key-def456"
```

### AUTOMATION_WEBHOOK_SECRET
**Required:** No  
**Description:** Secret for automation webhook signatures.

```bash
AUTOMATION_WEBHOOK_SECRET="$(openssl rand -hex 32)"
```

### N8N_WEBHOOK_SECRET
**Required:** No (if n8n integration used)  
**Description:** Secret for n8n webhook authentication.

```bash
N8N_WEBHOOK_SECRET="n8n-secret-abc123"
```

### EMBEDDING_CRON_SECRET
**Required:** No (if embedding automation used)  
**Description:** Secret for embedding cron job authentication.

```bash
EMBEDDING_CRON_SECRET="$(openssl rand -hex 32)"
```

### EMBEDDING_DELTA_LOOKBACK_HOURS
**Required:** No  
**Default:** `24`  
**Type:** Integer  
**Description:** Hours to look back for delta embedding updates.

```bash
EMBEDDING_DELTA_LOOKBACK_HOURS="24"
```

### EMBEDDING_DELTA_DOCUMENT_LIMIT
**Required:** No  
**Default:** `50`  
**Type:** Integer  
**Description:** Max documents per delta embedding batch.

```bash
EMBEDDING_DELTA_DOCUMENT_LIMIT="50"
```

### EMBEDDING_DELTA_POLICY_LIMIT
**Required:** No  
**Default:** `25`  
**Type:** Integer  
**Description:** Max policies per delta embedding batch.

```bash
EMBEDDING_DELTA_POLICY_LIMIT="25"
```

### TELEMETRY_ALERT_WEBHOOK
**Required:** No  
**Format:** `https://hooks.example.com/telemetry`  
**Description:** Webhook URL for telemetry alerts.

```bash
TELEMETRY_ALERT_WEBHOOK="https://hooks.slack.com/services/T00/B00/xxx"
```

### EMBEDDING_ALERT_WEBHOOK
**Required:** No  
**Format:** `https://hooks.example.com/embedding`  
**Description:** Webhook URL for embedding job alerts.

```bash
EMBEDDING_ALERT_WEBHOOK="https://hooks.slack.com/services/T00/B00/yyy"
```

### SIGNED_URL_DEFAULT_TTL_SECONDS
**Required:** No  
**Default:** `300`  
**Type:** Integer (seconds)  
**Description:** Default TTL for signed URLs.

```bash
SIGNED_URL_DEFAULT_TTL_SECONDS="300"
```

### SIGNED_URL_EVIDENCE_TTL_SECONDS
**Required:** No  
**Default:** `300`  
**Type:** Integer (seconds)  
**Description:** TTL for evidence document signed URLs.

```bash
SIGNED_URL_EVIDENCE_TTL_SECONDS="300"
```

### API_RATE_LIMIT
**Required:** No  
**Default:** `60`  
**Type:** Integer  
**Description:** Global API rate limit (requests per window).

```bash
API_RATE_LIMIT="60"
```

### API_RATE_WINDOW_SECONDS
**Required:** No  
**Default:** `60`  
**Type:** Integer (seconds)  
**Description:** Rate limit window duration.

```bash
API_RATE_WINDOW_SECONDS="60"
```

### RATE_LIMIT_ALERT_WEBHOOK
**Required:** No  
**Format:** `https://hooks.example.com/rate-limit`  
**Description:** Webhook for rate limit alerts.

```bash
RATE_LIMIT_ALERT_WEBHOOK="https://hooks.slack.com/services/T00/B00/zzz"
```

### ERROR_NOTIFY_WEBHOOK
**Required:** No  
**Format:** `https://hooks.example.com/errors`  
**Description:** Webhook for critical error notifications.

```bash
ERROR_NOTIFY_WEBHOOK="https://hooks.slack.com/services/T00/B00/aaa"
```

---

## 6. Rate Limiting Configuration

### ASSISTANT_RATE_LIMIT
**Required:** No  
**Default:** `20`  
**Type:** Integer  
**Description:** Assistant API requests per window.

```bash
ASSISTANT_RATE_LIMIT="20"
```

### ASSISTANT_RATE_WINDOW_SECONDS
**Required:** No  
**Default:** `60`  
**Type:** Integer (seconds)  
**Description:** Assistant rate limit window.

```bash
ASSISTANT_RATE_WINDOW_SECONDS="60"
```

### DOCUMENT_UPLOAD_RATE_LIMIT
**Required:** No  
**Default:** `12`  
**Type:** Integer  
**Description:** Document uploads per window.

```bash
DOCUMENT_UPLOAD_RATE_LIMIT="12"
```

### DOCUMENT_UPLOAD_RATE_WINDOW_SECONDS
**Required:** No  
**Default:** `300`  
**Type:** Integer (seconds)  
**Description:** Document upload window (5 minutes).

```bash
DOCUMENT_UPLOAD_RATE_WINDOW_SECONDS="300"
```

### KNOWLEDGE_RUN_RATE_LIMIT
**Required:** No  
**Default:** `6`  
**Type:** Integer  
**Description:** Knowledge base runs per window.

```bash
KNOWLEDGE_RUN_RATE_LIMIT="6"
```

### KNOWLEDGE_RUN_RATE_WINDOW_SECONDS
**Required:** No  
**Default:** `900`  
**Type:** Integer (seconds)  
**Description:** Knowledge run window (15 minutes).

```bash
KNOWLEDGE_RUN_RATE_WINDOW_SECONDS="900"
```

### KNOWLEDGE_PREVIEW_RATE_LIMIT
**Required:** No  
**Default:** `30`  
**Type:** Integer  
**Description:** Knowledge preview requests per window.

```bash
KNOWLEDGE_PREVIEW_RATE_LIMIT="30"
```

### KNOWLEDGE_PREVIEW_RATE_WINDOW_SECONDS
**Required:** No  
**Default:** `300`  
**Type:** Integer (seconds)  
**Description:** Knowledge preview window.

```bash
KNOWLEDGE_PREVIEW_RATE_WINDOW_SECONDS="300"
```

### RAG_INGEST_RATE_LIMIT
**Required:** No  
**Default:** `5`  
**Type:** Integer  
**Description:** RAG ingest jobs per window.

```bash
RAG_INGEST_RATE_LIMIT="5"
```

### RAG_INGEST_RATE_WINDOW_SECONDS
**Required:** No  
**Default:** `600`  
**Type:** Integer (seconds)  
**Description:** RAG ingest window (10 minutes).

```bash
RAG_INGEST_RATE_WINDOW_SECONDS="600"
```

### RAG_REEMBED_RATE_LIMIT
**Required:** No  
**Default:** `5`  
**Type:** Integer  
**Description:** RAG re-embedding jobs per window.

```bash
RAG_REEMBED_RATE_LIMIT="5"
```

### RAG_REEMBED_RATE_WINDOW_SECONDS
**Required:** No  
**Default:** `600`  
**Type:** Integer (seconds)  
**Description:** RAG re-embed window.

```bash
RAG_REEMBED_RATE_WINDOW_SECONDS="600"
```

### RAG_SEARCH_RATE_LIMIT
**Required:** No  
**Default:** `40`  
**Type:** Integer  
**Description:** RAG search queries per window.

```bash
RAG_SEARCH_RATE_LIMIT="40"
```

### RAG_SEARCH_RATE_WINDOW_SECONDS
**Required:** No  
**Default:** `60`  
**Type:** Integer (seconds)  
**Description:** RAG search window.

```bash
RAG_SEARCH_RATE_WINDOW_SECONDS="60"
```

### AUTOPILOT_SCHEDULE_RATE_LIMIT
**Required:** No  
**Default:** `10`  
**Type:** Integer  
**Description:** Autopilot schedule requests per window.

```bash
AUTOPILOT_SCHEDULE_RATE_LIMIT="10"
```

### AUTOPILOT_SCHEDULE_RATE_WINDOW_SECONDS
**Required:** No  
**Default:** `600`  
**Type:** Integer (seconds)  
**Description:** Autopilot schedule window.

```bash
AUTOPILOT_SCHEDULE_RATE_WINDOW_SECONDS="600"
```

### AUTOPILOT_JOB_RATE_LIMIT
**Required:** No  
**Default:** `20`  
**Type:** Integer  
**Description:** Autopilot job executions per window.

```bash
AUTOPILOT_JOB_RATE_LIMIT="20"
```

### AUTOPILOT_JOB_RATE_WINDOW_SECONDS
**Required:** No  
**Default:** `600`  
**Type:** Integer (seconds)  
**Description:** Autopilot job window.

```bash
AUTOPILOT_JOB_RATE_WINDOW_SECONDS="600"
```

---

## 7. Authentication & External Services

### AUTH_CLIENT_ID
**Required:** No (if OAuth used)  
**Description:** OAuth client ID for third-party auth.

```bash
AUTH_CLIENT_ID="client_abc123"
```

### AUTH_CLIENT_SECRET
**Required:** No (if OAuth used)  
**Description:** OAuth client secret.

```bash
AUTH_CLIENT_SECRET="secret_def456"
```

**Security:** Store in secrets manager.

### AUTH_ISSUER
**Required:** No (if OAuth used)  
**Format:** `https://auth.example.com`  
**Description:** OAuth issuer URL.

```bash
AUTH_ISSUER="https://auth.prismaglow.com"
```

### SAMPLING_C1_BASE_URL
**Required:** No (if sampling service used)  
**Format:** `http://host:port/api/sampling`  
**Description:** Sampling service base URL.

```bash
SAMPLING_C1_BASE_URL="https://sampling.internal:4005/api/sampling"
```

### SAMPLING_C1_API_KEY
**Required:** No (if sampling service used)  
**Description:** Sampling service API key.

```bash
SAMPLING_C1_API_KEY="sampling-key-abc123"
```

### ALLOW_DEMO_BOOTSTRAP
**Required:** No  
**Default:** `false`  
**Values:** `true`, `false`  
**Description:** Allow demo data bootstrap.

```bash
ALLOW_DEMO_BOOTSTRAP="true"
```

**Production:** Must be `false`.

### DEMO_BOOTSTRAP_AUTH_TOKEN
**Required:** No (if demo bootstrap enabled)  
**Description:** Auth token for demo bootstrap endpoint.

```bash
DEMO_BOOTSTRAP_AUTH_TOKEN="$(openssl rand -hex 32)"
```

### SEED_DATA_AUTH_TOKEN
**Required:** No (if seed data endpoint used)  
**Description:** Auth token for seed data endpoint.

```bash
SEED_DATA_AUTH_TOKEN="$(openssl rand -hex 32)"
```

### VITE_ENABLE_CAPTCHA
**Required:** No  
**Default:** `false`  
**Values:** `true`, `false`  
**Description:** Enable CAPTCHA on forms.

```bash
VITE_ENABLE_CAPTCHA="true"
```

### VITE_ENABLE_PWNED_PASSWORD_CHECK
**Required:** No  
**Default:** `true`  
**Values:** `true`, `false`  
**Description:** Check passwords against HaveIBeenPwned.

```bash
VITE_ENABLE_PWNED_PASSWORD_CHECK="true"
```

### VITE_TURNSTILE_SITE_KEY
**Required:** No (if Turnstile CAPTCHA used)  
**Description:** Cloudflare Turnstile site key (public).

```bash
VITE_TURNSTILE_SITE_KEY="0x4AAAA..."
```

### NEXT_PUBLIC_TURNSTILE_SITE_KEY
**Required:** No (if Turnstile used in Next.js)  
**Description:** Turnstile site key for Next.js client.

```bash
NEXT_PUBLIC_TURNSTILE_SITE_KEY="0x4AAAA..."
```

### TURNSTILE_SECRET_KEY
**Required:** No (if Turnstile used)  
**Description:** Turnstile secret key for server-side verification.

```bash
TURNSTILE_SECRET_KEY="0x4BBBB..."
```

**Security:** Store in secrets manager.

### SMTP_HOST
**Required:** No (if email used)  
**Description:** SMTP server hostname.

```bash
SMTP_HOST="smtp.sendgrid.net"
```

### SMTP_PORT
**Required:** No  
**Default:** `587`  
**Type:** Integer  
**Description:** SMTP server port.

```bash
SMTP_PORT="587"
```

### SMTP_USERNAME
**Required:** No (if SMTP auth required)  
**Description:** SMTP username.

```bash
SMTP_USERNAME="apikey"
```

### SMTP_PASSWORD
**Required:** No (if SMTP auth required)  
**Description:** SMTP password or API key.

```bash
SMTP_PASSWORD="SG.abc123..."
```

**Security:** Store in secrets manager.

### SMTP_FROM_EMAIL
**Required:** No  
**Default:** `no-reply@prismaglow.com`  
**Description:** From email address.

```bash
SMTP_FROM_EMAIL="no-reply@prismaglow.com"
```

### SMTP_FROM_NAME
**Required:** No  
**Default:** `Prisma Glow`  
**Description:** From name.

```bash
SMTP_FROM_NAME="Prisma Glow"
```

### SMTP_USE_SSL
**Required:** No  
**Default:** `false`  
**Values:** `true`, `false`  
**Description:** Use SSL for SMTP.

```bash
SMTP_USE_SSL="false"
```

### SMTP_USE_STARTTLS
**Required:** No  
**Default:** `true`  
**Values:** `true`, `false`  
**Description:** Use STARTTLS for SMTP.

```bash
SMTP_USE_STARTTLS="true"
```

### SMTP_TIMEOUT_SECONDS
**Required:** No  
**Default:** `10`  
**Type:** Integer (seconds)  
**Description:** SMTP connection timeout.

```bash
SMTP_TIMEOUT_SECONDS="10"
```

### INVITE_ACCEPT_BASE_URL
**Required:** No  
**Format:** `https://host/path`  
**Description:** Base URL for invite acceptance links.

```bash
INVITE_ACCEPT_BASE_URL="https://app.prismaglow.com/auth/accept-invite"
```

---

## 8. Google Integrations

### GOOGLE_SERVICE_ACCOUNT_KEY_PATH
**Required:** No (if Google Sheets used)  
**Format:** `./path/to/key.json`  
**Description:** Path to Google service account key.

```bash
GOOGLE_SERVICE_ACCOUNT_KEY_PATH="./secrets/google-sa.json"
```

**Security:** Store key JSON in secrets manager, not file system.

### GOOGLE_SHEET_ID
**Required:** No (if Google Sheets used)  
**Description:** Google Sheet ID for data export.

```bash
GOOGLE_SHEET_ID="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
```

### GDRIVE_FOLDER_ID
**Required:** No (if Google Drive ingestion used)  
**Description:** Google Drive folder ID for ingestion.

```bash
GDRIVE_FOLDER_ID="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74Ogv"
```

### GDRIVE_SHARED_DRIVE_ID
**Required:** No (if shared drive used)  
**Description:** Google Shared Drive ID.

```bash
GDRIVE_SHARED_DRIVE_ID="0AEYzLj2kqQ..."
```

### GDRIVE_SERVICE_ACCOUNT_EMAIL
**Required:** No (if Google Drive used)  
**Description:** Service account email for Drive access.

```bash
GDRIVE_SERVICE_ACCOUNT_EMAIL="svc-drive@project.iam.gserviceaccount.com"
```

### GDRIVE_SERVICE_ACCOUNT_KEY
**Required:** No (if Google Drive used)  
**Format:** JSON string  
**Description:** Service account private key JSON.

```bash
GDRIVE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
```

**Security:** Store in secrets manager as JSON string.

### GDRIVE_WATCH_CHANNEL_TOKEN
**Required:** No (if Drive watch API used)  
**Description:** Token for Drive watch channel verification.

```bash
GDRIVE_WATCH_CHANNEL_TOKEN="$(openssl rand -hex 32)"
```

---

## 9. Encryption & Secrets Management

### SUPABASE_ENCRYPTION_PROVIDER
**Required:** No (production-recommended)  
**Default:** `aws`  
**Values:** `aws`, `gcp`, `azure`  
**Description:** Encryption provider for Supabase data.

```bash
SUPABASE_ENCRYPTION_PROVIDER="aws"
```

### SUPABASE_ENCRYPTION_KEY_REFERENCE
**Required:** No (if encryption provider set)  
**Format:** Provider-specific key ARN/ID  
**Description:** Reference to encryption key.

```bash
SUPABASE_ENCRYPTION_KEY_REFERENCE="arn:aws:kms:us-east-1:123456789:key/abc-123"
```

### OBJECT_STORAGE_ENCRYPTION_PROVIDER
**Required:** No  
**Default:** `aws`  
**Values:** `aws`, `gcp`, `azure`  
**Description:** Encryption provider for object storage.

```bash
OBJECT_STORAGE_ENCRYPTION_PROVIDER="aws"
```

### OBJECT_STORAGE_ENCRYPTION_KEY_REFERENCE
**Required:** No (if provider set)  
**Description:** Object storage encryption key reference.

```bash
OBJECT_STORAGE_ENCRYPTION_KEY_REFERENCE="arn:aws:kms:us-east-1:123456789:key/def-456"
```

### JOB_QUEUE_ENCRYPTION_PROVIDER
**Required:** No  
**Default:** `aws`  
**Values:** `aws`, `gcp`, `azure`  
**Description:** Encryption provider for job queue.

```bash
JOB_QUEUE_ENCRYPTION_PROVIDER="aws"
```

### JOB_QUEUE_ENCRYPTION_KEY_REFERENCE
**Required:** No (if provider set)  
**Description:** Job queue encryption key reference.

```bash
JOB_QUEUE_ENCRYPTION_KEY_REFERENCE="arn:aws:kms:us-east-1:123456789:key/ghi-789"
```

### VAULT_ADDR
**Required:** No (if HashiCorp Vault used)  
**Format:** `https://host:port`  
**Description:** Vault server address.

```bash
VAULT_ADDR="https://vault.internal:8200"
```

### VAULT_TOKEN
**Required:** No (if Vault used)  
**Description:** Vault authentication token.

```bash
VAULT_TOKEN="hvs.abc123..."
```

**Security:** Use short-lived tokens. Rotate frequently.

### VAULT_KV_MOUNT
**Required:** No  
**Default:** `secret`  
**Description:** Vault KV mount path.

```bash
VAULT_KV_MOUNT="secret"
```

---

## 10. Client Configuration

### NEXT_PUBLIC_API_BASE
**Required:** Yes (client-side)  
**Format:** `https://host`  
**Description:** API base URL for browser requests.

```bash
NEXT_PUBLIC_API_BASE="https://api.prismaglow.com"
```

### NEXT_PUBLIC_ACCOUNTING_MODE
**Required:** No  
**Default:** `close`  
**Values:** `close`, `forecast`, `audit`  
**Description:** Default accounting console mode.

```bash
NEXT_PUBLIC_ACCOUNTING_MODE="close"
```

### NEXT_PUBLIC_RECONCILIATION_MODE
**Required:** No  
**Default:** `db`  
**Values:** `db`, `memory`  
**Description:** Client-side reconciliation mode hint.

```bash
NEXT_PUBLIC_RECONCILIATION_MODE="db"
```

### NEXT_PUBLIC_GROUP_AUDIT_MODE
**Required:** No  
**Default:** `workspace`  
**Values:** `workspace`, `component`  
**Description:** Group audit mode.

```bash
NEXT_PUBLIC_GROUP_AUDIT_MODE="workspace"
```

### NEXT_PUBLIC_DEMO_ORG_ID
**Required:** No  
**Description:** Demo organization ID for testing.

```bash
NEXT_PUBLIC_DEMO_ORG_ID="00000000-0000-0000-0000-000000000000"
```

### NEXT_PUBLIC_DEMO_ENGAGEMENT_ID
**Required:** No  
**Description:** Demo engagement ID.

```bash
NEXT_PUBLIC_DEMO_ENGAGEMENT_ID="demo-engagement-123"
```

### NEXT_PUBLIC_DEMO_USER_ID
**Required:** No  
**Description:** Demo user ID.

```bash
NEXT_PUBLIC_DEMO_USER_ID="demo-user-456"
```

### VITE_API_BASE_URL
**Required:** No (legacy)  
**Description:** API base for legacy Vite app.

```bash
VITE_API_BASE_URL="https://api.prismaglow.com"
```

### ADMIN_HOSTNAME
**Required:** No  
**Description:** Admin panel hostname.

```bash
ADMIN_HOSTNAME="admin.prismaglow.com"
```

### VITE_ENABLE_DEMO_LOGIN
**Required:** No  
**Default:** `false`  
**Values:** `true`, `false`  
**Description:** Enable demo login button.

```bash
VITE_ENABLE_DEMO_LOGIN="false"
```

**Production:** Must be `false`.

### VITE_ENABLE_PWA
**Required:** No  
**Default:** `true`  
**Values:** `true`, `false`  
**Description:** Enable PWA features.

```bash
VITE_ENABLE_PWA="true"
```

### VITE_TRACKING_ENABLED
**Required:** No  
**Default:** `true`  
**Values:** `true`, `false`  
**Description:** Enable analytics tracking.

```bash
VITE_TRACKING_ENABLED="true"
```

---

## 11. Testing & Performance Configuration

### PERF_BASE_URL
**Required:** No (testing only)  
**Format:** `http://host:port`  
**Description:** Base URL for performance tests.

```bash
PERF_BASE_URL="http://localhost:3000"
```

### PERF_EMAIL
**Required:** No (if performance tests used)  
**Description:** Test user email.

```bash
PERF_EMAIL="load.user@example.com"
```

### PERF_PASSWORD
**Required:** No (if performance tests used)  
**Description:** Test user password.

```bash
PERF_PASSWORD="password123"
```

### PERF_ORG_SLUG
**Required:** No  
**Description:** Test organization slug.

```bash
PERF_ORG_SLUG="demo"
```

### PERF_ENGAGEMENT_ID
**Required:** No  
**Description:** Test engagement ID.

```bash
PERF_ENGAGEMENT_ID="demo-engagement"
```

### PERF_AUTH_TOKEN
**Required:** No  
**Description:** Static JWT for performance tests (skip login).

```bash
PERF_AUTH_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### PERF_SUPABASE_SERVICE_KEY
**Required:** No  
**Description:** Supabase service key for performance test setup.

```bash
PERF_SUPABASE_SERVICE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### PERF_AGENT_TYPE
**Required:** No  
**Default:** `audit-assistant`  
**Description:** Agent type for performance tests.

```bash
PERF_AGENT_TYPE="audit-assistant"
```

### PERF_AGENT_PROMPT
**Required:** No  
**Description:** Test prompt for agent performance tests.

```bash
PERF_AGENT_PROMPT="Summarise the engagement status for the manager."
```

### DEFAULT_ORG_ID
**Required:** No (development only)  
**Description:** Default organization ID for testing.

```bash
DEFAULT_ORG_ID="00000000-0000-0000-0000-000000000000"
```

---

## 12. CSP Overrides (Optional)

### CSP_ADDITIONAL_CONNECT_SRC
**Required:** No  
**Format:** Space-separated origins  
**Description:** Additional CSP connect-src origins.

```bash
CSP_ADDITIONAL_CONNECT_SRC="https://api.third-party.com https://cdn.example.com"
```

### CSP_ADDITIONAL_IMG_SRC
**Required:** No  
**Format:** Space-separated origins  
**Description:** Additional CSP img-src origins.

```bash
CSP_ADDITIONAL_IMG_SRC="https://cdn.example.com https://images.example.com"
```

---

## Security Best Practices

### Secret Rotation Schedule
- **Supabase Keys:** 90 days
- **OpenAI API Key:** 90 days
- **Session Cookie Secret:** 90 days
- **Service API Keys:** 90 days
- **OAuth Secrets:** 180 days
- **Encryption Keys:** 365 days (with key rotation, not immediate replacement)

### Secrets Management
1. **Never commit secrets to version control**
2. **Use secrets manager:** HashiCorp Vault, AWS Secrets Manager, or equivalent
3. **Rotate on schedule:** Automate rotation where possible
4. **Audit access:** Log all secret retrievals
5. **Principle of least privilege:** Grant minimal required permissions

### Environment-Specific Recommendations

#### Development
- Use `.env.local` (gitignored)
- Keep secrets separate from `.env.example`
- Use demo/test API keys where possible

#### Staging
- Mirror production configuration
- Use separate database/Supabase project
- Enable verbose logging for debugging

#### Production
- Load from secrets manager only
- Never use `.env` files in production
- Enable all security features (HSTS, CSP, secure cookies)
- Restrict CORS to specific origins
- Use TLS for all external connections

---

## Validation

### Required Variables Check
```bash
#!/bin/bash
required=(
  "DATABASE_URL"
  "SUPABASE_URL"
  "SUPABASE_SERVICE_ROLE_KEY"
  "NEXT_PUBLIC_SUPABASE_URL"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  "OPENAI_API_KEY"
  "SESSION_COOKIE_SECRET"
)

for var in "${required[@]}"; do
  if [ -z "${!var}" ]; then
    echo "ERROR: $var is not set"
    exit 1
  fi
done
echo "All required variables are set"
```

### Variable Format Validation
```javascript
// examples/validate-env.js
const validators = {
  DATABASE_URL: (v) => v.startsWith('postgresql://'),
  SUPABASE_URL: (v) => v.startsWith('https://') && v.includes('.supabase.co'),
  PORT: (v) => Number.isInteger(+v) && +v > 0 && +v < 65536,
  OPENAI_API_KEY: (v) => v.startsWith('sk-'),
  SESSION_COOKIE_SECRET: (v) => v.length >= 32,
};

Object.entries(validators).forEach(([key, validator]) => {
  const value = process.env[key];
  if (value && !validator(value)) {
    console.error(`Invalid format for ${key}`);
    process.exit(1);
  }
});
```

---

## Troubleshooting

### Common Issues

#### "Database connection failed"
- Check `DATABASE_URL` format
- Verify database is running and accessible
- Test with `psql "$DATABASE_URL"`
- Check firewall/security group rules

#### "Supabase authentication failed"
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- Check key hasn't expired/been rotated
- Validate project URL matches key
- Review Supabase dashboard for API usage

#### "OpenAI rate limit exceeded"
- Check `OPENAI_RPM` setting
- Review OpenAI dashboard for actual limits
- Implement exponential backoff
- Consider upgrading OpenAI tier

#### "Session cookie not persisting"
- Verify `SESSION_COOKIE_SECURE="true"` with HTTPS
- Check `SESSION_COOKIE_SAME_SITE` setting
- Ensure `SESSION_COOKIE_DOMAIN` is correct (or blank)
- Validate `SESSION_COOKIE_SECRET` is set

#### "CORS errors in browser"
- Add origin to `API_ALLOWED_ORIGINS`
- Check for trailing slashes in URLs
- Verify `ALLOWED_HOSTS` includes request hostname
- Review CSP headers

---

## Migration Guide

### From v0.x to v1.0
1. Rename `SUPABASE_KEY` → `SUPABASE_SERVICE_ROLE_KEY`
2. Add `NEXT_PUBLIC_` prefix to client variables
3. Split `SENTRY_DSN` into service-specific DSNs
4. Update Redis URL to use `rediss://` (TLS)
5. Set `SESSION_COOKIE_SECRET` (previously optional)

### Adding New Variables
1. Document in this guide under appropriate category
2. Add to `.env.example` with example value
3. Add to `.env.production.example` if production-relevant
4. Update validation scripts
5. Update CI/CD secrets if needed

---

## Related Documentation

- [SECURITY.md](../SECURITY.md) - Security policies
- [REFACTOR/P8-SECURITY.md](./REFACTOR/P8-SECURITY.md) - Security hardening
- [config/system.yaml](../config/system.yaml) - System configuration
- [docs/deployment/](../docs/deployment/) - Deployment guides

---

## Appendix

### Environment Variable Count by Category
- Core Runtime: 15
- Database: 10
- Supabase: 12
- OpenAI & AI: 25
- Gateway/API: 25
- Authentication: 18
- Caching: 12
- Rate Limiting: 15
- Observability: 18
- Integrations: 15
- Client Config: 12
- Feature Flags: 8
- Testing: 10
- Encryption: 10

**Total:** 205 variables (150+ unique, some have multiple forms)

### Variable Prefixes
- `NEXT_PUBLIC_*` - Next.js client-side (embedded in bundle)
- `VITE_*` - Legacy Vite client-side (embedded in bundle)
- `OTEL_*` - OpenTelemetry standard variables
- `OPENAI_*` - OpenAI platform configuration
- `SUPABASE_*` - Supabase platform configuration
- `SENTRY_*` - Sentry error tracking
- `PERF_*` - Performance testing
- `GDRIVE_*` - Google Drive integration
- `SMTP_*` - Email configuration

### Security Classification
- **SECRET (never log):** API keys, passwords, JWT secrets, service role keys
- **SENSITIVE (mask in logs):** URLs with embedded credentials, email addresses
- **PUBLIC (safe to log):** Ports, feature flags, cache TTLs, rate limits

