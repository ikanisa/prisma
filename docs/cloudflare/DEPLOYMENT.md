# Cloudflare Pages Deployment Guide

> **Last Updated**: January 2026  
> **Status**: Production Ready ✅  
> **Access**: 🔒 **Internal Staff Only** (Invitation-based)

## Access Control Notice

> ⚠️ **INTERNAL SYSTEM**: This application is for authorized staff only. Access is controlled through:
> 
> 1. **Supabase Auth** - Users must be invited by System Admin (no public signup)
> 2. **Cloudflare Access** (Recommended) - Additional network-level protection
> 3. **RBAC Middleware** - Role-based access to admin features

## Executive Summary

Prisma Glow deploys to **Cloudflare Pages** as an SSR Next.js 15 application with PWA support. This is an **internal staff application** - users can only access the system via invitation from a System Admin. The application uses Supabase as the backend database and authentication provider.

| Component | Technology |
|-----------|------------|
| **Platform** | Cloudflare Pages |
| **Framework** | Next.js 15.5.9 (standalone mode) |
| **Build** | pnpm 9.x monorepo with Turborepo |
| **Database** | Supabase PostgreSQL (external) |
| **Auth** | Supabase Auth with middleware RBAC |
| **PWA** | Workbox via @ducanh2912/next-pwa |
| **Monitoring** | Sentry for error tracking |

---

## Deployment Decision: Cloudflare Pages

### Why Cloudflare Pages (not Workers)

| Consideration | Pages | Workers |
|---------------|-------|---------|
| **SSR Next.js support** | ✅ Built-in | ⚠️ Requires custom setup |
| **Git integration** | ✅ Automatic | ❌ Manual |
| **Preview deployments** | ✅ Automatic per PR | ❌ Manual |
| **Static asset serving** | ✅ Optimized CDN | ⚠️ Requires configuration |
| **Build caching** | ✅ Turbo-friendly | ❌ Manual |

**Decision**: Use **Cloudflare Pages** for the web app due to:
1. Native Git integration with automatic deploys
2. Built-in preview deployments for PRs
3. Optimized static asset serving
4. Simpler configuration for Next.js SSR

### Gateway API (apps/gateway)

The Express.js gateway API is **not deployed to Cloudflare**. It:
- Runs on a separate Node.js server (e.g., Railway, Fly.io, or VPS)
- Uses Express.js with Redis for rate limiting
- Connects to Supabase for database operations
- Requires full Node.js runtime for AI model integrations

---

## Cloudflare Dashboard Settings

### Project Configuration

| Setting | Value |
|---------|-------|
| **Project name** | `prisma` |
| **Production branch** | `main` |
| **Preview branches** | All non-production branches |
| **Framework preset** | Next.js |
| **Build command** | `pnpm install --frozen-lockfile && pnpm --filter @prisma/web build` |
| **Build output directory** | `apps/web/.next` |
| **Root directory** | `/` (repo root) |
| **Node.js version** | 22 |

### Framework Preset

Select **Next.js** in the Cloudflare Pages dashboard. This automatically handles:
- SSR function bundling via Pages Functions
- Static asset serving with optimal caching
- Middleware routing
- API routes (if any)

---

## Environment Variables

Set in: **Cloudflare Dashboard > Pages > prisma > Settings > Environment variables**

### Required (Production & Preview)

| Variable | Type | Description |
|----------|------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Plain text | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Encrypt** | Supabase anon/public key |
| `NEXT_PUBLIC_APP_URL` | Plain text | `https://prisma.pages.dev` |
| `NODE_VERSION` | Plain text | `22` |

### Optional (Recommended for Production)

| Variable | Type | Description |
|----------|------|-------------|
| `NEXT_PUBLIC_SENTRY_DSN` | **Encrypt** | Sentry DSN for error tracking |
| `NEXT_PUBLIC_APP_VERSION` | Plain text | Git SHA or version number |

See [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) for the complete reference.

---

## Deployment Strategy

### Production (main branch)

- **Trigger**: Auto-deploys on push to `main`
- **URL**: `https://prisma.pages.dev`
- **Custom domain**: Configure in Cloudflare DNS

### Preview (PR branches)

- **Trigger**: Auto-deploys for all pull requests
- **URL**: `https://<commit-hash>.prisma.pages.dev`
- **GitHub comment**: Deployment URL posted automatically

### Staging Environment

1. Create a `staging` branch in GitHub
2. Cloudflare Pages will auto-deploy to: `https://staging.prisma.pages.dev`
3. Set staging-specific environment variables in Cloudflare Dashboard

---

## GitHub Actions Integration

The workflow at `.github/workflows/deploy-cloudflare.yml` handles:

1. ✅ Install dependencies (`pnpm install --frozen-lockfile`)
2. ✅ Run typecheck (`pnpm typecheck`)
3. ✅ Build for production (`pnpm --filter @prisma/web build`)
4. ✅ Deploy to Cloudflare Pages via wrangler

### Required GitHub Secrets

