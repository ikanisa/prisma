# Supabase Database Operations Guide

## Overview

This guide documents database migration procedures, RLS policy patterns, storage architecture, and operational procedures for the Prisma Glow PostgreSQL database (Supabase-hosted).

**Database:** PostgreSQL 15 + pgvector 0.7.0  
**Migrations:** 119 files in `supabase/migrations/`  
**Tables:** 35 core + extension tables  
**RLS Policies:** 87 policies across all tables

---

## Migration Procedures

### Running Migrations

**Development:**
```bash
# Apply all pending migrations
supabase db push

# Apply specific migration
psql "$DATABASE_URL" -f supabase/migrations/20251120_name.sql

# Verify migration
supabase db diff
```

**Production:**
```bash
# Step 1: Backup
pg_dump "$DATABASE_URL" > backup_$(date +%Y%m%d_%H%M%S).sql

# Step 2: Test on staging
psql "$STAGING_DATABASE_URL" -f supabase/migrations/20251120_name.sql

# Step 3: Apply to production (within maintenance window)
psql "$DATABASE_URL" -f supabase/migrations/20251120_name.sql

# Step 4: Verify
psql "$DATABASE_URL" -c "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 5;"
```

### Creating New Migrations

**Template:**
```sql
-- Migration: 20251120120000_add_feature_x.sql
-- Description: Add feature X to support Y
-- Author: @username
-- Date: 2025-11-20

BEGIN;

-- Tables
CREATE TABLE IF NOT EXISTS feature_x (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_feature_x_org ON feature_x(organization_id) WHERE deleted_at IS NULL;

-- RLS Policies
ALTER TABLE feature_x ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view org feature_x"
  ON feature_x FOR SELECT
  USING (is_member_of(organization_id));

CREATE POLICY "Managers modify org feature_x"
  ON feature_x FOR ALL
  USING (has_min_role(organization_id, 'MANAGER'));

-- Triggers
CREATE TRIGGER set_updated_at BEFORE UPDATE ON feature_x
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;
```

---

## RLS Policy Patterns

### Helper Functions

```sql
-- Check organization membership
CREATE OR REPLACE FUNCTION is_member_of(org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships
    WHERE user_id = auth.uid()
      AND organization_id = org_id
      AND deleted_at IS NULL
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Check minimum role
CREATE OR REPLACE FUNCTION has_min_role(org_id UUID, min_role TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships m
    JOIN LATERAL (
      VALUES 
        ('SYSTEM_ADMIN', 1), ('PARTNER', 2), ('EQR', 3),
        ('MANAGER', 4), ('EMPLOYEE', 5), ('CLIENT', 6),
        ('READONLY', 7), ('SERVICE_ACCOUNT', 8)
    ) AS role_precedence(name, precedence) ON m.role::TEXT = role_precedence.name
    JOIN LATERAL (
      SELECT precedence AS min_precedence
      FROM (VALUES ('SYSTEM_ADMIN', 1), ('PARTNER', 2), ('EQR', 3),
                   ('MANAGER', 4), ('EMPLOYEE', 5), ('CLIENT', 6),
                   ('READONLY', 7), ('SERVICE_ACCOUNT', 8)) AS rp(name, precedence)
      WHERE rp.name = min_role
    ) AS mp ON role_precedence.precedence <= mp.min_precedence
    WHERE m.user_id = auth.uid()
      AND m.organization_id = org_id
      AND m.deleted_at IS NULL
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Check client portal scope
CREATE OR REPLACE FUNCTION is_client_portal_allowed(folder TEXT)
RETURNS BOOLEAN AS $$
  SELECT folder IN ('02_Tax/PBC', '03_Accounting/PBC', '05_Payroll/PBC');
$$ LANGUAGE SQL IMMUTABLE;
```

### Common Policy Patterns

**1. Organization-Scoped SELECT (most tables):**
```sql
CREATE POLICY "Users view org resources"
  ON table_name FOR SELECT
  USING (is_member_of(organization_id));
```

**2. Role-Based INSERT/UPDATE/DELETE:**
```sql
CREATE POLICY "Managers modify org resources"
  ON table_name FOR ALL
  USING (has_min_role(organization_id, 'MANAGER'))
  WITH CHECK (has_min_role(organization_id, 'MANAGER'));
```

**3. Client Portal Restrictions:**
```sql
CREATE POLICY "Clients view PBC documents only"
  ON documents FOR SELECT
  USING (
    is_member_of(organization_id) AND
    (
      has_min_role(organization_id, 'EMPLOYEE') OR
      (has_min_role(organization_id, 'CLIENT') AND is_client_portal_allowed(repo_folder))
    )
  );
```

**4. Approval Gate Policies:**
```sql
CREATE POLICY "Only partners can lock close"
  ON accounting_close FOR UPDATE
  USING (has_min_role(organization_id, 'PARTNER'))
  WITH CHECK (
    has_min_role(organization_id, 'PARTNER') AND
    (OLD.locked_at IS NULL OR NEW.locked_at = OLD.locked_at)  -- Cannot unlock
  );
```

---

## Storage Architecture

### Buckets

**Public Buckets:**
- `avatars` - User profile images (public read)
- `logos` - Organization logos (public read)

**Private Buckets:**
- `documents` - Document files (RLS enforced)
- `evidence` - Audit evidence (RLS enforced)
- `exports` - Generated reports/exports (RLS enforced)

### Storage RLS Policies

