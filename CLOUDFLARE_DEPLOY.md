# Cloudflare Deployment Guide

> **Internal App**: This PWA is for staff only, accessible by invitation from System Admin.

## Access Control

This app uses **invitation-only access** enforced at multiple layers:

### Layer 1: Supabase Auth (Primary)
- Users must be invited by System Admin
- Email invitations sent via Supabase
- No public signup allowed

### Layer 2: Cloudflare Access (Optional but Recommended)
To add network-level access control:

1. Go to **Cloudflare Zero Trust** → **Access** → **Applications**
2. Create new application for `prisma.pages.dev`
3. Add policy: **Allow** → **Emails ending in** → `@yourcompany.com`
4. Or use: **Allow** → **Email** → `list of staff emails`

This adds SSO before users even reach the app.

---

## Quick Deploy

### Option 1: Cloudflare Dashboard (Recommended)

1. Go to [Cloudflare Pages](https://dash.cloudflare.com/)
2. Click **Create Project** → **Connect to Git**
3. Select your GitHub repo: `ikanisa/prisma`
4. Configure build:
   - **Framework preset**: None
   - **Build command**: `pnpm install && pnpm --filter @prisma/web build`
   - **Build output directory**: `apps/web/.next`
   - **Root directory**: `/`

5. Add environment variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   NEXT_PUBLIC_APP_URL=https://prisma.pages.dev
   NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
   NODE_VERSION=20
   ```

6. Click **Save and Deploy**

### Option 2: Wrangler CLI

```bash
# Install wrangler
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Build the project
pnpm --filter @prisma/web build

# Deploy
wrangler pages deploy apps/web/.next --project-name=prisma
```

---

## Environment Variables (Required)

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key | `eyJ...` |
| `NEXT_PUBLIC_APP_URL` | Production app URL | `https://prisma.pages.dev` |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry DSN | `https://xxx@sentry.io/xxx` |
| `NODE_VERSION` | Node.js version for build | `20` |

---

## Custom Domain Setup

1. In Cloudflare Pages → Your Project → **Custom domains**
2. Click **Set up a custom domain**
3. Enter your domain (e.g., `app.prismaglow.com`)
4. Configure DNS (CNAME or proxied A record)
5. Wait for SSL certificate provisioning

---

## Preview Deployments

Every PR gets a unique preview URL:
- Format: `<commit-hash>.prisma.pages.dev`
- Automatic deployment on push
- Comment with preview URL on PR

---

## Troubleshooting

### Build Fails
1. Check Node version: Must be 18+ (set `NODE_VERSION=20`)
2. Verify pnpm lockfile: Run `pnpm install` locally first
3. Check build logs in Cloudflare dashboard

### 404 on Routes
- Ensure `_redirects` file exists in `apps/web/public/`
- Contains: `/*    /index.html   200`

### Environment Variables Not Working
- Must prefix with `NEXT_PUBLIC_` for client-side access
- Rebuild after changing variables
- Check Cloudflare Pages → Settings → Environment variables

---

## Rollback

```bash
# List recent deployments
wrangler pages deployment list --project-name=prisma

# Rollback to specific deployment
wrangler pages deployment rollback <deployment-id> --project-name=prisma
```
