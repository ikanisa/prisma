# Netlify + Supabase Deployment Guide

This guide covers the complete deployment process for Prisma Glow on Netlify with Supabase backend.

## Architecture Overview

```
┌─────────────────┐     ┌──────────────────┐
│   Netlify CDN   │────▶│  Client PWA      │
│   (Frontend)    │     │  (React/Vite)    │
└─────────────────┘     └──────────────────┘
         │                       │
         │                       ▼
         │              ┌──────────────────┐
         │              │  Supabase        │
         │              │  - PostgreSQL    │
         │              │  - Auth          │
         │              │  - Edge Funcs    │
         │              │  - Realtime      │
         │              │  - Storage       │
         └──────────────▶└──────────────────┘
```

## Prerequisites

### Required Tools
- Node.js 20.19.4 (matches Netlify and CI/CD)
- pnpm 9.12.3
- Git
- Netlify CLI (optional): `npm install -g netlify-cli`
- Supabase CLI (optional): `npm install -g supabase`

### Required Accounts
1. **Netlify Account**: https://app.netlify.com
2. **Supabase Account**: https://app.supabase.com
3. **GitHub Account**: https://github.com (for CI/CD)

## Pre-Deployment Checklist

### ✅ Code Validation
- [ ] Run `pnpm install --frozen-lockfile`
- [ ] Run `pnpm run typecheck` (must pass)
- [ ] Run `pnpm run lint` (review warnings)
- [ ] Run `pnpm run test` (must pass)
- [ ] Run `pnpm run build` (must succeed)

### ✅ Configuration Files
- [ ] `netlify.toml` exists and is configured
- [ ] `.env.production` is configured (not committed)
- [ ] `.env.example` is up to date
- [ ] `supabase/config.toml` is configured

### ✅ Database Setup
- [ ] Supabase project created
- [ ] Database migrations applied
- [ ] RLS policies configured
- [ ] Test data seeded (optional)

## Step 1: Supabase Setup

### 1.1 Create Supabase Project

1. Go to https://app.supabase.com
2. Click "New Project"
3. Fill in:
   - **Name**: prisma-glow-prod
   - **Database Password**: (strong password, save it)
   - **Region**: Choose closest to your users
4. Wait for project creation (~2 minutes)

### 1.2 Configure Database

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Apply migrations
supabase db push
```

### 1.3 Configure Authentication

1. In Supabase Dashboard → Authentication → Providers
2. Enable providers you need:
   - Email/Password (default)
   - Google OAuth (optional)
   - GitHub OAuth (optional)

3. Set Site URL and Redirect URLs:
   - **Site URL**: `https://your-site.netlify.app`
   - **Redirect URLs**: 
     - `https://your-site.netlify.app/auth/callback`
     - `http://localhost:3000/auth/callback` (for local dev)

### 1.4 Set Up Row Level Security (RLS)

```sql
-- Example RLS policy
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own data"
  ON users
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own data"
  ON users
  FOR UPDATE
  USING (auth.uid() = id);
```

### 1.5 Deploy Edge Functions (if any)

```bash
# Deploy all edge functions
supabase functions deploy

# Or deploy specific function
supabase functions deploy api-gateway
```

## Step 2: Netlify Setup

### 2.1 Create Netlify Site

**Option A: Using Netlify Dashboard**

1. Go to https://app.netlify.com
2. Click "Add new site" → "Import an existing project"
3. Connect to GitHub and select your repository
4. Configure build settings:
   - **Build command**: `pnpm run build:netlify`
   - **Publish directory**: `dist`
   - **Base directory**: (leave empty)

**Option B: Using Netlify CLI**

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Initialize site
netlify init

# Follow prompts to create new site
```

### 2.2 Configure Environment Variables

In Netlify Dashboard → Site settings → Environment variables, add:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_PROJECT_ID=your-project-id

# Node Configuration
NODE_ENV=production
PNPM_VERSION=9.12.3

# Sentry (optional)
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn
SENTRY_AUTH_TOKEN=your-sentry-token

# Analytics (optional)
NEXT_PUBLIC_ANALYTICS_ID=your-analytics-id
```

### 2.3 Configure Build Settings

In `netlify.toml` (already configured):
- Node version: 20
- Build command: `pnpm run build:netlify`
- Publish directory: `dist`

### 2.4 Configure Domain (Optional)

1. Go to Site settings → Domain management
2. Add custom domain
3. Configure DNS:
   - Add CNAME record: `www` → `your-site.netlify.app`
   - Add A record: `@` → Netlify load balancer IP
