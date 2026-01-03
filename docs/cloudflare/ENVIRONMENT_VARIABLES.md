# Environment Variables Reference

## Overview

This document lists all environment variables used by Prisma Glow, organized by where they're used and how to set them for Cloudflare deployment.

---

## Frontend Variables (Build-time)

These are embedded in the client bundle during build. Use `NEXT_PUBLIC_` prefix.

| Name | Required | Type | Where Used | Example | Cloudflare Setting |
|------|----------|------|------------|---------|-------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ Yes | Plain text | Supabase client | `https://xxx.supabase.co` | Environment variables |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ Yes | **Secret** | Supabase client | `eyJhbGc...` | Encrypt |
| `NEXT_PUBLIC_APP_URL` | ✅ Yes | Plain text | CORS, redirects | `https://prisma-glow.pages.dev` | Environment variables |
| `NEXT_PUBLIC_SENTRY_DSN` | Optional | **Secret** | Error tracking | `https://xxx@sentry.io/yyy` | Encrypt |

---

## Backend/Server Variables (Runtime)

These are used by Supabase Edge Functions and server-side code. Not needed for Cloudflare Pages directly.

| Name | Required | Type | Where Used | Example |
|------|----------|------|------------|---------|
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Edge Functions | **Secret** | Admin operations | `eyJhbGc...` |
| `SUPABASE_JWT_SECRET` | ✅ Edge Functions | **Secret** | JWT validation | `your-jwt-secret` |
| `OPENAI_API_KEY` | AI features | **Secret** | AI agents | `sk-...` |
| `GEMINI_API_KEY` | AI features | **Secret** | Gemini agents | `AIza...` |
| `SENTRY_DSN` | Production | **Secret** | Backend errors | `https://xxx@sentry.io/yyy` |

---

## How to Set on Cloudflare

### Via Dashboard

1. Go to **Cloudflare Dashboard** > **Pages** > **prisma-glow**
2. Click **Settings** > **Environment variables**
3. Add variables for **Production** and **Preview** environments
4. For secrets, enable **Encrypt**

### Via Wrangler CLI

```bash
# Set a plain text variable
wrangler pages secret put NEXT_PUBLIC_SUPABASE_URL --project-name=prisma-glow

# Set a secret (will prompt for value)
wrangler pages secret put NEXT_PUBLIC_SUPABASE_ANON_KEY --project-name=prisma-glow
```

---

## Local Development

### .dev.vars

Create `.dev.vars` in the repo root (gitignored):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### .env.local

For Next.js development, create `apps/web/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Security Notes

> [!CAUTION]
> Never commit actual values for secrets. Use `.env.example` files with placeholders only.

- **Anon keys** are safe to expose in client bundles (they're public by design)
- **Service role keys** must NEVER be in frontend code
- Rotate keys immediately if exposed in git history
