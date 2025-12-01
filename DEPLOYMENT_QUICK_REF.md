# 🚀 Supabase Deployment Quick Reference

## Current Status

✅ **Database:** 127 migrations deployed  
⏳ **Edge Functions:** Pending deployment  
⏳ **Secrets:** Need configuration  

**Project:** `rcocfusrqrornukrnkln`  
**URL:** https://rcocfusrqrornukrnkln.supabase.co

---

## 3 Ways to Deploy Edge Functions

### 🤖 Method 1: GitHub Actions (CI/CD)

**Best for:** Teams, automated deployments, production

```bash
# 1. Set secrets (once)
gh secret set SUPABASE_PROJECT_REF_PROD --body "rcocfusrqrornukrnkln"
gh secret set SUPABASE_ACCESS_TOKEN_PROD --body "sbp_your_token"
gh secret set OPENAI_API_KEY --body "sk_your_key"

# 2. Deploy
git push origin main
```

**Or manually:** GitHub > Actions > Deploy Supabase Edge Functions > Run workflow

📖 Full guide: `GITHUB_ACTIONS_SETUP.md`

---

### ⚡ Method 2: Automated Script (Quickest)

**Best for:** Solo developers, local testing

```bash
./supabase-quick-deploy.sh
```

Prompts for:
- Supabase login
- OpenAI API key
- Optional: Database URL, Redis, etc.

---

### 🛠️ Method 3: Manual (Step-by-step)

**Best for:** Full control, troubleshooting

```bash
# 1. Login
supabase login

# 2. Link
supabase link --project-ref rcocfusrqrornukrnkln

# 3. Set secrets
supabase secrets set OPENAI_API_KEY="sk-your-key" --project-ref rcocfusrqrornukrnkln

# 4. Deploy
supabase functions deploy api --project-ref rcocfusrqrornukrnkln

# 5. Test
curl https://rcocfusrqrornukrnkln.supabase.co/functions/v1/api/health
```

📖 Full guide: `EDGE_FUNCTIONS_SETUP.md`

---

## Required Secrets

| Secret | Required? | Get From |
|--------|-----------|----------|
| `OPENAI_API_KEY` | ✅ **YES** | https://platform.openai.com/api-keys |
| `SUPABASE_URL` | Auto-set | N/A |
| `SUPABASE_ANON_KEY` | Auto-set | N/A |
| `DATABASE_URL` | Optional | Dashboard > Settings > Database |

---

## Quick Test

After deployment:

```bash
# Health check
curl https://rcocfusrqrornukrnkln.supabase.co/functions/v1/api/health

# Expected
{"status":"ok","timestamp":"..."}
```

---

## Edge Function Endpoints

**Base URL:** `https://rcocfusrqrornukrnkln.supabase.co/functions/v1`

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/health` | GET | ❌ | Health check |
| `/api/chat` | POST | ✅ | AI chat |
| `/api/rag` | POST | ✅ | Vector search |
| `/api/analytics` | POST | ✅ | Track events |

---

## Environment Variables

### Frontend (`.env.local`)
```env
NEXT_PUBLIC_SUPABASE_URL=https://rcocfusrqrornukrnkln.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Backend (`.env`)
```env
SUPABASE_URL=https://rcocfusrqrornukrnkln.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.rcocfusrqrornukrnkln.supabase.co:5432/postgres
```

**Full keys:** See `SETUP_COMPLETE.md`

---

## Common Commands

```bash
# View secrets
supabase secrets list --project-ref rcocfusrqrornukrnkln

# View logs
supabase functions logs api --project-ref rcocfusrqrornukrnkln

# Redeploy
supabase functions deploy api --project-ref rcocfusrqrornukrnkln

# Test locally
supabase functions serve api

# Delete secret
supabase secrets unset KEY --project-ref rcocfusrqrornukrnkln
```

---

## Troubleshooting

### ❌ "Access denied"
→ Check you're logged in as project owner: `supabase logout && supabase login`

### ❌ "OpenAI error"
→ Verify secret: `supabase secrets list --project-ref rcocfusrqrornukrnkln`  
→ Check API key has credits: https://platform.openai.com/usage

### ❌ "Function not responding"
→ Check logs: `supabase functions logs api --project-ref rcocfusrqrornukrnkln`  
→ Wait 30s for propagation, then retry

### ❌ "CORS error"
→ Ensure requests include `apikey` header with anon key

---

## Documentation Index

| Document | Purpose |
|----------|---------|
| 📄 `SETUP_COMPLETE.md` | **START HERE** - Overview |
| 🤖 `GITHUB_ACTIONS_SETUP.md` | CI/CD automation guide |
| 🛠️ `EDGE_FUNCTIONS_SETUP.md` | Manual setup (detailed) |
| 📋 `SUPABASE_SETUP_CHECKLIST.md` | Task tracking |
| 📊 `SUPABASE_DEPLOYMENT_SUMMARY.md` | What was deployed |
| ⚡ `supabase-quick-deploy.sh` | Automated script |

---

## Support

🌐 **Dashboard:** https://supabase.com/dashboard/project/rcocfusrqrornukrnkln  
📚 **Docs:** https://supabase.com/docs  
💬 **Discord:** https://discord.supabase.com

---

**Status:** Database ✅ | Functions ⏳ | Updated: 2025-12-01
