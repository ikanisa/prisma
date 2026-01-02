# Supabase Complete Deployment Guide (MCP + PAT)

## 🎯 Overview

This guide provides a comprehensive solution for deploying all Supabase migrations and edge functions to production using Personal Access Token (PAT) and MCP servers.

## 📋 Prerequisites

1. **Supabase CLI** installed: `npm install -g supabase`
2. **Personal Access Token (PAT)**: `sbp_0bcb6e5564364a7979aaf07eb719b41cd727ff3c`
3. **Project Details**:
   - Project ID: `rcocfusrqrornukrnkln`
   - URL: `https://rcocfusrqrornukrnkln.supabase.co`

## 🚀 Quick Start

### Option 1: Automated Deployment (Recommended)

```bash
# Set the PAT
export SUPABASE_PAT=sbp_0bcb6e5564364a7979aaf07eb719b41cd727ff3c

# Optionally set database password if needed
export SUPABASE_DB_PASSWORD=your_db_password

# Run the deployment script
./scripts/deploy-supabase-all.sh
```

### Option 2: Manual Step-by-Step

```bash
# 1. Authenticate
export SUPABASE_ACCESS_TOKEN=sbp_0bcb6e5564364a7979aaf07eb719b41cd727ff3c
supabase login

# 2. Link to project
supabase link --project-ref rcocfusrqrornukrnkln

# 3. Push all migrations
supabase db push --project-ref rcocfusrqrornukrnkln

# 4. Deploy edge functions
supabase functions deploy api --project-ref rcocfusrqrornukrnkln
```

## 📦 What Gets Deployed

### Database Migrations
- **Total**: 151 migration files
- **Size**: ~970 KB
- **Lines**: ~25,877 lines of SQL
- **Coverage**:
  - Core schema (profiles, organizations, documents)
  - AI/Agent system with vector embeddings
  - Audit & compliance modules
  - Tax modules (VAT, CIT, Pillar Two, DAC6)
  - Accounting features
  - Document management
  - RLS policies
  - Functions and triggers

### Edge Functions
- **API Function** (`/functions/api/`)
  - `/api/health` - Health check endpoint
  - `/api/chat` - AI chat endpoint
  - `/api/rag` - Vector search/RAG endpoint
  - `/api/analytics` - Analytics event tracking

## 🔧 Scripts Available

### 1. `scripts/deploy-supabase-all.sh`
**Main deployment script** - Handles everything:
- Authentication with PAT
- Project linking
- Migration application
- Edge function deployment
- Validation

**Usage:**
```bash
export SUPABASE_PAT=your_pat
./scripts/deploy-supabase-all.sh
```

### 2. `scripts/apply-all-migrations-via-mcp.sh`
**Migration preparation script** - Generates manifest:
- Lists all migrations
- Generates statistics
- Creates migration manifest JSON

**Usage:**
```bash
./scripts/apply-all-migrations-via-mcp.sh
```

### 3. `scripts/deploy-supabase-mcp.ts`
**TypeScript preparation script** - Validates and prepares:
- Reads all migration files
- Validates SQL syntax
- Generates migration report

**Usage:**
```bash
tsx scripts/deploy-supabase-mcp.ts
```

## 📊 Migration Manifest

After running `apply-all-migrations-via-mcp.sh`, a manifest file is generated:

**Location**: `.supabase-migrations-manifest.json`

**Contains**:
- Project reference
- Total migration count
- Individual migration details:
  - Filename
  - Version
  - Path
  - Line count
  - Size
  - Description

## 🔐 Using MCP Tools

If you prefer to use MCP Supabase tools directly:

### List Current Migrations
```bash
# Via MCP (requires MCP server connection)
# This will show what's already applied
```

### Apply a Single Migration
```python
# Example using MCP apply_migration
mcp_supabase_apply_migration(
    name="migration_name",
    query="<SQL_CONTENT>"
)
```

### Apply All Migrations (Batch)
For 151 migrations, it's recommended to use `supabase db push` which handles:
- Dependency resolution
- Transaction management
- Rollback on failure
- Migration tracking

## ✅ Validation

After deployment, validate:

1. **Check Migration Status**
   ```bash
   supabase migration list --project-ref rcocfusrqrornukrnkln
   ```

2. **Test Health Endpoint**
   ```bash
   curl https://rcocfusrqrornukrnkln.supabase.co/functions/v1/api/health
   ```

3. **Verify Tables**
   ```bash
   # Via Supabase Dashboard or MCP
   mcp_supabase_list_tables
   ```

## 🛠️ Troubleshooting

### Issue: Authentication Failed
**Solution:**
```bash
export SUPABASE_ACCESS_TOKEN=sbp_0bcb6e5564364a7979aaf07eb719b41cd727ff3c
supabase logout
supabase login
```

### Issue: Migration Conflicts
**Solution:**
- Check migration history: `supabase migration list`
- Review conflicting migrations
- Manually resolve conflicts if needed
- Re-run deployment

### Issue: Edge Function Deployment Failed
**Solution:**
- Check function code syntax
- Verify secrets are set: `supabase secrets list`
- Check function logs: `supabase functions logs api --project-ref rcocfusrqrornukrnkln`

### Issue: Database Connection Failed
**Solution:**
- Set `SUPABASE_DB_PASSWORD` environment variable
- Verify database password in Supabase dashboard
- Check network connectivity

## 📝 Migration Files

All migrations are located in: `supabase/migrations/`

**Key migrations:**
- `001_initial_schema.sql` - Core schema
- `20260128000000_ai_agent_system_comprehensive.sql` - AI agent system
- `20260201190000_agent_testing_schema.sql` - Latest migration

## 🔄 Deployment Workflow

1. **Preparation**
   ```bash
   ./scripts/apply-all-migrations-via-mcp.sh
   ```

2. **Review Manifest**
   ```bash
   cat .supabase-migrations-manifest.json
   ```

3. **Deploy**
   ```bash
   export SUPABASE_PAT=your_pat
   ./scripts/deploy-supabase-all.sh
   ```

4. **Validate**
   ```bash
   curl https://rcocfusrqrornukrnkln.supabase.co/functions/v1/api/health
   ```

## 📚 Additional Resources

- **Supabase Dashboard**: https://supabase.com/dashboard/project/rcocfusrqrornukrnkln
- **API Documentation**: https://rcocfusrqrornukrnkln.supabase.co
- **Migration Guide**: See `SUPABASE_DEPLOYMENT.md`

## 🎉 Success Criteria

Deployment is successful when:
- ✅ All 151 migrations applied
- ✅ Edge functions deployed
- ✅ Health endpoint responds
- ✅ No migration errors in logs
- ✅ All tables created with RLS enabled

---

**Last Updated**: $(date)
**Version**: 1.0.0

