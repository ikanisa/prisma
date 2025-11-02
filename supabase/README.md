# Supabase Database Documentation

**Version:** 1.0.0  
**Last Updated:** 2025-11-02  
**Purpose:** Comprehensive guide to Prisma Glow database structure, migrations, RLS, and storage

---

## Table of Contents

1. [Overview](#overview)
2. [Database Structure](#database-structure)
3. [Migrations](#migrations)
4. [Row Level Security (RLS)](#row-level-security-rls)
5. [Storage & Signed URLs](#storage--signed-urls)
6. [Edge Functions](#edge-functions)
7. [Backup & Restore](#backup--restore)
8. [Troubleshooting](#troubleshooting)

---

## Overview

Prisma Glow uses **Supabase** (PostgreSQL 15) with:

- **119 migrations** managing schema evolution
- **Row Level Security (RLS)** enforcing multi-tenant isolation
- **Private storage buckets** with signed URL access
- **Edge functions** (Deno) for server-side operations
- **pgvector** extension for semantic search
- **PostgREST** API for direct database access

### Connection Details

```env
# Supabase project
SUPABASE_URL="https://[project-id].supabase.co"
SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"  # Server-side only
SUPABASE_JWT_SECRET="<jwt-secret>"

# Database direct connection
DATABASE_URL="postgresql://postgres:[password]@db.[project-id].supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:[password]@db.[project-id].supabase.co:6543/postgres?pgbouncer=true"
```

**Ports:**
- `5432` - Direct PostgreSQL connection
- `6543` - PgBouncer (connection pooling)

---

## Database Structure

### Key Tables

| Table | Purpose | RLS Enabled |
|-------|---------|-------------|
| `organizations` | Multi-tenant organization data | ✅ Yes |
| `memberships` | User-organization relationships | ✅ Yes |
| `documents` | Document metadata | ✅ Yes |
| `tasks` | Task management | ✅ Yes |
| `journal_entries` | Accounting journal entries | ✅ Yes |
| `accounts` | Chart of accounts | ✅ Yes |
| `audit_procedures` | Audit workflow tracking | ✅ Yes |
| `tax_calculations` | Tax computation results | ✅ Yes |
| `agent_sessions` | AI agent interaction logs | ✅ Yes |
| `embeddings` | Vector embeddings for RAG | ✅ Yes |
| `workflows` | Workflow definitions and runs | ✅ Yes |
| `approvals` | Approval requests and decisions | ✅ Yes |

### Extensions

```sql
-- Enabled PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";       -- Encryption functions
CREATE EXTENSION IF NOT EXISTS "pg_trgm";        -- Fuzzy text search
CREATE EXTENSION IF NOT EXISTS "vector";         -- pgvector for embeddings
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements"; -- Query performance
```

### Schemas

```
public/          -- Main application schema
auth/            -- Supabase auth (managed by Supabase)
storage/         -- Storage metadata (managed by Supabase)
```

---

## Migrations

### Migration Files

**Location:** `supabase/migrations/`  
**Total:** 119 migration files  
**Naming:** `YYYYMMDDHHMMSS_description.sql` or `YYYYMMDDHHMMSS_uuid.sql`

**Examples:**
```
002_vat_rules_seed.sql
003_indexes.sql
20250821115117_.sql
20250824085632_c57fe3ce-db8b-4f21-863e-e37b10dab301.sql
```

### Migration Order

Migrations are applied in **alphanumeric order** by filename. The timestamp prefix ensures correct sequencing.

### Applying Migrations

#### Development (Local)

```bash
# Using Supabase CLI
supabase db reset                    # Reset and reapply all migrations
supabase migration up                # Apply pending migrations
supabase migration list              # List migration status

# Manual application
psql "$DATABASE_URL" -f supabase/migrations/YYYYMMDDHHMMSS_name.sql
```

#### Production/Staging

```bash
# Via Supabase Dashboard
# 1. Navigate to Database → Migrations
# 2. Click "Run migration"
# 3. Select migration file or paste SQL

# Via Supabase CLI (recommended for CI/CD)
supabase db push                     # Push local migrations to remote

# Manual application (with transaction)
psql "$DATABASE_URL" << 'EOF'
BEGIN;
\i supabase/migrations/YYYYMMDDHHMMSS_name.sql
COMMIT;
EOF
```

### Creating New Migrations

```bash
# Create new migration
supabase migration new "add_column_to_table"

# Edit the generated file
# supabase/migrations/YYYYMMDDHHMMSS_add_column_to_table.sql

# Example migration content:
```

```sql
-- Add new column to organizations table
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS region TEXT;

-- Update RLS policies if needed
CREATE POLICY "Users can view their org region" ON organizations
  FOR SELECT
  USING (is_member_of(id));

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_organizations_region ON organizations(region);
```

### Migration Best Practices

✅ **DO:**
- Make migrations **idempotent** (use `IF EXISTS`, `IF NOT EXISTS`)
- Include **rollback** instructions in comments
- Test migrations in staging before production
- Use transactions (`BEGIN`...`COMMIT`)
- Add indexes for new foreign keys
- Update RLS policies when adding tables/columns

❌ **DON'T:**
- Drop tables without backup
- Remove RLS policies without replacement
- Break referential integrity
- Run DDL outside transactions
- Skip testing in non-production environment

### Idempotent Migration Example

```sql
-- ✅ Good: Idempotent
ALTER TABLE documents ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_documents_processed_at ON documents(processed_at);

-- ❌ Bad: Not idempotent (fails if run twice)
ALTER TABLE documents ADD COLUMN processed_at TIMESTAMPTZ;
CREATE INDEX idx_documents_processed_at ON documents(processed_at);
```

### Rollback Procedures

**Option 1: Create explicit down migration**

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_add_column_rollback.sql
ALTER TABLE documents DROP COLUMN IF EXISTS processed_at;
DROP INDEX IF EXISTS idx_documents_processed_at;
```

**Option 2: Document rollback in comments**

```sql
-- Migration: Add processed_at column
-- Rollback: ALTER TABLE documents DROP COLUMN IF EXISTS processed_at;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;
```

**Option 3: Restore from backup** (last resort)

---

## Row Level Security (RLS)

### Purpose

RLS enforces multi-tenant data isolation at the database level, ensuring users can only access data within their organization.

### Core RLS Helpers

**Location:** Embedded in migration files

```sql
-- Check if user is member of organization
CREATE OR REPLACE FUNCTION is_member_of(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM memberships
    WHERE organization_id = org_id
      AND user_id = auth.uid()
      AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user has minimum required role
CREATE OR REPLACE FUNCTION has_min_role(org_id UUID, min_role TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  role_ranks JSONB := '{"READONLY": 30, "CLIENT": 40, "EMPLOYEE": 50, "MANAGER": 70, "EQR": 75, "PARTNER": 90, "SYSTEM_ADMIN": 100}'::JSONB;
BEGIN
  SELECT role INTO user_role
  FROM memberships
  WHERE organization_id = org_id
    AND user_id = auth.uid()
    AND status = 'active';
  
  IF user_role IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN (role_ranks->>user_role)::INT >= (role_ranks->>min_role)::INT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### RLS Policy Examples

#### Organizations Table

```sql
-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Users can view organizations they're members of
CREATE POLICY "Users can view their organizations"
  ON organizations FOR SELECT
  USING (is_member_of(id));

-- Only SYSTEM_ADMIN can create organizations
CREATE POLICY "System admins can create organizations"
  ON organizations FOR INSERT
  WITH CHECK (has_min_role(id, 'SYSTEM_ADMIN'));

-- PARTNER or higher can update their organizations
CREATE POLICY "Partners can update their organizations"
  ON organizations FOR UPDATE
  USING (is_member_of(id) AND has_min_role(id, 'PARTNER'));
```

#### Documents Table

```sql
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Users can view documents in their organization
CREATE POLICY "Users can view org documents"
  ON documents FOR SELECT
  USING (is_member_of(organization_id));

-- Users can upload documents (EMPLOYEE or higher)
CREATE POLICY "Employees can upload documents"
  ON documents FOR INSERT
  WITH CHECK (
    is_member_of(organization_id)
    AND has_min_role(organization_id, 'EMPLOYEE')
  );

-- Users can update their own documents or if MANAGER+
CREATE POLICY "Users can update documents"
  ON documents FOR UPDATE
  USING (
    is_member_of(organization_id)
    AND (
      created_by = auth.uid()
      OR has_min_role(organization_id, 'MANAGER')
    )
  );
```

### Testing RLS

```sql
-- Set user context
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "user-uuid-here"}';

-- Test SELECT policy
SELECT * FROM documents;  -- Should only return user's org documents

-- Test INSERT policy
INSERT INTO documents (organization_id, name, created_by)
VALUES ('org-uuid', 'test.pdf', auth.uid());  -- Should succeed or fail based on role

-- Reset context
RESET role;
```

### RLS Best Practices

✅ **DO:**
- Always enable RLS on tenant-scoped tables
- Use helper functions for complex checks
- Test policies thoroughly
- Document policy logic in comments
- Use `SECURITY DEFINER` for helper functions

❌ **DON'T:**
- Disable RLS on tables with sensitive data
- Use `USING (true)` policies (bypasses security)
- Forget to create policies for all operations (SELECT, INSERT, UPDATE, DELETE)
- Assume RLS applies to `postgres` superuser (it doesn't)

---

## Storage & Signed URLs

### Storage Buckets

**Location:** Supabase Dashboard → Storage

| Bucket | Purpose | Public | RLS Policies |
|--------|---------|--------|--------------|
| `documents` | User-uploaded documents | ❌ Private | Organization-scoped |
| `evidence` | Audit evidence files | ❌ Private | Organization-scoped |
| `exports` | Generated exports (CSV, PDF) | ❌ Private | User-scoped |
| `avatars` | User avatars | ✅ Public | User-scoped |

### Storage RLS Policies

**Location:** `supabase/migrations/*_storage_policy.sql`

```sql
-- Documents bucket: Organization members can upload/download
CREATE POLICY "Org members can upload documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents'
    AND is_member_of((storage.foldername(name))[1]::UUID)
  );

CREATE POLICY "Org members can download documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents'
    AND is_member_of((storage.foldername(name))[1]::UUID)
  );
```

### Signed URLs

**Purpose:** Provide temporary, secure access to private files

**Backend Implementation:**

```python
# Python (FastAPI)
from supabase import Client

def generate_signed_url(file_path: str, ttl: int = 300) -> str:
    """Generate signed URL for private file.
    
    Args:
        file_path: Path in storage bucket (e.g., "documents/org-id/file.pdf")
        ttl: Time-to-live in seconds (default: 5 minutes)
    
    Returns:
        Temporary signed URL
    """
    supabase: Client = get_supabase_client()
    
    response = supabase.storage.from_("documents").create_signed_url(
        path=file_path,
        expires_in=ttl
    )
    
    return response["signedURL"]
```

```typescript
// TypeScript (Node.js)
import { createClient } from '@supabase/supabase-js';

async function generateSignedUrl(filePath: string, ttl: number = 300): Promise<string> {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUrl(filePath, ttl);
  
  if (error) throw error;
  return data.signedUrl;
}
```

**Configuration:**

```env
# Signed URL TTL (seconds)
SIGNED_URL_DEFAULT_TTL_SECONDS="300"       # 5 minutes
SIGNED_URL_EVIDENCE_TTL_SECONDS="300"      # 5 minutes for audit evidence
```

### Upload Process

```typescript
// 1. Get signed upload URL
const { data: uploadData } = await supabase.storage
  .from('documents')
  .createSignedUploadUrl(`${orgId}/${filename}`);

// 2. Upload file to signed URL
await fetch(uploadData.signedUrl, {
  method: 'PUT',
  body: file,
  headers: { 'Content-Type': file.type }
});

// 3. File is now accessible via signed download URLs
```

---

## Edge Functions

**Location:** `supabase/functions/`

Edge functions are Deno-based serverless functions running on Supabase infrastructure.

### Available Functions

```
supabase/functions/
├── hello/                  # Example function
├── webhook-handler/        # Process webhooks
└── scheduled-tasks/        # Cron jobs
```

### Deploying Functions

```bash
# Deploy all functions
supabase functions deploy

# Deploy specific function
supabase functions deploy webhook-handler

# Invoke function locally
supabase functions serve webhook-handler

# Invoke deployed function
curl -X POST https://[project-id].supabase.co/functions/v1/webhook-handler \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -d '{"event": "test"}'
```

---

## Backup & Restore

### Automated Backups

Supabase provides automatic daily backups (retained 7 days on free tier, 30+ days on paid plans).

**Access:** Supabase Dashboard → Database → Backups

### Manual Backup

```bash
# Full database dump
pg_dump "$DATABASE_URL" > backup-$(date +%Y%m%d-%H%M%S).sql

# Compressed backup
pg_dump "$DATABASE_URL" | gzip > backup-$(date +%Y%m%d-%H%M%S).sql.gz

# Schema only
pg_dump --schema-only "$DATABASE_URL" > schema-$(date +%Y%m%d).sql

# Data only
pg_dump --data-only "$DATABASE_URL" > data-$(date +%Y%m%d).sql

# Specific tables
pg_dump "$DATABASE_URL" -t organizations -t memberships > orgs-backup.sql
```

### Restore from Backup

```bash
# Restore full database (WARNING: Destructive)
psql "$DATABASE_URL" < backup-20251102-120000.sql

# Restore compressed backup
gunzip -c backup-20251102-120000.sql.gz | psql "$DATABASE_URL"

# Restore specific table
psql "$DATABASE_URL" -c "TRUNCATE TABLE organizations CASCADE;"
psql "$DATABASE_URL" < orgs-backup.sql
```

### Point-in-Time Recovery (PITR)

Available on Supabase Pro tier and above.

**Recovery:**
1. Navigate to Supabase Dashboard → Database → Backups
2. Select "Point in Time Recovery"
3. Choose timestamp
4. Initiate restore

---

## Troubleshooting

### Connection Issues

#### "Connection refused"

**Cause:** Database not accessible  
**Solution:**
```bash
# Check if database is running
pg_isready -h db.[project-id].supabase.co -p 5432

# Verify credentials
psql "$DATABASE_URL" -c "SELECT 1;"
```

#### "Too many connections"

**Cause:** Connection pool exhausted  
**Solution:**
```bash
# Use PgBouncer pooled connection
DIRECT_URL="postgresql://...@db.[project-id].supabase.co:6543/postgres?pgbouncer=true"

# Or increase connection limit in Supabase Dashboard → Database → Settings
```

### RLS Issues

#### "Permission denied for table"

**Cause:** RLS policy blocking access  
**Solution:**
```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'documents';

-- Verify user context
SELECT auth.uid();  -- Should return user UUID

-- Temporarily bypass RLS for debugging (use carefully!)
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
```

#### "RLS policy not applying"

**Cause:** Using `postgres` superuser (bypasses RLS)  
**Solution:** Use `authenticated` role or specific user for testing

### Migration Errors

#### "Relation already exists"

**Cause:** Non-idempotent migration  
**Solution:** Make migration idempotent with `IF NOT EXISTS`

#### "Cannot drop table: foreign key constraint"

**Cause:** Other tables reference this table  
**Solution:**
```sql
-- Drop with cascade (use carefully!)
DROP TABLE table_name CASCADE;

-- Or drop foreign keys first
ALTER TABLE other_table DROP CONSTRAINT fk_constraint_name;
```

### Performance Issues

#### Slow Queries

```sql
-- Enable query logging
ALTER SYSTEM SET log_min_duration_statement = 1000;  -- Log queries >1s

-- Check slow queries
SELECT * FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;

-- Analyze query plan
EXPLAIN ANALYZE SELECT * FROM documents WHERE organization_id = 'uuid';
```

#### Missing Indexes

```sql
-- Check for missing indexes on foreign keys
SELECT
  c.conrelid::regclass AS table_name,
  a.attname AS column_name
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
WHERE c.contype = 'f'  -- Foreign key
  AND NOT EXISTS (
    SELECT 1 FROM pg_index i
    WHERE i.indrelid = c.conrelid AND a.attnum = ANY(i.indkey)
  );

-- Create missing index
CREATE INDEX idx_table_column ON table_name(column_name);
```

---

## Additional Resources

- **Supabase Documentation:** https://supabase.com/docs
- **PostgreSQL 15 Docs:** https://www.postgresql.org/docs/15/
- **pgvector:** https://github.com/pgvector/pgvector
- **Row Level Security:** https://supabase.com/docs/guides/auth/row-level-security

---

**Last Updated:** 2025-11-02  
**Maintainer:** Database Team  
**Related:** `ENV_GUIDE.md`, `.env.example`, `server/db.py`
