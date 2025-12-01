# Supabase Setup Checklist

## ✅ Completed

- [x] Database migrations deployed (127 migrations)
- [x] Tables created
- [x] RLS policies configured
- [x] Extensions installed (vector, pgcrypto, uuid-ossp, etc.)
- [x] Functions and triggers created
- [x] Configuration updated (supabase/config.toml)

## ⚠️ TODO - Required

- [ ] **Login to Supabase CLI**
  ```bash
  supabase login
  ```

- [ ] **Link to project**
  ```bash
  supabase link --project-ref rcocfusrqrornukrnkln
  ```

- [ ] **Set OpenAI API Key** (REQUIRED)
  ```bash
  supabase secrets set OPENAI_API_KEY="sk-your-key-here" --project-ref rcocfusrqrornukrnkln
  ```
  Get key from: https://platform.openai.com/api-keys

- [ ] **Deploy Edge Function**
  ```bash
  supabase functions deploy api --project-ref rcocfusrqrornukrnkln
  ```

- [ ] **Test Edge Function**
  ```bash
  curl https://rcocfusrqrornukrnkln.supabase.co/functions/v1/api/health
  ```
  Expected: `{"status":"ok","timestamp":"..."}`

## 📋 Optional - Recommended

- [ ] **Set Database URL secret** (for direct DB access from functions)
  ```bash
  supabase secrets set DATABASE_URL="postgresql://postgres:[PASSWORD]@db.rcocfusrqrornukrnkln.supabase.co:5432/postgres" --project-ref rcocfusrqrornukrnkln
  ```

- [ ] **Set Redis URL** (if using Redis for caching)
  ```bash
  supabase secrets set REDIS_URL="redis://..." --project-ref rcocfusrqrornukrnkln
  ```

- [ ] **Set Sentry DSN** (for error tracking)
  ```bash
  supabase secrets set SENTRY_DSN="https://..." --project-ref rcocfusrqrornukrnkln
  ```

- [ ] **Configure custom domain** (in Supabase dashboard)

- [ ] **Set up monitoring alerts** (in Supabase dashboard)

- [ ] **Enable backups** (in Supabase dashboard - Settings > Database > Backups)

## 🔧 Application Configuration

- [ ] **Update frontend .env**
  ```env
  NEXT_PUBLIC_SUPABASE_URL=https://rcocfusrqrornukrnkln.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  ```

- [ ] **Update backend .env**
  ```env
  SUPABASE_URL=https://rcocfusrqrornukrnkln.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  DATABASE_URL=postgresql://postgres:[PASSWORD]@db.rcocfusrqrornukrnkln.supabase.co:5432/postgres
  ```

- [ ] **Test frontend connection** (login, data fetch)

- [ ] **Test backend connection** (API calls, DB queries)

- [ ] **Test edge function integration** (chat, RAG, analytics)

## 🔍 Verification

- [ ] **Check tables in dashboard**
  Dashboard > Table Editor

- [ ] **Verify RLS policies**
  Dashboard > Authentication > Policies

- [ ] **Check edge function logs**
  ```bash
  supabase functions logs api --project-ref rcocfusrqrornukrnkln
  ```

- [ ] **Monitor database performance**
  Dashboard > Database > Query Performance

- [ ] **Review storage usage**
  Dashboard > Storage

## 📚 Documentation

- [x] Migration summary: `SUPABASE_DEPLOYMENT_SUMMARY.md`
- [x] Edge functions guide: `EDGE_FUNCTIONS_SETUP.md`
- [x] Deployment script: `deploy-migrations.sh`
- [x] Setup script: `setup-edge-functions.sh`

## 🚀 Quick Reference

**Project ID:** `rcocfusrqrornukrnkln`

**Dashboard:** https://supabase.com/dashboard/project/rcocfusrqrornukrnkln

**API URL:** https://rcocfusrqrornukrnkln.supabase.co

**Edge Function:** https://rcocfusrqrornukrnkln.supabase.co/functions/v1/api

**Database:** 
```
Host: db.rcocfusrqrornukrnkln.supabase.co
Port: 5432
Database: postgres
User: postgres
```

## ❓ Need Help?

- **Detailed setup:** See `EDGE_FUNCTIONS_SETUP.md`
- **Deployment summary:** See `SUPABASE_DEPLOYMENT_SUMMARY.md`
- **Supabase docs:** https://supabase.com/docs
- **CLI reference:** https://supabase.com/docs/reference/cli

---

**Created:** December 1, 2025  
**Status:** Database deployed ✅ | Edge functions pending ⚠️
