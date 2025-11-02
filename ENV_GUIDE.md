# Environment Variables Guide

**Version:** 1.0.0  
**Last Updated:** 2025-11-02  
**Purpose:** Comprehensive guide to all environment variables in the Prisma Glow monorepo

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Environment Files](#environment-files)
3. [Configuration Categories](#configuration-categories)
4. [Security Best Practices](#security-best-practices)
5. [Variable Reference](#variable-reference)
6. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Local Development Setup

1. **Copy the template:**
   ```bash
   cp .env.example .env.local
   ```

2. **Minimal required variables for local development:**
   ```env
   # Core
   NODE_ENV="development"
   PORT="3000"
   
   # Database
   DATABASE_URL="postgresql://user:password@localhost:5432/prisma_glow"
   
   # Supabase (get from Supabase dashboard)
   SUPABASE_URL="https://your-project.supabase.co"
   SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   SUPABASE_JWT_SECRET="your-jwt-secret"
   VITE_SUPABASE_URL="https://your-project.supabase.co"
   VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-key"
   NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
   
   # OpenAI (for AI features)
   OPENAI_API_KEY="sk-your-openai-key"
   
   # Session
   SESSION_COOKIE_SECRET="generate-32-char-secret-here"
   ```

3. **Generate secrets:**
   ```bash
   # Generate session secret
   openssl rand -hex 32
   ```

### Validation

After setting up your `.env.local`, validate with:

```bash
pnpm run config:validate
```

---

## Environment Files

### File Precedence (Highest to Lowest)

1. **`.env.local`** - Local overrides (never committed, in `.gitignore`)
2. **`.env.<NODE_ENV>`** - Environment-specific (development, staging, production)
3. **`.env`** - Base configuration (rarely used, prefer `.env.local`)
4. **Process environment** - System-level variables

### Available Templates

| File | Purpose | When to Use |
|------|---------|-------------|
| `.env.example` | Complete reference | Copy to create `.env.local` |
| `.env.development.example` | Development defaults | Reference for dev setup |
| `.env.production.example` | Production template | Reference for production deployment |
| `.env.performance.example` | Load testing config | Performance/load testing only |

### What Gets Committed

- ✅ `.env.example` - Template with placeholders
- ✅ `.env.*.example` - Environment-specific templates
- ❌ `.env.local` - Your local config (in `.gitignore`)
- ❌ `.env` - If it contains secrets

---

## Configuration Categories

### 1. Core Runtime

Essential variables for application startup:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | ✅ | `development` | Environment: `development`, `staging`, `production` |
| `ENVIRONMENT` | ✅ | `development` | Deployment environment identifier |
| `PORT` | ✅ | `3000` | Primary service port |
| `SERVICE_VERSION` | ⚠️ | `""` | Git commit SHA for release tracking |

**Usage:**
```typescript
import { NODE_ENV } from './config';

if (NODE_ENV === 'production') {
  // Production-specific code
}
```

---

### 2. Database Configuration

PostgreSQL connection and pooling:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | Primary PostgreSQL connection string |
| `DIRECT_URL` | ⚠️ | Optional pooled connection (PgBouncer) |
| `SKIP_HEALTHCHECK_DB` | ❌ | Skip DB health checks (`true`/`false`) |
| `RECONCILIATION_MODE` | ⚠️ | Reconciliation strategy: `db`, `memory` |

**Example:**
```env
DATABASE_URL="postgresql://user:password@localhost:5432/prisma_glow?schema=public"
DIRECT_URL="postgresql://user:password@localhost:5432/prisma_glow?pgbouncer=true"
```

**Connection String Format:**
```
postgresql://[user]:[password]@[host]:[port]/[database]?[params]
```

**Common Parameters:**
- `schema=public` - Default schema
- `pgbouncer=true` - For connection pooling
- `sslmode=require` - Enforce SSL
- `connection_limit=10` - Max connections

---

### 3. Supabase Integration

#### Server-Side (Service Role)

These variables have **full admin privileges**. Never expose to clients!

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | ✅ | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Service role key (full access) |
| `SUPABASE_JWT_SECRET` | ✅ | JWT signing secret |
| `SUPABASE_JWT_AUDIENCE` | ⚠️ | JWT audience claim (default: `authenticated`) |

#### Client-Side (Anon Key)

These variables are safe to expose to browsers:

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | ✅ | Supabase URL (Vite legacy UI) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | ✅ | Anon key (Vite) |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase URL (Next.js) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Anon key (Next.js) |

**Security Notes:**
- ⚠️ **NEVER** use `SERVICE_ROLE_KEY` in client-side code
- ✅ Anon keys are safe for browsers (RLS enforced)
- ✅ Use Row Level Security (RLS) policies to protect data

**Example:**
```env
# Server-side (backend only)
SUPABASE_URL="https://abc123.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOi..."
SUPABASE_JWT_SECRET="super-secret-jwt-signing-key"

# Client-side (safe for browsers)
VITE_SUPABASE_URL="https://abc123.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOi...anon-key"
NEXT_PUBLIC_SUPABASE_URL="https://abc123.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOi...anon-key"
```

---

### 4. OpenAI Configuration

AI and agent platform integration:

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | ✅ | OpenAI API key (`sk-...`) |
| `OPENAI_RPM` | ⚠️ | Requests per minute limit (default: 60) |
| `OPENAI_AGENT_PLATFORM_ENABLED` | ❌ | Enable OpenAI agent platform |
| `OPENAI_AGENT_ID` | ⚠️ | Agent ID when platform enabled |
| `OPENAI_STREAMING_ENABLED` | ❌ | Enable streaming responses |
| `OPENAI_DEBUG_LOGGING` | ❌ | Verbose OpenAI logs |

#### Vector Store (RAG)

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_RETRIEVAL_VECTOR_STORE_ID` | ⚠️ | Vector store ID (or use NAME) |
| `OPENAI_RETRIEVAL_VECTOR_STORE_NAME` | ⚠️ | Vector store name (or use ID) |
| `OPENAI_FILE_SEARCH_MAX_RESULTS` | ⚠️ | Max search results (default: 8) |

#### Realtime & Voice

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_REALTIME_ENABLED` | ❌ | Enable realtime API |
| `OPENAI_REALTIME_MODEL` | ⚠️ | Realtime model (default: `gpt-4o-realtime-preview`) |
| `OPENAI_REALTIME_VOICE` | ⚠️ | Voice preset (default: `verse`) |
| `OPENAI_TTS_MODEL` | ⚠️ | Text-to-speech model |
| `OPENAI_TTS_VOICE` | ⚠️ | TTS voice (default: `alloy`) |

**Example:**
```env
OPENAI_API_KEY="sk-proj-abc123..."
OPENAI_RPM="60"
OPENAI_STREAMING_ENABLED="true"
OPENAI_RETRIEVAL_VECTOR_STORE_NAME="prisma-glow-knowledge"
OPENAI_FILE_SEARCH_MAX_RESULTS="8"
```

---

### 5. Authentication & Sessions

Session management and OAuth:

| Variable | Required | Description |
|----------|----------|-------------|
| `SESSION_COOKIE_SECRET` | ✅ | 32+ char secret for signing cookies |
| `SESSION_COOKIE_NAME` | ⚠️ | Cookie name (default: `__Secure-prisma-glow`) |
| `SESSION_COOKIE_SAME_SITE` | ⚠️ | `lax`, `strict`, or `none` |
| `SESSION_COOKIE_SECURE` | ⚠️ | Require HTTPS (default: `true`) |
| `SESSION_COOKIE_HTTP_ONLY` | ⚠️ | Prevent JS access (default: `true`) |
| `SESSION_COOKIE_DOMAIN` | ❌ | Cookie domain (blank = host-only) |

**OAuth/OIDC:**

| Variable | Required | Description |
|----------|----------|-------------|
| `AUTH_CLIENT_ID` | ⚠️ | OAuth client ID |
| `AUTH_CLIENT_SECRET` | ⚠️ | OAuth client secret |
| `AUTH_ISSUER` | ⚠️ | OIDC issuer URL |

**Example:**
```env
SESSION_COOKIE_SECRET="$(openssl rand -hex 32)"
SESSION_COOKIE_NAME="__Secure-prisma-glow"
SESSION_COOKIE_SAME_SITE="lax"
SESSION_COOKIE_SECURE="true"
SESSION_COOKIE_HTTP_ONLY="true"
```

---

### 6. API Gateway & Services

Service discovery and API routing:

| Variable | Required | Description |
|----------|----------|-------------|
| `API_BASE_URL` | ✅ | Gateway base URL (default: `http://localhost:3001`) |
| `FASTAPI_BASE_URL` | ✅ | FastAPI backend URL (default: `http://localhost:8000`) |
| `API_ALLOWED_ORIGINS` | ✅ | CORS allowed origins (comma-separated) |
| `ALLOWED_HOSTS` | ⚠️ | Trusted host enforcement |
| `GATEWAY_API_KEYS` | ⚠️ | Gateway API keys (comma-separated) |
| `API_KEYS` | ⚠️ | Generic API keys |

**Microservices:**

| Variable | Required | Description |
|----------|----------|-------------|
| `AGENT_SERVICE_URL` | ⚠️ | Agent orchestration service URL |
| `AGENT_SERVICE_API_KEY` | ⚠️ | Agent service auth key |
| `RAG_SERVICE_URL` | ⚠️ | RAG/retrieval service URL |
| `RAG_SERVICE_API_KEY` | ⚠️ | RAG service auth key |

**Example:**
```env
API_BASE_URL="http://localhost:3001"
FASTAPI_BASE_URL="http://localhost:8000"
API_ALLOWED_ORIGINS="http://localhost:3000,http://localhost:5173"
ALLOWED_HOSTS="app.prismaglow.com"
```

---

### 7. Caching (Redis)

Redis configuration for caching and rate limiting:

| Variable | Required | Description |
|----------|----------|-------------|
| `REDIS_URL` | ⚠️ | Redis connection URL (enables caching) |
| `CACHE_DEFAULT_TTL_SECONDS` | ⚠️ | Default cache expiry (default: 60) |
| `CACHE_CONTROLS_TTL_SECONDS` | ⚠️ | Controls cache TTL (default: 45) |
| `CACHE_GROUP_COMPONENTS_TTL_SECONDS` | ⚠️ | Group components TTL (default: 120) |
| `CACHE_OTHER_INFORMATION_TTL_SECONDS` | ⚠️ | Other info TTL (default: 90) |
| `CACHE_SPECIALISTS_TTL_SECONDS` | ⚠️ | Specialists TTL (default: 180) |

**Example:**
```env
REDIS_URL="redis://localhost:6379"
CACHE_DEFAULT_TTL_SECONDS="60"
CACHE_CONTROLS_TTL_SECONDS="45"
```

**Note:** If `REDIS_URL` is not set, in-memory caching is used (development only).

---

### 8. Rate Limiting

Protect APIs from abuse:

#### General API

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `API_RATE_LIMIT` | ⚠️ | `60` | Requests per window |
| `API_RATE_WINDOW_SECONDS` | ⚠️ | `60` | Rate limit window |
| `RATE_LIMIT_ALERT_WEBHOOK` | ❌ | - | Webhook for rate limit alerts |

#### Assistant & Knowledge

| Variable | Default | Window | Description |
|----------|---------|--------|-------------|
| `ASSISTANT_RATE_LIMIT` | `20` | `60s` | Assistant requests |
| `DOCUMENT_UPLOAD_RATE_LIMIT` | `12` | `300s` | Document uploads |
| `KNOWLEDGE_RUN_RATE_LIMIT` | `6` | `900s` | Knowledge runs |
| `KNOWLEDGE_PREVIEW_RATE_LIMIT` | `30` | `300s` | Knowledge previews |
| `RAG_INGEST_RATE_LIMIT` | `5` | `600s` | RAG ingest operations |
| `RAG_REEMBED_RATE_LIMIT` | `5` | `600s` | Re-embedding operations |
| `RAG_SEARCH_RATE_LIMIT` | `40` | `60s` | RAG search requests |
| `AUTOPILOT_SCHEDULE_RATE_LIMIT` | `10` | `600s` | Autopilot scheduling |
| `AUTOPILOT_JOB_RATE_LIMIT` | `20` | `600s` | Autopilot job execution |

**Example:**
```env
API_RATE_LIMIT="60"
API_RATE_WINDOW_SECONDS="60"
ASSISTANT_RATE_LIMIT="20"
DOCUMENT_UPLOAD_RATE_LIMIT="12"
```

---

### 9. Observability

Error tracking, logging, and telemetry:

| Variable | Required | Description |
|----------|----------|-------------|
| `SENTRY_DSN` | ⚠️ | Sentry DSN (global fallback) |
| `WEB_SENTRY_DSN` | ⚠️ | Next.js server-side Sentry |
| `NEXT_PUBLIC_SENTRY_DSN` | ⚠️ | Next.js client-side Sentry |
| `GATEWAY_SENTRY_DSN` | ⚠️ | Gateway-specific Sentry |
| `SENTRY_ENVIRONMENT` | ⚠️ | Environment tag |
| `SENTRY_RELEASE` | ⚠️ | Release version/tag |

**OpenTelemetry:**

| Variable | Required | Description |
|----------|----------|-------------|
| `OTEL_SERVICE_NAME` | ⚠️ | Service name (default: `gateway`) |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | ⚠️ | OTLP collector endpoint |

**Alerts:**

| Variable | Required | Description |
|----------|----------|-------------|
| `ERROR_NOTIFY_WEBHOOK` | ❌ | General error notification webhook |
| `TELEMETRY_ALERT_WEBHOOK` | ❌ | Telemetry/SLA alerts |
| `EMBEDDING_ALERT_WEBHOOK` | ❌ | Embedding pipeline alerts |

**Example:**
```env
SENTRY_DSN="https://public-key@sentry.io/project-id"
SENTRY_ENVIRONMENT="production"
OTEL_SERVICE_NAME="gateway"
OTEL_EXPORTER_OTLP_ENDPOINT="https://otel-collector.example.com"
```

---

### 10. Storage & File Management

Signed URLs and document management:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SIGNED_URL_DEFAULT_TTL_SECONDS` | ⚠️ | `300` | Default signed URL expiry |
| `SIGNED_URL_EVIDENCE_TTL_SECONDS` | ⚠️ | `300` | Evidence file URL expiry |

**Google Drive Integration:**

| Variable | Required | Description |
|----------|----------|-------------|
| `GDRIVE_FOLDER_ID` | ⚠️ | Source folder ID |
| `GDRIVE_SHARED_DRIVE_ID` | ❌ | Shared/team drive ID |
| `GDRIVE_SERVICE_ACCOUNT_EMAIL` | ⚠️ | Service account email |
| `GDRIVE_SERVICE_ACCOUNT_KEY` | ⚠️ | Service account JSON key |
| `GDRIVE_WATCH_CHANNEL_TOKEN` | ⚠️ | Watch channel token |

**Example:**
```env
SIGNED_URL_DEFAULT_TTL_SECONDS="300"
SIGNED_URL_EVIDENCE_TTL_SECONDS="300"

# Google Drive (service account)
GDRIVE_FOLDER_ID="1a2b3c4d5e6f7g8h9i0j"
GDRIVE_SERVICE_ACCOUNT_EMAIL="svc@project.iam.gserviceaccount.com"
GDRIVE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
```

---

### 11. Email (SMTP)

Email configuration for notifications and invites:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SMTP_HOST` | ⚠️ | - | SMTP server hostname |
| `SMTP_PORT` | ⚠️ | `587` | SMTP port (587 for STARTTLS, 465 for SSL) |
| `SMTP_USERNAME` | ⚠️ | - | SMTP authentication username |
| `SMTP_PASSWORD` | ⚠️ | - | SMTP authentication password |
| `SMTP_FROM_EMAIL` | ⚠️ | `no-reply@prismaglow.com` | Sender email |
| `SMTP_FROM_NAME` | ⚠️ | `Prisma Glow` | Sender display name |
| `SMTP_USE_SSL` | ⚠️ | `false` | Use SSL (port 465) |
| `SMTP_USE_STARTTLS` | ⚠️ | `true` | Use STARTTLS (port 587) |
| `SMTP_TIMEOUT_SECONDS` | ⚠️ | `10` | Connection timeout |
| `INVITE_ACCEPT_BASE_URL` | ⚠️ | - | Base URL for invite acceptance links |

**Example:**
```env
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT="587"
SMTP_USERNAME="apikey"
SMTP_PASSWORD="SG.abc123..."
SMTP_FROM_EMAIL="no-reply@prismaglow.com"
SMTP_FROM_NAME="Prisma Glow"
SMTP_USE_STARTTLS="true"
INVITE_ACCEPT_BASE_URL="https://app.prismaglow.com/auth/accept-invite"
```

---

### 12. Security Headers

Content Security Policy (CSP) and CORS:

| Variable | Required | Description |
|----------|----------|-------------|
| `CSP_ADDITIONAL_CONNECT_SRC` | ❌ | Additional connect-src origins (space-separated) |
| `CSP_ADDITIONAL_IMG_SRC` | ❌ | Additional img-src origins (space-separated) |

**Example:**
```env
CSP_ADDITIONAL_CONNECT_SRC="https://api.third-party.com https://analytics.example.com"
CSP_ADDITIONAL_IMG_SRC="https://cdn.example.com"
```

---

### 13. Feature Flags

Toggle features without code deployment:

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_ENABLE_CAPTCHA` | `false` | Enable CAPTCHA on forms |
| `VITE_ENABLE_PWNED_PASSWORD_CHECK` | `true` | Check passwords against breach database |
| `VITE_ENABLE_DEMO_LOGIN` | `false` | Show demo login option |
| `VITE_ENABLE_PWA` | `true` | Enable PWA features |
| `VITE_TRACKING_ENABLED` | `true` | Enable analytics tracking |
| `ALLOW_DEMO_BOOTSTRAP` | `false` | Allow demo data bootstrap |
| `ALLOW_SENTRY_DRY_RUN` | `false` | Sentry dry run mode |

**Example:**
```env
VITE_ENABLE_CAPTCHA="false"
VITE_ENABLE_PWA="true"
VITE_TRACKING_ENABLED="true"
```

---

### 14. Testing & Performance

Variables for testing and load testing:

| Variable | Required | Description |
|----------|----------|-------------|
| `PERF_BASE_URL` | ⚠️ | Base URL for performance tests |
| `PERF_EMAIL` | ⚠️ | Test user email |
| `PERF_PASSWORD` | ⚠️ | Test user password |
| `PERF_ORG_SLUG` | ⚠️ | Test organization slug |
| `PERF_ENGAGEMENT_ID` | ⚠️ | Test engagement ID |
| `PERF_BEARER_TOKEN` | ❌ | Optional static JWT for tests |

**Example:**
```env
PERF_BASE_URL="http://localhost:3000"
PERF_EMAIL="load.user@example.com"
PERF_PASSWORD="password123"
PERF_ORG_SLUG="demo"
```

---

## Security Best Practices

### 1. Secret Management

✅ **DO:**
- Use `.env.local` for local development (never commit)
- Use secret managers in production (Vault, AWS Secrets Manager, etc.)
- Rotate secrets regularly (especially API keys and tokens)
- Use strong, random secrets (32+ characters)

❌ **DON'T:**
- Commit `.env.local` or `.env` with secrets
- Share secrets via email or Slack
- Use weak or predictable secrets
- Reuse secrets across environments

### 2. Generate Strong Secrets

```bash
# Session cookie secret (32 bytes = 64 hex chars)
openssl rand -hex 32

# General secret (16 bytes = 32 hex chars)
openssl rand -hex 16

# Base64 encoded secret
openssl rand -base64 32
```

### 3. Environment Separation

Keep credentials strictly separated:

| Environment | Secret Store | Access Control |
|-------------|--------------|----------------|
| **Development** | `.env.local` | Developer machine only |
| **Staging** | Vault / Secrets Manager | Staging team + CI/CD |
| **Production** | Vault / Secrets Manager | Ops team + CI/CD only |

### 4. Client-Side vs Server-Side

**Client-Side (Safe for Browsers):**
- `VITE_*` variables
- `NEXT_PUBLIC_*` variables
- Public API keys (Supabase anon key, Stripe publishable key)

**Server-Side Only (Never Expose):**
- Database credentials
- Service role keys
- API secrets
- Session secrets
- Private keys

### 5. Pre-Commit Secrets Scanning

The repository includes pre-commit hooks to prevent secret leaks:

```bash
# Install hooks
./scripts/setup-git-hooks.sh

# Hooks will run automatically on commit
# If secrets are detected, commit will be blocked
```

### 6. Vault Integration (Production)

For production, use HashiCorp Vault or similar:

```env
VAULT_ADDR="https://vault.internal:8200"
VAULT_TOKEN="<VAULT_TOKEN>"
VAULT_KV_MOUNT="secret"
SUPABASE_VAULT_PATH="apps/prisma-glow-15/supabase"
SUPABASE_SERVICE_ROLE_VAULT_FIELD="service_role_key"
```

---

## Variable Reference

### Prefix Conventions

| Prefix | Scope | Examples |
|--------|-------|----------|
| `VITE_` | Vite client-side (legacy UI) | `VITE_SUPABASE_URL` |
| `NEXT_PUBLIC_` | Next.js client-side | `NEXT_PUBLIC_SUPABASE_URL` |
| (none) | Server-side only | `DATABASE_URL`, `OPENAI_API_KEY` |

### Validation

To validate your environment configuration:

```bash
# Validate config files
pnpm run config:validate

# Check for missing required variables
pnpm run typecheck

# Run health checks
curl http://localhost:8000/health
```

---

## Troubleshooting

### Common Issues

#### 1. "Missing required environment variable"

**Problem:** Application fails to start due to missing variable.

**Solution:**
1. Check `.env.example` for the variable definition
2. Add the variable to your `.env.local`
3. Restart the application

#### 2. "Database connection failed"

**Problem:** Cannot connect to PostgreSQL.

**Solutions:**
- Verify `DATABASE_URL` format
- Check database is running: `pg_isready -h localhost -p 5432`
- Verify credentials are correct
- Check firewall/network access

#### 3. "Supabase initialization failed"

**Problem:** Supabase client initialization errors.

**Solutions:**
- Verify all Supabase variables are set:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY` (server)
  - `VITE_SUPABASE_PUBLISHABLE_KEY` (client)
- Check keys are not expired or rotated
- Verify URL format: `https://[project-id].supabase.co`

#### 4. "Rate limit exceeded"

**Problem:** Too many requests triggering rate limits.

**Solutions:**
- Increase rate limit: `API_RATE_LIMIT="120"`
- Increase window: `API_RATE_WINDOW_SECONDS="120"`
- Check for infinite loops or retry logic
- Review specific endpoint limits (assistant, knowledge, etc.)

#### 5. "CORS policy blocked request"

**Problem:** Browser blocks requests due to CORS.

**Solutions:**
- Add origin to `API_ALLOWED_ORIGINS`:
  ```env
  API_ALLOWED_ORIGINS="http://localhost:3000,http://localhost:5173,https://app.example.com"
  ```
- Ensure protocol (http/https) matches
- Check port numbers are included

#### 6. "Sentry not capturing errors"

**Problem:** Errors not appearing in Sentry.

**Solutions:**
- Verify DSN is set correctly
- Check environment matches: `SENTRY_ENVIRONMENT="development"`
- Ensure DSN is project-specific
- Test with: `pnpm --filter gateway dev` and trigger an error

### Debug Mode

Enable debug logging for troubleshooting:

```env
# General debug
NODE_ENV="development"

# OpenAI debug
OPENAI_DEBUG_LOGGING="true"
OPENAI_DEBUG_FETCH_DETAILS="true"

# Skip health checks
SKIP_HEALTHCHECK_DB="true"
```

### Validation Checklist

Before deploying, verify:

- [ ] All required variables are set
- [ ] Secrets are strong and unique
- [ ] Database connection works
- [ ] Supabase credentials are valid
- [ ] API keys are not expired
- [ ] CORS origins include deployment URL
- [ ] Rate limits are appropriate for environment
- [ ] Sentry DSN matches environment
- [ ] Email SMTP settings are correct (if using email)
- [ ] Feature flags match desired state

---

## Environment-Specific Notes

### Development

- Use `.env.local` for local overrides
- Can use stub/mock services
- Debug logging enabled
- Rate limits relaxed
- HTTPS not required (cookies: `secure=false`)

### Staging

- Mirrors production configuration
- Uses staging databases and services
- Sentry environment: `staging`
- Rate limits same as production
- HTTPS required

### Production

- All secrets from secret manager (Vault, AWS, etc.)
- Strict rate limits
- Error tracking enabled (Sentry)
- HTTPS required
- Cookies: `secure=true`, `sameSite=strict`
- CSP/CORS strictly configured
- Monitoring and alerting enabled

---

## Additional Resources

- **Configuration Loader:** `packages/system-config/`
- **Example Files:** `.env.example`, `.env.*.example`
- **Security Guide:** `SECURITY.md`
- **Supabase Docs:** `supabase/README.md`
- **API Documentation:** `openapi/` directory

---

**Questions or Issues?**

If you encounter issues not covered in this guide:
1. Check `.env.example` for the latest variable definitions
2. Review `packages/system-config/src/loader.ts` for validation logic
3. Run `pnpm run config:validate` to check configuration
4. Consult repository documentation in `docs/`

---

**Last Updated:** 2025-11-02  
**Maintainer:** Platform Team  
**Related:** `.env.example`, `SECURITY.md`, `config/system.yaml`
