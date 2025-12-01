# GitHub Actions Setup for Supabase Deployment

This guide explains how to set up automated deployment of Supabase edge functions via GitHub Actions.

## Overview

The repository includes workflows for:
- **Edge Functions:** `.github/workflows/supabase-functions.yml` (NEW)
- **Database Migrations:** `.github/workflows/supabase-migrate.yml` (Existing)

## Required GitHub Secrets

Configure these secrets in your GitHub repository: **Settings > Secrets and variables > Actions**

### Production Environment

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `SUPABASE_PROJECT_REF_PROD` | Production project ID | `rcocfusrqrornukrnkln` |
| `SUPABASE_ACCESS_TOKEN_PROD` | Production access token | `sbp_...` |
| `OPENAI_API_KEY` | OpenAI API key | `sk-...` |
| `DATABASE_URL` | Production database URL (optional) | `postgresql://postgres:...` |
| `REDIS_URL` | Redis connection string (optional) | `redis://...` |
| `SENTRY_DSN` | Sentry error tracking (optional) | `https://...@sentry.io/...` |

### Staging Environment (Optional)

| Secret Name | Description |
|-------------|-------------|
| `SUPABASE_PROJECT_REF_STAGING` | Staging project ID |
| `SUPABASE_ACCESS_TOKEN_STAGING` | Staging access token |
| `OPENAI_API_KEY_STAGING` | Staging OpenAI key |

## Setting Up Secrets

### 1. Get Your Supabase Access Token

1. Go to: https://supabase.com/dashboard/account/tokens
2. Click **"Generate new token"**
3. Give it a name (e.g., "GitHub Actions - Production")
4. Set expiration (recommended: 1 year)
5. Click **"Generate token"**
6. Copy the token (starts with `sbp_`)

### 2. Add Secrets to GitHub

#### Via GitHub Web UI:

1. Go to your repository on GitHub
2. Navigate to: **Settings > Secrets and variables > Actions**
3. Click **"New repository secret"**
4. Add each secret:
   - Name: `SUPABASE_PROJECT_REF_PROD`
   - Value: `rcocfusrqrornukrnkln`
   - Click **"Add secret"**
5. Repeat for all secrets listed above

#### Via GitHub CLI:

```bash
# Set production secrets
gh secret set SUPABASE_PROJECT_REF_PROD --body "rcocfusrqrornukrnkln"
gh secret set SUPABASE_ACCESS_TOKEN_PROD --body "sbp_your_token_here"
gh secret set OPENAI_API_KEY --body "sk-your-openai-key"

# Optional secrets
gh secret set DATABASE_URL --body "postgresql://postgres:password@db.rcocfusrqrornukrnkln.supabase.co:5432/postgres"
gh secret set REDIS_URL --body "redis://your-redis-url"
gh secret set SENTRY_DSN --body "https://your-sentry-dsn"
```

## Usage

### Automatic Deployment (Recommended)

The workflow triggers automatically when:
- **Push to `main` branch** → Deploys to production
- **Push to `staging` branch** → Deploys to staging
- **Changes in** `supabase/functions/**` → Triggers deployment

### Manual Deployment

1. Go to: **Actions** tab in GitHub
2. Select **"Deploy Supabase Edge Functions"**
3. Click **"Run workflow"**
4. Choose:
   - **Environment:** `production` or `staging`
   - **Function name:** Leave empty to deploy all, or specify (e.g., `api`)
5. Click **"Run workflow"**

## Workflow Steps

The workflow performs these steps:

1. ✅ Checkout code
2. ✅ Setup Deno runtime
3. ✅ Install Supabase CLI
4. ✅ Link to Supabase project
5. ✅ Set environment secrets
6. ✅ Deploy edge function(s)
7. ✅ Test health endpoint
8. ✅ Show deployment summary

## Testing After Deployment

### Automatic Test

The workflow automatically tests the health endpoint:
```bash
curl https://rcocfusrqrornukrnkln.supabase.co/functions/v1/api/health
```

### Manual Testing

```bash
# Health check
curl https://rcocfusrqrornukrnkln.supabase.co/functions/v1/api/health

# Expected response
{"status":"ok","timestamp":"2025-12-01T18:00:00.000Z"}
```

## Monitoring

### View Workflow Runs

1. Go to: **Actions** tab in GitHub
2. Click on **"Deploy Supabase Edge Functions"**
3. View recent runs and logs

