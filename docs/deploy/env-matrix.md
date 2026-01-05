# Environment Variables Matrix

> **Last Updated**: 2025-01-03  
> **Purpose**: Reference for all environment variables across dev/preview/prod environments

---

## Overview

This document provides a complete matrix of all environment variables used in the Prisma Glow web application, organized by environment and configuration location.

---

## Public Client Variables (NEXT_PUBLIC_*)

These variables are **exposed to the browser** and should never contain secrets.

| Variable | Development | Preview | Production | Configured In |
|----------|-------------|---------|-----------|----------------|
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | `https://<branch>.prisma.pages.dev` | `https://prisma.pages.dev` | `.env.local` / Cloudflare Dashboard |
| `NEXT_PUBLIC_SUPABASE_URL` | Local Supabase URL | Staging Supabase URL | Production Supabase URL | `.env.local` / Cloudflare Dashboard |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Local anon key | Staging anon key | Production anon key | `.env.local` / Cloudflare Dashboard (encrypted) |
| `NEXT_PUBLIC_SENTRY_DSN` | (optional) | Staging DSN | Production DSN | `.env.local` / Cloudflare Dashboard (encrypted) |
| `NEXT_PUBLIC_APP_VERSION` | `local` or Git SHA | Git SHA | Git SHA | `.env.local` / Cloudflare Dashboard |

### Notes
- All `NEXT_PUBLIC_*` variables are bundled into the client JavaScript
- Never put secrets in `NEXT_PUBLIC_*` variables
- The anon key is safe to expose (it's public by design)

---

## Server-Side Variables (Edge Functions / API Routes)

These variables are **only available on the server** and can contain secrets.

| Variable | Development | Preview | Production | Configured In |
|----------|-------------|---------|-----------|----------------|
| `OPENAI_APP_OAUTH_CLIENT_ID` | Local client ID | Staging client ID | Production client ID | `.env.local` / Cloudflare Dashboard (encrypted) |
| `OPENAI_APP_OAUTH_CLIENT_SECRET` | Local secret | Staging secret | Production secret | `.env.local` / Cloudflare Dashboard (encrypted) |
| `OPENAI_OAUTH_TOKEN_URL` | `https://api.openai.com/v1/oauth/token` | Same | Same | `.env.local` / Cloudflare Dashboard (optional) |
| `NODE_ENV` | `development` | `production` | `production` | Auto-set by Cloudflare |

### Notes
- These are only accessible in API routes (`app/api/**/route.ts`)
- Use Cloudflare Dashboard **encrypted** secrets for production
- Never expose these in client-side code

---

## Environment-Specific Values

### Development (Local)
- **Supabase**: Use local Supabase instance or development project
- **App URL**: `http://localhost:3000`
- **Sentry**: Optional (can be disabled)

### Preview (PR Branches)
- **Supabase**: Use staging Supabase project
- **App URL**: `https://<branch-name>.prisma.pages.dev` (auto-generated)
- **Sentry**: Use staging DSN (optional)

### Production
- **Supabase**: Use production Supabase project
- **App URL**: `https://prisma.pages.dev`
- **Sentry**: Use production DSN (recommended)

---

## Configuration Locations

### Local Development
1. Copy `apps/web/.env.example` to `apps/web/.env.local`
2. Fill in your local values
3. `.env.local` is gitignored (never commit it)

### Cloudflare Pages (Preview & Production)
1. Go to **Cloudflare Dashboard** > **Pages** > **prisma** > **Settings** > **Environment variables**
2. Set variables for:
   - **Production** (main branch)
   - **Preview** (all other branches)
3. Use **Encrypt** toggle for secrets (client secrets, API keys)

### GitHub Actions (CI/CD)
- Variables are passed via GitHub Secrets
- See `.github/workflows/deploy-cloudflare.yml` for usage

---

## Required vs Optional

### Required (All Environments)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL`

### Required (Production Only)
- `OPENAI_APP_OAUTH_CLIENT_ID` (if using OpenAI OAuth)
- `OPENAI_APP_OAUTH_CLIENT_SECRET` (if using OpenAI OAuth)

### Optional (All Environments)
- `NEXT_PUBLIC_SENTRY_DSN` (recommended for production)
- `NEXT_PUBLIC_APP_VERSION` (useful for debugging)
- `OPENAI_OAUTH_TOKEN_URL` (defaults to OpenAI's URL)

---

## Security Best Practices

1. **Never commit secrets to git**
   - Use `.env.local` for local development (gitignored)
   - Use Cloudflare Dashboard encrypted secrets for production

2. **Separate public vs. private**
   - `NEXT_PUBLIC_*` = safe to expose (public)
   - Everything else = server-side only (private)

3. **Use different values per environment**
   - Development: Local Supabase
   - Preview: Staging Supabase
   - Production: Production Supabase

4. **Rotate secrets regularly**
   - Update OAuth client secrets quarterly
   - Rotate Supabase service role keys if exposed

---

## Validation

The app validates required environment variables at startup:

- **Client-side**: `apps/web/lib/env.ts` validates `NEXT_PUBLIC_*` variables
- **Server-side**: API routes check for required variables before use

If validation fails:
- **Development**: App will show error message
- **Production**: Check Cloudflare Pages function logs

---

## Troubleshooting

### "Missing required environment variable"
1. Check Cloudflare Dashboard > Pages > Settings > Environment variables
2. Ensure variable is set for the correct environment (Production vs Preview)
3. Verify variable name matches exactly (case-sensitive)

### "Invalid Supabase URL"
1. Verify `NEXT_PUBLIC_SUPABASE_URL` is a valid URL
2. Check for trailing slashes (should not have one)
3. Ensure it's the project URL, not the API URL

### Variables not updating after deployment
1. Cloudflare Pages caches environment variables
2. Trigger a new deployment to pick up changes
3. Or use Cloudflare Dashboard to update variables (takes effect immediately)

---

## Related Documentation

- [Cloudflare Deployment Guide](./cloudflare-readiness.md)
- [Environment Variables Guide](../../ENV_GUIDE.md)
- [Cloudflare Pages Environment Variables](https://developers.cloudflare.com/pages/platform/build-configuration/#environment-variables)

---

**Last Updated**: 2025-01-03

