# Supabase Edge Functions & Secrets Setup

## Overview

Your Supabase project requires edge functions and secrets to be set up for full functionality. This document provides step-by-step instructions for deploying edge functions and configuring required secrets.

**Project Details:**
- **Project ID:** `rcocfusrqrornukrnkln`
- **Project URL:** `https://rcocfusrqrornukrnkln.supabase.co`
- **Dashboard:** `https://supabase.com/dashboard/project/rcocfusrqrornukrnkln`

---

## Prerequisites

1. **Supabase CLI** installed:
   ```bash
   npm install -g supabase
   ```

2. **Project Owner/Admin Access** - You need admin privileges on the Supabase project

3. **Required API Keys:**
   - OpenAI API Key (for AI features)

---

## Step 1: Login to Supabase CLI

```bash
supabase login
```

This will open a browser window for authentication. Login with your Supabase account credentials.

---

## Step 2: Link to Your Project

```bash
cd /Users/jeanbosco/workspace/prisma
supabase link --project-ref rcocfusrqrornukrnkln
```

Confirm when prompted. This connects the CLI to your Supabase project.

---

## Step 3: Set Required Secrets

### Required Secrets

#### 1. OpenAI API Key (REQUIRED)

Get your OpenAI API key from: https://platform.openai.com/api-keys

```bash
supabase secrets set OPENAI_API_KEY="sk-your-actual-openai-key-here" --project-ref rcocfusrqrornukrnkln
```

#### 2. Supabase URL and Anon Key (Auto-configured but can be explicit)

These are automatically available in edge functions, but you can set them explicitly:

```bash
supabase secrets set SUPABASE_URL="https://rcocfusrqrornukrnkln.supabase.co" --project-ref rcocfusrqrornukrnkln

supabase secrets set SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjb2NmdXNycXJvcm51a3Jua2xuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1OTYxNTUsImV4cCI6MjA4MDE3MjE1NX0.wBt9kcRJBAzKu9sHdqT5dr3ZAjYxg2l8zoFC3_w7d-s" --project-ref rcocfusrqrornukrnkln
```

### Optional Secrets (for enhanced features)

#### 3. Database URL (for direct database access)

```bash
supabase secrets set DATABASE_URL="postgresql://postgres:[YOUR_DB_PASSWORD]@db.rcocfusrqrornukrnkln.supabase.co:5432/postgres" --project-ref rcocfusrqrornukrnkln
```

Replace `[YOUR_DB_PASSWORD]` with your actual database password from the Supabase dashboard.

#### 4. Redis (for caching - if you have Redis setup)

```bash
supabase secrets set REDIS_URL="redis://your-redis-instance:6379" --project-ref rcocfusrqrornukrnkln
```

#### 5. Sentry (for error tracking - if you use Sentry)

```bash
supabase secrets set SENTRY_DSN="https://your-sentry-dsn@sentry.io/project-id" --project-ref rcocfusrqrornukrnkln
```

#### 6. Other environment variables your app might need

```bash
# JWT Secret (if custom JWT validation needed)
supabase secrets set JWT_SECRET="your-jwt-secret" --project-ref rcocfusrqrornukrnkln

# API Rate limiting
supabase secrets set RATE_LIMIT_MAX="100" --project-ref rcocfusrqrornukrnkln
supabase secrets set RATE_LIMIT_WINDOW="60" --project-ref rcocfusrqrornukrnkln

# Environment
supabase secrets set NODE_ENV="production" --project-ref rcocfusrqrornukrnkln
```

---

## Step 4: View Current Secrets (Verification)

```bash
supabase secrets list --project-ref rcocfusrqrornukrnkln
```

This shows which secrets are configured (but not their values for security).

---

## Step 5: Deploy Edge Functions

### Deploy the API Edge Function

```bash
cd /Users/jeanbosco/workspace/prisma
supabase functions deploy api --project-ref rcocfusrqrornukrnkln
```

This deploys the edge function from `supabase/functions/api/index.ts`.

### Deploy Options

**Deploy with specific region:**
```bash
supabase functions deploy api --project-ref rcocfusrqrornukrnkln --region us-west-1
```

**Deploy with debugging:**
```bash
supabase functions deploy api --project-ref rcocfusrqrornukrnkln --debug
```

**Deploy all functions:**
```bash
supabase functions deploy --project-ref rcocfusrqrornukrnkln
```

---

## Step 6: Test the Deployed Function

### Test Health Endpoint (No Auth Required)

```bash
curl https://rcocfusrqrornukrnkln.supabase.co/functions/v1/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-12-01T17:41:26.102Z"
}
```

### Test Chat Endpoint (Requires Auth)

```bash
curl -X POST https://rcocfusrqrornukrnkln.supabase.co/functions/v1/api/chat \
  -H "Authorization: Bearer YOUR_USER_JWT_TOKEN" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjb2NmdXNycXJvcm51a3Jua2xuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1OTYxNTUsImV4cCI6MjA4MDE3MjE1NX0.wBt9kcRJBAzKu9sHdqT5dr3ZAjYxg2l8zoFC3_w7d-s" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello"}]}'
```

