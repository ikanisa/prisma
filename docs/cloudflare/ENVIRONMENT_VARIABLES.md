# Environment Variables Reference

> **Last Updated**: January 2026  
> **Scope**: Complete inventory of all environment variables for Cloudflare deployment

---

## Quick Reference

| Category | Count | Required for Deploy |
|----------|-------|---------------------|
| **Frontend (Build-time)** | 4 | 3 |
| **Backend (Runtime)** | 8 | N/A (separate service) |
| **Build System** | 2 | 0 (auto-set) |

---

## Frontend Variables (Build-time)

These variables are embedded in the client bundle during build. **Must use `NEXT_PUBLIC_` prefix.**

| Name | Required | Env | Type | Where Used | Example | How to Set |
|------|----------|-----|------|------------|---------|------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Yes | All | Plain text | Supabase client (`lib/supabase/client.ts`) | `https://xxx.supabase.co` | Dashboard > Environment variables |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Yes | All | **Secret** | Supabase client | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Dashboard > Environment variables (Encrypt) |
| `NEXT_PUBLIC_APP_URL` | ✅ Yes | All | Plain text | CORS, redirects, PWA | `https://prisma.pages.dev` | Dashboard > Environment variables |
| `NEXT_PUBLIC_SENTRY_DSN` | Optional | Prod | **Secret** | Error tracking (`sentry.client.config.ts`) | `https://xxx@sentry.io/yyy` | Dashboard > Environment variables (Encrypt) |
| `NEXT_PUBLIC_APP_VERSION` | Optional | Prod | Plain text | Sentry release tracking | `1.2.3` or `abc123` | Dashboard > Environment variables |

### Security Note on Anon Keys

> **Safe to expose**: The Supabase anon key is designed to be public. It only grants access to data allowed by Row Level Security (RLS) policies. Never expose the service role key in frontend code.

---

## Backend/Server Variables (Gateway API)

These are used by the Express.js gateway (`apps/gateway`) running on a separate Node.js server. **Not needed for Cloudflare Pages.**

| Name | Required | Type | Where Used | Example |
|------|----------|------|------------|---------|
| `SUPABASE_URL` | ✅ Yes | Plain text | Gateway API | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | ✅ Yes | **Secret** | Gateway API | `eyJhbGciOiJIUzI1NiIs...` |
| `SUPABASE_SERVICE_KEY` | ✅ Yes | **Secret** | Admin operations | `eyJhbGciOiJIUzI1NiIs...` |
| `SUPABASE_JWT_SECRET` | ✅ Yes | **Secret** | JWT validation | `your-jwt-secret` |
| `OPENAI_API_KEY` | AI features | **Secret** | AI agents | `sk-...` |
| `GEMINI_API_KEY` | AI features | **Secret** | Gemini agents | `AIza...` |
| `RAG_SERVICE_URL` | AI features | Plain text | RAG integration | `https://rag.example.com` |
| `GATEWAY_ALLOWED_ORIGINS` | ✅ Prod | Plain text | CORS config | `https://prisma.pages.dev` |
| `PORT` | Optional | Plain text | Server port | `3001` |
| `NODE_ENV` | Optional | Plain text | Environment | `production` |
| `REDIS_URL` | Rate limiting | **Secret** | Rate limiter | `redis://...` |

---

## Build System Variables

These are automatically set by Cloudflare Pages during build.

| Name | Required | Type | Description | Default |
|------|----------|------|-------------|---------|
| `CI` | Auto | Plain text | Indicates CI environment | `true` |
| `NODE_ENV` | Auto | Plain text | Build environment | `production` |
| `NODE_VERSION` | Optional | Plain text | Node.js version for build | `22` (recommended) |
| `PNPM_VERSION` | Optional | Plain text | pnpm version | Inferred from `packageManager` |

---

## How to Set Variables on Cloudflare

### Via Dashboard (Recommended)

1. Go to **Cloudflare Dashboard** → **Pages** → **prisma**
2. Click **Settings** → **Environment variables**
3. Add variables for each environment:
   - **Production**: Used for `main` branch deployments
   - **Preview**: Used for all other branches and PRs
4. For secrets, check **Encrypt** before saving

### Via Wrangler CLI

```bash
# Set a plain text variable
wrangler pages secret put NEXT_PUBLIC_SUPABASE_URL --project-name=prisma
# (prompts for value interactively)

# List current secrets
wrangler pages secret list --project-name=prisma
```

### Environment-Specific Values

| Variable | Production | Preview/Staging |
|----------|------------|-----------------|
| `NEXT_PUBLIC_APP_URL` | `https://prisma.pages.dev` | `https://staging.prisma.pages.dev` |
| `NEXT_PUBLIC_SUPABASE_URL` | Production Supabase | Staging Supabase |
| Sentry DSN | Production project | Staging project |

---

## Local Development

### Option 1: `.dev.vars` (Wrangler)

Create `.dev.vars` in the repo root (gitignored):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Then run:
```bash
wrangler pages dev apps/web/.next --compatibility-flags=nodejs_compat
```

### Option 2: `.env.local` (Next.js Dev Server)

Create `apps/web/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Then run:
```bash
pnpm --filter @prisma/web dev
```

---

## Validation

The app validates required environment variables at runtime. Missing variables will:

1. **Build time**: Cause warnings in console (non-fatal)
2. **Runtime**: Throw errors when Supabase client is initialized

To validate manually:

```bash
pnpm run validate:env
```

---

## Security Best Practices

### ✅ Do

- Use **Encrypt** for all API keys and secrets in Cloudflare
- Use different API keys for production and staging
- Rotate keys if they appear in git history
- Use `.env.example` files with placeholder values only

### ❌ Don't

- Never commit `.env`, `.dev.vars`, or `.env.local` files
- Never hardcode secrets in source code
- Never use service role keys in frontend code
- Never log environment variables with secrets

### If a Secret is Exposed

1. **Immediately rotate** the exposed key in Supabase/OpenAI/etc.
2. Update the new value in Cloudflare Dashboard
3. Trigger a new deployment
4. Audit git history and remove if possible

---

## Troubleshooting

### "Missing required environment variables"

**Check**: Are variables set in Cloudflare Dashboard for the correct environment (Production vs Preview)?

### Variables not updating after change

**Fix**: Environment variable changes require a new deployment. Trigger a rebuild from the Cloudflare Dashboard or push a new commit.

### Variables visible in browser DevTools

**Expected**: `NEXT_PUBLIC_*` variables are designed to be in the client bundle. This is safe for:
- Supabase anon key (public by design)
- App URL
- Sentry DSN (public by design)

**Not expected**: Service role keys, JWT secrets, or API keys without `NEXT_PUBLIC_` prefix should NEVER appear in the browser.