4. Enable HTTPS (automatic with Let's Encrypt)

## Step 3: GitHub Actions Setup

### 3.1 Add GitHub Secrets

In GitHub repository → Settings → Secrets and variables → Actions:

```bash
# Netlify Secrets
NETLIFY_AUTH_TOKEN=your-netlify-auth-token
NETLIFY_SITE_ID=your-site-id
NETLIFY_STAGING_SITE_ID=your-staging-site-id (optional)

# Supabase Secrets
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3.2 Get Netlify Auth Token

```bash
# Using Netlify CLI
netlify status

# Or get from Netlify Dashboard:
# User settings → Applications → Personal access tokens
```

### 3.3 Get Netlify Site ID

```bash
# Using Netlify CLI
netlify status

# Or get from Netlify Dashboard:
# Site settings → Site details → Site ID
```

## Step 4: First Deployment

### 4.1 Deploy to Production

```bash
# Commit all changes
git add .
git commit -m "Configure Netlify + Supabase deployment"

# Push to main branch (triggers deployment)
git push origin main
```

### 4.2 Monitor Deployment

1. Check GitHub Actions: https://github.com/your-org/your-repo/actions
2. Check Netlify Deploy Log: https://app.netlify.com/sites/your-site/deploys
3. Wait for deployment to complete (~5-10 minutes)

### 4.3 Verify Deployment

- [ ] Site is accessible at `https://your-site.netlify.app`
- [ ] PWA installs correctly
- [ ] Authentication works
- [ ] Database connections work
- [ ] Edge Functions respond
- [ ] Offline mode works

## Step 5: Post-Deployment Verification

### 5.1 Run Lighthouse Audit

```bash
# Using Chrome DevTools
# 1. Open site in Chrome
# 2. Open DevTools (F12)
# 3. Go to Lighthouse tab
# 4. Run audit for PWA, Performance, Accessibility

# Or use CLI
npm install -g lighthouse
lighthouse https://your-site.netlify.app --view
```

**Target Scores:**
- Performance: 90+
- Accessibility: 95+
- Best Practices: 95+
- SEO: 90+
- PWA: 100

### 5.2 Test PWA Installation

**Desktop:**
1. Open site in Chrome
2. Click install icon in address bar
3. Verify app installs
4. Test offline mode

**Mobile:**
1. Open site in mobile browser
2. Tap "Add to Home Screen"
3. Verify app installs
4. Test offline mode

### 5.3 Test Authentication Flow

1. Register new user
2. Verify email (if email verification enabled)
3. Login
4. Test password reset
5. Test social login (if configured)

### 5.4 Load Testing

```bash
# Using k6
pnpm run test:performance

# Or using Artillery
pnpm run load:test
```

### 5.5 Monitor Error Tracking

1. Check Sentry dashboard: https://sentry.io
2. Verify no critical errors
3. Review performance metrics

## Step 6: Configure Monitoring

### 6.1 Netlify Analytics

1. Go to Site settings → Analytics
2. Enable Netlify Analytics ($9/month)
3. Configure alerts for:
   - Build failures
   - Deploy failures
   - High error rates

### 6.2 Supabase Monitoring

1. Go to Project settings → Monitoring
2. Review:
   - Database performance
   - API usage
   - Edge Function logs
   - Realtime connections

### 6.3 Uptime Monitoring

Set up external monitoring:
- Pingdom
- UptimeRobot
- Better Uptime

## Troubleshooting

### Build Fails with "Module not found"

```bash
# Clear Netlify cache
netlify build:clear

# Or in Netlify Dashboard:
# Site settings → Build & deploy → Clear cache and retry deploy
```

### Environment Variables Not Working

1. Check variable names match exactly
2. Restart build after adding variables
3. Check for typos in variable names
4. Verify variables are set for correct context (production/deploy-preview/branch-deploy)

### PWA Not Installing

1. Check `manifest.json` is served correctly
2. Verify HTTPS is enabled
3. Check service worker registration
4. Clear browser cache
5. Check Lighthouse PWA audit for specific issues

### Database Connection Fails

1. Verify Supabase URL is correct
2. Check RLS policies allow access
3. Verify API keys are correct
4. Check Supabase project is not paused

### Slow Initial Load

1. Enable Netlify Asset Optimization
2. Configure caching headers in `netlify.toml`
3. Optimize images
4. Use code splitting
5. Enable CDN edge caching

## Rollback Procedure

### Rollback Netlify Deployment

```bash
# List recent deploys
netlify deploy:list

# Rollback to specific deploy
netlify deploy:rollback DEPLOY_ID

# Or in Netlify Dashboard:
# Deploys → Select deploy → Publish deploy
```

### Rollback Database Migration

```bash
# Using Supabase CLI
supabase db reset

# Or manually
supabase db push --dry-run
# Review changes, then apply specific migration
```

## Maintenance

### Regular Tasks

**Daily:**
- [ ] Monitor error rates
- [ ] Check build status
- [ ] Review performance metrics

**Weekly:**
- [ ] Review Lighthouse scores
- [ ] Check dependency updates
- [ ] Review security alerts

**Monthly:**
- [ ] Database backup verification
- [ ] Load testing
- [ ] SSL certificate renewal check
- [ ] Access token rotation

## Support Resources

- **Netlify Docs**: https://docs.netlify.com
- **Supabase Docs**: https://supabase.com/docs
- **Netlify Status**: https://netlifystatus.com
- **Supabase Status**: https://status.supabase.com
- **Community**: GitHub Discussions

## Cost Estimates

### Netlify
- **Starter** (Free): 100 GB bandwidth, 300 build minutes
- **Pro** ($19/month): 1 TB bandwidth, 3 team members
- **Business** ($99/month): Unlimited bandwidth, SSO, SLA

### Supabase
- **Free**: 500 MB database, 1 GB file storage, 2 GB bandwidth
- **Pro** ($25/month): 8 GB database, 100 GB storage, 250 GB bandwidth
- **Team** ($599/month): Dedicated resources, point-in-time recovery

### Estimated Monthly Cost (Production)
- Netlify Pro: $19
- Supabase Pro: $25
- **Total: ~$44/month**

## Next Steps

1. Set up staging environment
2. Configure CI/CD pipelines
3. Implement blue-green deployments
4. Set up preview deployments for PRs
5. Configure branch deploys
6. Implement feature flags
7. Set up A/B testing

---

**Last Updated**: 2025-11-07
**Version**: 1.0.0