| Secret | Where to get it |
|--------|-----------------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare Dashboard > My Profile > API Tokens > Create Token > Edit Cloudflare Workers |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Dashboard > Workers & Pages > Account ID (right sidebar) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard > Settings > API > Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard > Settings > API > anon public key |

### API Token Permissions

When creating the Cloudflare API token, use the **Edit Cloudflare Workers** template or create a custom token with:

- **Account**: Cloudflare Pages: Edit
- **Zone**: (optional) Zone Settings: Read

---

## Local Development with Wrangler

```bash
# Install wrangler globally
pnpm add -g wrangler

# Login to Cloudflare
wrangler login

# Build the web app
pnpm --filter @prisma/web build

# Preview locally with Cloudflare Pages runtime
wrangler pages dev apps/web/.next --compatibility-flags=nodejs_compat

# Deploy manually (if not using GitHub Actions)
wrangler pages deploy apps/web/.next --project-name=prisma
```

---

## Rollback Plan

### Via Cloudflare Dashboard (Recommended)

1. Go to **Cloudflare Dashboard > Pages > prisma > Deployments**
2. Find the last known good deployment (green checkmark)
3. Click the three dots menu → **Rollback to this deployment**
4. Confirm the rollback
5. Rollback is instant (< 1 second)

### Via Wrangler CLI

```bash
# List recent deployments
wrangler pages deployment list --project-name=prisma

# Rollback to specific deployment
wrangler pages deployment rollback <deployment-id> --project-name=prisma
```

### Emergency Rollback Contacts

If rollback fails:
1. Check Cloudflare Status: https://www.cloudflarestatus.com/
2. Contact Cloudflare Support via Dashboard
3. As last resort, manually re-deploy known good commit

---

## Troubleshooting

### Build Fails: "Missing environment variable"

**Cause**: Required `NEXT_PUBLIC_*` variables not set  
**Fix**: 
1. Go to Cloudflare Dashboard > Pages > prisma > Settings > Environment variables
2. Add all required variables for both Production and Preview environments
3. Trigger a new deployment

### 500 Error on SSR Routes

**Cause**: Server-side code error  
**Fix**:
1. Check Cloudflare Pages function logs: Dashboard > Pages > prisma > Functions
2. Check Sentry for error details
3. Common causes: missing env vars, Supabase connection issues

### PWA Not Working

**Cause**: Service worker not generated  
**Fix**:
1. Ensure `apps/web/public/sw.js` exists after build
2. Clear browser cache and service workers
3. Verify PWA is enabled in `next.config.mjs`

### Middleware Not Running

**Cause**: Middleware config issue  
**Fix**:
1. Check `apps/web/middleware.ts` matcher config
2. Ensure middleware doesn't use Node.js-only APIs
3. Test locally with `wrangler pages dev`

### CORS Errors

**Cause**: Incorrect origin configuration  
**Fix**:
1. Check `apps/web/public/_headers` for CORS settings
2. Ensure Supabase project has correct Site URL configured
3. Verify `NEXT_PUBLIC_APP_URL` matches the deployment URL

---

## Performance Optimization

### Enabled by Default

- ✅ Tree-shaking via lucide-react modularization
- ✅ Console logs stripped in production
- ✅ PWA caching for static assets
- ✅ Immutable caching for `/_next/static/*`

### Cloudflare-Specific Optimizations

- ✅ Edge caching for static assets
- ✅ Brotli/gzip compression
- ✅ HTTP/3 support
- ✅ Early hints for faster page loads

---

## Security Configuration

### Headers (via `_headers` file)

```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-XSS-Protection: 1; mode=block
  X-Robots-Tag: noindex, nofollow
```

### Content Security Policy

The CSP is configured in `apps/web/public/_headers` to allow:
- Supabase API connections
- Sentry error reporting
- Self-hosted scripts and styles

### Cloudflare Access (Highly Recommended)

Since this is an internal staff-only system, add Cloudflare Access for network-level protection:

1. Go to **Cloudflare Zero Trust** → **Access** → **Applications**
2. Click **Add an application** → **Self-hosted**
3. Configure:
   - **Application name**: `Prisma Glow`
   - **Session duration**: 24 hours
   - **Application domain**: `prisma.pages.dev`
4. Add access policy:
   - **Policy name**: `Staff Access`
   - **Action**: Allow
   - **Include**: 
     - **Emails ending in**: `@yourcompany.com` (recommended)
     - OR **Emails**: List specific staff email addresses
5. Save and enable

This provides **two layers of protection**:
- **Layer 1**: Cloudflare Access (network-level SSO before reaching the app)
- **Layer 2**: Supabase Auth (application-level, invitation-only)

---

## Monitoring & Observability

### Sentry Integration

- Error tracking enabled via `@sentry/nextjs`
- Configure DSN via `NEXT_PUBLIC_SENTRY_DSN`
- Source maps uploaded automatically during build

### Cloudflare Analytics

- Enabled by default for all Pages projects
- View in: Dashboard > Pages > prisma > Analytics

### Health Check

After deployment, verify:
- [ ] Homepage loads: `https://prisma.pages.dev/`
- [ ] Login works: `https://prisma.pages.dev/login`
- [ ] Supabase connection: Check network tab for successful API calls