```sql
-- Documents bucket: org members can upload/view
CREATE POLICY "Org members upload documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents' AND
    is_member_of((storage.foldername(name))[1]::UUID)
  );

CREATE POLICY "Org members view documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents' AND
    is_member_of((storage.foldername(name))[1]::UUID)
  );
```

### File Path Convention

```
/{bucket}/{org_id}/{entity_id}/{repo_folder}/{filename}

Example:
/documents/a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6/e1e2e3e4-e5e6-e7e8-e9e0-e1e2e3e4e5e6/02_Tax/2024_CIT_Return.pdf
```

---

## Backup & Restore

### Backup Procedures

**Automated Backups:**
Supabase performs automatic daily backups with 7-day retention (Pro plan).

**Manual Backup:**
```bash
# Full database dump
pg_dump "$DATABASE_URL" \
  --format=custom \
  --file=backup_$(date +%Y%m%d_%H%M%S).dump

# Schema only
pg_dump "$DATABASE_URL" \
  --schema-only \
  --file=schema_$(date +%Y%m%d_%H%M%S).sql

# Data only
pg_dump "$DATABASE_URL" \
  --data-only \
  --file=data_$(date +%Y%m%d_%H%M%S).sql
```

### Restore Procedures

**From Supabase Dashboard:**
1. Navigate to Database → Backups
2. Select backup date
3. Click "Restore"
4. Confirm downtime warning

**From Manual Backup:**
```bash
# Full restore (drops existing data)
pg_restore --clean --if-exists \
  --dbname="$DATABASE_URL" \
  backup_20251120_120000.dump

# Selective table restore
pg_restore --data-only --table=documents \
  --dbname="$DATABASE_URL" \
  backup_20251120_120000.dump
```

---

## Performance Tuning

### Essential Indexes

```sql
-- Organization-scoped queries (most frequent)
CREATE INDEX idx_table_org_id ON table_name(organization_id) WHERE deleted_at IS NULL;

-- Soft delete queries
CREATE INDEX idx_table_active ON table_name(id) WHERE deleted_at IS NULL;

-- Timestamp range queries
CREATE INDEX idx_table_created_at ON table_name(created_at DESC);

-- Foreign key joins
CREATE INDEX idx_table_ref_id ON table_name(reference_id);

-- Full-text search
CREATE INDEX idx_documents_search ON documents USING GIN(to_tsvector('english', content));

-- Vector similarity search (pgvector)
CREATE INDEX idx_embeddings_vector ON document_embeddings 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

### Query Optimization

**Use EXPLAIN ANALYZE:**
```sql
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM documents 
WHERE organization_id = 'a1b2c3d4-...' 
  AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 20;
```

**Common Issues & Fixes:**
- Sequential scans → Add index on filter columns
- High buffer usage → Increase `shared_buffers`
- Index not used → Add `WHERE deleted_at IS NULL` to index
- Slow joins → Add index on foreign key columns

---

## Rollback Procedures

### Migration Rollback

**For Schema Changes:**
```sql
-- Reverse migration template
BEGIN;

-- Drop new objects
DROP TABLE IF EXISTS new_table CASCADE;
DROP INDEX IF EXISTS idx_new_column;

-- Restore old structure (if altered)
ALTER TABLE old_table DROP COLUMN IF EXISTS new_column;

COMMIT;
```

**For Data Migrations:**
```bash
# Restore from backup taken before migration
pg_restore --clean --if-exists \
  --dbname="$DATABASE_URL" \
  backup_before_migration.dump
```

### RLS Policy Rollback

```sql
-- Drop new policies
DROP POLICY IF EXISTS "New policy name" ON table_name;

-- Restore old policies
CREATE POLICY "Old policy name"
  ON table_name FOR SELECT
  USING (old_condition);
```

---

## Monitoring & Alerts

### Health Checks

```sql
-- Check replication lag
SELECT 
  EXTRACT(EPOCH FROM (NOW() - pg_last_xact_replay_timestamp())) AS lag_seconds;

-- Check table bloat
SELECT 
  schemaname, tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;

-- Check slow queries
SELECT 
  pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active' AND now() - pg_stat_activity.query_start > interval '5 seconds';
```

### Alert Thresholds

- **Replication lag > 10s** → Page on-call
- **Connection pool exhaustion > 90%** → Scale up
- **Query duration > 30s** → Investigate + optimize
- **Disk usage > 80%** → Expand storage

---

## pgTAP Testing

### Test Structure

```sql
-- tests/001_rls_policies.sql
BEGIN;

SELECT plan(5);

-- Test organization scoping
SELECT is(
  (SELECT COUNT(*) FROM documents WHERE organization_id = 'a1b2...' AND deleted_at IS NULL),
  10,
  'User can view 10 documents in their org'
);

-- Test role-based access
SELECT throws_ok(
  'INSERT INTO journals (organization_id, amount) VALUES (''a1b2...'', 1000)',
  'new row violates row-level security policy',
  'EMPLOYEE role cannot post journals'
);

SELECT finish();
ROLLBACK;
```

### Running Tests

```bash
# Install pgTAP
CREATE EXTENSION IF NOT EXISTS pgtap;

# Run tests
psql "$DATABASE_URL" -f tests/001_rls_policies.sql
```

---

## Version History

- **v1.0.0** (2025-11-02): Initial database operations guide
- 119 migrations documented
- 87 RLS policies inventoried
