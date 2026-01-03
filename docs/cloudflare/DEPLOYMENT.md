# Cloudflare Pages Deployment Guide

## Overview

Prisma Glow deploys to **Cloudflare Pages** as an SSR Next.js 15 application with PWA support.

| Component | Technology |
|-----------|------------|
| **Platform** | Cloudflare Pages |
| **Framework** | Next.js 15.5.9 (standalone mode) |
| **Build** | pnpm monorepo |
| **Database** | Supabase (external) |
| **Auth** | Supabase Auth |
| **PWA** | Workbox via next-pwa |

---

## Cloudflare Dashboard Settings

### Project Configuration

| Setting | Value |
|---------|-------|
| **Project name** | `prisma-glow` |
| **Production branch** | `main` |
| **Preview branches** | All non-production branches |
| **Build command** | `pnpm install --frozen-lockfile && pnpm --filter @prisma-glow/web build` |
| **Build output directory** | `apps/web/.next` |
| **Root directory** | `/` (repo root) |
| **Node.js version** | 22 |

### Framework Preset

Select **Next.js** in the Cloudflare Pages dashboard - this automatically handles:
- SSR function bundling
- Static asset serving
- Middleware routing

---

## Environment Variables

Set these in: **Cloudflare Dashboard > Pages > prisma-glow > Settings > Environment variables**

### Required (Production & Preview)

| Variable | Type | Description |
|----------|------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Plain text | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Secret | Supabase anon/public key |
| `NEXT_PUBLIC_APP_URL` | Plain text | `https://prisma-glow.pages.dev` |
| `NEXT_PUBLIC_SENTRY_DSN` | Secret | Sentry DSN for error tracking |

### Optional

| Variable | Type | Description |
|----------|------|-------------|
| `NODE_ENV` | Plain text | `production` (auto-set) |
| `CI` | Plain text | `true` (auto-set) |

---

## Deployment Strategy

### Production (main branch)
- Auto-deploys on push to `main`
- URL: `https://prisma-glow.pages.dev`
- Custom domain: Configure in Cloudflare DNS

### Preview (PR branches)
- Auto-deploys for all pull requests
- URL: `https://<branch>.prisma-glow.pages.dev`

### Staging
- Create a `staging` branch for dedicated staging environment
- URL: `https://staging.prisma-glow.pages.dev`

---

## Rollback Plan

### Via Dashboard
1. Go to **Cloudflare Dashboard > Pages > prisma-glow > Deployments**
2. Find the last known good deployment
3. Click the three dots menu → **Rollback to this deployment**

### Via CLI
```bash
wrangler pages deployment rollback --project-name=prisma-glow
```

---

## GitHub Actions Integration

The workflow at `.github/workflows/deploy-cloudflare.yml` handles:
1. Install dependencies
2. Run typecheck
3. Build for production
4. Deploy to Cloudflare Pages

### Required Secrets (GitHub Repository Settings)

| Secret | Where to get it |
|--------|-----------------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare Dashboard > My Profile > API Tokens |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Dashboard > Workers & Pages > Account ID |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard > Settings > API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard > Settings > API |

---

## Local Development with Wrangler

```bash
# Install wrangler
pnpm add -g wrangler

# Login to Cloudflare
wrangler login

# Preview locally (after build)
wrangler pages dev apps/web/.next
```

---

## Troubleshooting

### Build Fails: "Missing environment variable"
Ensure all `NEXT_PUBLIC_*` variables are set in Cloudflare Dashboard.

### 500 Error on SSR Routes
Check Cloudflare Pages function logs in the dashboard.

### PWA Not Working
The service worker (`sw.js`) is generated during build. Ensure it's in `apps/web/public/`.

### Middleware Not Running
Next.js middleware is automatically converted to Cloudflare Pages functions.
