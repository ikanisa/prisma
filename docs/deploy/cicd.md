# CI/CD Pipeline for Cloudflare Pages

> **Last Updated**: 2025-01-03  
> **Workflow**: `.github/workflows/deploy-cloudflare.yml`

---

## Overview

The CI/CD pipeline automatically builds and deploys the Prisma Glow web app to Cloudflare Pages on every push to `main` or `staging`, and creates preview deployments for pull requests.

---

## Pipeline Flow

```
┌─────────────────┐
│  Push to main   │
│  or PR opened   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Checkout Code   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Setup pnpm     │
│  Setup Node.js  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Install Deps    │
│ (frozen lock)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Typecheck      │
│  (optional)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Build Next.js  │
│  Build Pages    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Deploy to CF   │
│  (Pages)        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Smoke Test     │
│  (main only)    │
└─────────────────┘
```

---

## Workflow Triggers

### Production (main branch)
- **Trigger**: Push to `main` branch
- **URL**: `https://prisma.pages.dev`
- **Environment**: Production

### Staging (staging branch)
- **Trigger**: Push to `staging` branch
- **URL**: `https://staging.prisma.pages.dev`
- **Environment**: Staging

### Preview (Pull Requests)
- **Trigger**: Pull request opened/updated
- **URL**: `https://<branch-name>.prisma.pages.dev`
- **Environment**: Preview
- **Comment**: Deployment URL posted on PR

---

## Build Process

### Step 1: Setup

```yaml
- Setup pnpm (version 9.12.3)
- Setup Node.js (version 22.12.0)
- Cache: pnpm dependencies
```

### Step 2: Install Dependencies

```yaml
pnpm install --frozen-lockfile
```

**Why `--frozen-lockfile`?**
- Ensures reproducible builds
- Fails if `pnpm-lock.yaml` is out of sync
- Prevents "works on my machine" issues

### Step 3: Typecheck (Optional)

```yaml
pnpm run typecheck
continue-on-error: true
```

**Why `continue-on-error`?**
- Typecheck can be slow
- Build will continue even if typecheck fails
- Types are checked in development

### Step 4: Build

```yaml
pnpm --filter @prisma/web build      # Next.js build
pnpm --filter @prisma/web pages:build  # Cloudflare Pages build
```

**Build Output**: `apps/web/.vercel/output/static`

### Step 5: Deploy

```yaml
wrangler pages deploy apps/web/.vercel/output/static \
  --project-name=prisma \
  --branch=<branch-name>
```

---

## Environment Variables

### GitHub Secrets

Set these in **GitHub Repository** > **Settings** > **Secrets and variables** > **Actions**:

| Secret | Description | Required |
|--------|-------------|----------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token with Pages:Edit permission | ✅ Yes |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID | ✅ Yes |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | ✅ Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | ✅ Yes |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry DSN (optional) | ❌ No |

### Build-Time Variables

These are set in the workflow:

```yaml
NEXT_PUBLIC_APP_URL: ${{ github.ref == 'refs/heads/main' && 'https://prisma.pages.dev' || ... }}
```

**Logic:**
- `main` branch → `https://prisma.pages.dev`
- `staging` branch → `https://staging.prisma.pages.dev`
- PR branches → `https://<branch-name>.prisma.pages.dev`

---

## Deployment Strategy

### Production Branch

- **Branch**: `main`
- **Auto-deploy**: ✅ Yes (on push)
- **URL**: `https://prisma.pages.dev`
- **Smoke test**: ✅ Yes (after deploy)

### Preview Branches

- **Branches**: All non-production branches
- **Auto-deploy**: ✅ Yes (on PR open/update)
- **URL**: `https://<branch-name>.prisma.pages.dev`
- **PR comment**: ✅ Yes (deployment URL posted)

### Staging Branch

- **Branch**: `staging`
- **Auto-deploy**: ✅ Yes (on push)
- **URL**: `https://staging.prisma.pages.dev`
- **URL**: `https://staging.prisma.pages.dev`

---

## Smoke Testing

### What It Tests

After production deployment:
1. **Health check**: Homepage returns 200
2. **Manual verification**: (reminder to test manually)

### Smoke Test Steps

```yaml
- Wait 30 seconds (deployment propagation)
- curl https://prisma.pages.dev/
- Verify status code is 200
```

### Manual Verification Checklist

After smoke test passes, manually verify:
- [ ] Login flow works
- [ ] RBAC middleware works
- [ ] PWA installation works
- [ ] Deep links work (e.g., `/dashboard`)

---

## Rollback Plan

### Via Cloudflare Dashboard (Recommended)

1. Go to **Cloudflare Dashboard** > **Pages** > **prisma** > **Deployments**
2. Find last known good deployment (green checkmark)
3. Click **⋯** → **Rollback to this deployment**
4. Confirm rollback
5. Rollback is instant (< 1 second)

### Via Wrangler CLI

```bash
# List recent deployments
wrangler pages deployment list --project-name=prisma

# Rollback to specific deployment
wrangler pages deployment rollback <deployment-id> \
  --project-name=prisma
```

### Emergency Contacts

If rollback fails:
1. Check [Cloudflare Status](https://www.cloudflarestatus.com/)
2. Contact Cloudflare Support via Dashboard
3. As last resort, manually re-deploy known good commit

---

## Troubleshooting

### Build Fails: "Missing environment variable"

**Cause**: Required `NEXT_PUBLIC_*` variables not set in GitHub Secrets

**Fix**:
1. Go to **GitHub Repository** > **Settings** > **Secrets and variables** > **Actions**
2. Add missing secrets
3. Re-run workflow

### Deploy Fails: "Invalid API token"

**Cause**: `CLOUDFLARE_API_TOKEN` missing or invalid

**Fix**:
1. Create new API token in Cloudflare Dashboard
2. Permissions: **Account** > **Cloudflare Pages** > **Edit**
3. Update GitHub secret

### Preview URL Not Posted on PR

**Cause**: GitHub token permissions or workflow error

**Fix**:
1. Check workflow logs for errors
2. Verify `pull-requests: write` permission in workflow
3. Re-run workflow

### Smoke Test Fails

**Cause**: Deployment not propagated or app error

**Fix**:
1. Wait 60 seconds and retry
2. Check Cloudflare Pages function logs
3. Check Sentry for errors
4. Manually verify deployment

---

## Best Practices

1. **Always use `--frozen-lockfile`** for reproducible builds
2. **Test in preview** before merging to `main`
3. **Monitor smoke tests** after production deploys
4. **Keep secrets secure** (never commit to git)
5. **Document deployment process** (this file)

---

## Related Documentation

- [Cloudflare Pages Direct Upload](https://developers.cloudflare.com/pages/platform/direct-upload/)
- [GitHub Actions](https://docs.github.com/en/actions)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)

---

**Last Updated**: 2025-01-03