### View Function Logs

After deployment, view logs in Supabase dashboard:
- URL: https://supabase.com/dashboard/project/rcocfusrqrornukrnkln/functions/api/logs

Or via CLI:
```bash
supabase functions logs api --project-ref rcocfusrqrornukrnkln
```

## Troubleshooting

### Issue: "Supabase CLI authentication failed"

**Solution:** Check that `SUPABASE_ACCESS_TOKEN_PROD` is set correctly:
1. Verify token in GitHub Secrets
2. Ensure token hasn't expired
3. Check token has necessary permissions

### Issue: "Function deployment failed"

**Solutions:**
1. Check workflow logs in GitHub Actions
2. Verify `OPENAI_API_KEY` is set
3. Check function code for syntax errors
4. View Supabase function logs

### Issue: "Health check failed"

**Solutions:**
1. Wait a few seconds and retry (propagation delay)
2. Check function logs for errors
3. Verify secrets are set correctly
4. Test manually via dashboard

### Issue: "Secrets not found"

**Solution:** Ensure all required secrets are added to GitHub:
```bash
# List current secrets
gh secret list

# Add missing secrets
gh secret set SECRET_NAME --body "value"
```

## Environment-Specific Configuration

### Production

- Triggered by: Push to `main` branch
- Project: Uses `SUPABASE_PROJECT_REF_PROD`
- Token: Uses `SUPABASE_ACCESS_TOKEN_PROD`
- Sets all production secrets

### Staging

- Triggered by: Push to `staging` branch
- Project: Uses `SUPABASE_PROJECT_REF_STAGING`
- Token: Uses `SUPABASE_ACCESS_TOKEN_STAGING`
- Sets staging-specific secrets only

## Security Best Practices

1. **Never commit secrets** to the repository
2. **Use environment protection** rules in GitHub:
   - Go to: **Settings > Environments**
   - Add `production` environment
   - Enable "Required reviewers" for production deployments
3. **Rotate tokens regularly** (every 3-6 months)
4. **Use separate tokens** for staging and production
5. **Enable branch protection** on `main` branch
6. **Review workflow logs** for any exposed sensitive data

## Advanced Usage

### Deploy Specific Function

```bash
# Via workflow dispatch
# 1. Go to Actions > Deploy Supabase Edge Functions
# 2. Set "Function name" to: api
# 3. Click "Run workflow"
```

### Deploy from CLI (Development)

```bash
# Test locally first
supabase functions serve api

# Deploy to staging
supabase functions deploy api --project-ref staging_project_id

# Deploy to production
supabase functions deploy api --project-ref rcocfusrqrornukrnkln
```

### Custom Deployment Script

You can also trigger deployment via API:

```bash
# Trigger via GitHub API
curl -X POST \
  -H "Accept: application/vnd.github+json" \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  https://api.github.com/repos/your-org/prisma/actions/workflows/supabase-functions.yml/dispatches \
  -d '{"ref":"main","inputs":{"environment":"production","function_name":"api"}}'
```

## Rollback

If a deployment fails or causes issues:

1. **Revert the commit:**
   ```bash
   git revert HEAD
   git push origin main
   ```

2. **Redeploy previous version:**
   ```bash
   git checkout previous-commit-sha
   supabase functions deploy api --project-ref rcocfusrqrornukrnkln
   ```

3. **Or deploy from GitHub UI:**
   - Go to previous successful workflow run
   - Click "Re-run all jobs"

## CI/CD Pipeline

Complete deployment flow:

```
Code Change
    ↓
Push to GitHub
    ↓
GitHub Actions Triggered
    ↓
├─ Checkout Code
├─ Setup Environment
├─ Install Supabase CLI
├─ Link Project
├─ Set Secrets
├─ Deploy Functions
├─ Run Tests
└─ Notify Status
    ↓
Edge Functions Live
```

## Additional Resources

- **Supabase CI/CD Guide:** https://supabase.com/docs/guides/cli/managing-environments
- **GitHub Actions Docs:** https://docs.github.com/en/actions
- **Supabase CLI Reference:** https://supabase.com/docs/reference/cli
- **Your Dashboard:** https://supabase.com/dashboard/project/rcocfusrqrornukrnkln

---

**Created:** December 1, 2025  
**Workflow:** `.github/workflows/supabase-functions.yml`