### Test RAG Endpoint (Requires Auth)

```bash
curl -X POST https://rcocfusrqrornukrnkln.supabase.co/functions/v1/api/rag \
  -H "Authorization: Bearer YOUR_USER_JWT_TOKEN" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjb2NmdXNycXJvcm51a3Jua2xuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1OTYxNTUsImV4cCI6MjA4MDE3MjE1NX0.wBt9kcRJBAzKu9sHdqT5dr3ZAjYxg2l8zoFC3_w7d-s" \
  -H "Content-Type: application/json" \
  -d '{"query":"tax regulations","filters":{}}'
```

---

## Step 7: Monitor Function Logs

View real-time logs:

```bash
supabase functions logs api --project-ref rcocfusrqrornukrnkln
```

Or view in the dashboard:
- Go to: https://supabase.com/dashboard/project/rcocfusrqrornukrnkln/functions/api/logs

---

## Alternative: Using Supabase Dashboard

If you prefer using the web interface:

### 1. Set Secrets via Dashboard

1. Go to: https://supabase.com/dashboard/project/rcocfusrqrornukrnkln/settings/vault
2. Click **"New secret"**
3. Add each secret:
   - Name: `OPENAI_API_KEY`
   - Value: `sk-your-actual-key`
   - Click **"Add secret"**

### 2. Deploy Edge Functions via Dashboard

1. Go to: https://supabase.com/dashboard/project/rcocfusrqrornukrnkln/functions
2. Click **"Deploy a new function"**
3. Either:
   - Upload the `supabase/functions/api` folder
   - Or connect to GitHub and deploy from your repository

---

## Edge Function Endpoints

Once deployed, your edge function will be available at:

**Base URL:** `https://rcocfusrqrornukrnkln.supabase.co/functions/v1/api`

### Available Endpoints:

| Endpoint | Method | Auth Required | Description |
|----------|--------|---------------|-------------|
| `/api/health` | GET | ❌ No | Health check endpoint |
| `/api/chat` | POST | ✅ Yes | Chat with AI (OpenAI integration) |
| `/api/rag` | POST | ✅ Yes | RAG vector search |
| `/api/analytics` | POST | ✅ Yes | Track analytics events |

### Request Headers (for authenticated endpoints):

```
Authorization: Bearer <user_jwt_token>
apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjb2NmdXNycXJvcm51a3Jua2xuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ1OTYxNTUsImV4cCI6MjA4MDE3MjE1NX0.wBt9kcRJBAzKu9sHdqT5dr3ZAjYxg2l8zoFC3_w7d-s
Content-Type: application/json
```

---

## Updating Edge Functions

To update the edge function after making code changes:

```bash
# Make your changes to supabase/functions/api/index.ts
supabase functions deploy api --project-ref rcocfusrqrornukrnkln
```

---

## Troubleshooting

### Issue: "Your account does not have the necessary privileges"

**Solution:** Ensure you're logged in as a project owner or admin:
```bash
supabase logout
supabase login
```

### Issue: "Function deployment failed"

**Solutions:**
1. Check function logs: `supabase functions logs api --project-ref rcocfusrqrornukrnkln`
2. Verify secrets are set: `supabase secrets list --project-ref rcocfusrqrornukrnkln`
3. Test locally first: `supabase functions serve api`

### Issue: "OpenAI API errors"

**Solutions:**
1. Verify OPENAI_API_KEY is set correctly
2. Check your OpenAI account has credits
3. Ensure the API key has the necessary permissions

### Issue: "CORS errors from frontend"

The function already has CORS configured, but ensure your requests include:
```javascript
headers: {
  'apikey': 'your-anon-key',
  'Authorization': 'Bearer user-jwt'
}
```

---

## Security Best Practices

1. **Never commit secrets** to version control
2. **Rotate API keys regularly** (especially OpenAI keys)
3. **Use environment-specific secrets** for dev/staging/production
4. **Monitor function logs** for suspicious activity
5. **Implement rate limiting** on the function if not already done
6. **Use Row Level Security (RLS)** on database tables (already enabled in migrations)

---

## Additional Resources

- **Supabase Edge Functions Docs:** https://supabase.com/docs/guides/functions
- **Supabase CLI Reference:** https://supabase.com/docs/reference/cli/introduction
- **OpenAI API Docs:** https://platform.openai.com/docs/api-reference
- **Your Project Dashboard:** https://supabase.com/dashboard/project/rcocfusrqrornukrnkln

---

## Quick Reference Commands

```bash
# Login
supabase login

# Link project
supabase link --project-ref rcocfusrqrornukrnkln

# Set secret
supabase secrets set KEY="value" --project-ref rcocfusrqrornukrnkln

# List secrets
supabase secrets list --project-ref rcocfusrqrornukrnkln

# Deploy function
supabase functions deploy api --project-ref rcocfusrqrornukrnkln

# View logs
supabase functions logs api --project-ref rcocfusrqrornukrnkln

# Test locally
supabase functions serve api

# Delete secret
supabase secrets unset KEY --project-ref rcocfusrqrornukrnkln
```

---

**Last Updated:** December 1, 2025
