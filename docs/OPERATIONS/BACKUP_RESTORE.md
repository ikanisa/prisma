# Database Backup and Restore Procedures
## Prisma Glow - Production Operations

**Last Updated:** January 2026  
**Status:** Production Ready

---

## Overview

This document describes the backup and restore procedures for Prisma Glow's Supabase PostgreSQL database.

---

## Backup Procedures

### Automatic Backups (Supabase)

Supabase provides automatic daily backups for all projects:
- **Frequency:** Daily at 2:00 AM UTC
- **Retention:** 7 days for Pro plans, 30 days for Enterprise
- **Location:** Managed by Supabase
- **Format:** PostgreSQL dump files

### Manual Backup

#### Using Supabase Dashboard

1. Navigate to **Settings** → **Database** → **Backups**
2. Click **Create Backup**
3. Wait for backup to complete
4. Download backup file if needed

#### Using Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Create backup
supabase db dump --project-ref <project-ref> -f backup-$(date +%Y%m%d).sql
```

#### Using pg_dump Directly

```bash
# Get connection string from Supabase dashboard
export DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"

# Create backup
pg_dump "$DATABASE_URL" > backup-$(date +%Y%m%d).sql

# Compress backup
gzip backup-$(date +%Y%m%d).sql
```

---

## Restore Procedures

### Prerequisites

- Access to Supabase project
- Backup file (`.sql` or `.sql.gz`)
- Database connection credentials

### Restore from Supabase Dashboard

1. Navigate to **Settings** → **Database** → **Backups**
2. Select backup to restore
3. Click **Restore**
4. Confirm restore operation
5. Wait for restore to complete

### Restore from SQL File

#### Using Supabase CLI

```bash
# Restore from backup file
supabase db reset --project-ref <project-ref> --file backup-20260103.sql
```

#### Using psql Directly

```bash
# Get connection string
export DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"

# Restore from uncompressed file
psql "$DATABASE_URL" < backup-20260103.sql

# Restore from compressed file
gunzip -c backup-20260103.sql.gz | psql "$DATABASE_URL"
```

### Restore to Staging Environment

```bash
# Restore production backup to staging
export STAGING_DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"
psql "$STAGING_DATABASE_URL" < backup-20260103.sql
```

---

## Restore Testing

### Monthly Restore Test Procedure

1. **Schedule:** First Monday of each month
2. **Environment:** Staging
3. **Backup:** Latest production backup

#### Steps

1. **Create Test Database**
   ```bash
   createdb restore-test-$(date +%Y%m%d)
   ```

2. **Restore Backup**
   ```bash
   psql restore-test-$(date +%Y%m%d) < backup-20260103.sql
   ```

3. **Verify Data Integrity**
   ```bash
   # Check table counts
   psql restore-test-20260103 -c "SELECT schemaname, tablename, n_tup_ins FROM pg_stat_user_tables ORDER BY n_tup_ins DESC LIMIT 10;"
   
   # Check critical tables
   psql restore-test-20260103 -c "SELECT COUNT(*) FROM organizations;"
   psql restore-test-20260103 -c "SELECT COUNT(*) FROM kb_documents;"
   psql restore-test-20260103 -c "SELECT COUNT(*) FROM agents;"
   ```

4. **Test Application**
   - Verify application can connect
   - Test critical user flows
   - Verify data is accessible

5. **Document Results**
   - Record restore time
   - Note any issues
   - Update this document if needed

6. **Cleanup**
   ```bash
   dropdb restore-test-$(date +%Y%m%d)
   ```

---

## Point-in-Time Recovery

Supabase supports point-in-time recovery (PITR) for Enterprise plans:

1. Navigate to **Settings** → **Database** → **Backups**
2. Select **Point-in-Time Recovery**
3. Choose recovery point
4. Create new database from recovery point
5. Verify data
6. Switch application to new database

---

## Backup Verification

### Automated Verification Script

```bash
#!/bin/bash
# scripts/verify-backup.sh

BACKUP_FILE=$1
if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup-file.sql>"
    exit 1
fi

# Create temporary database
TEST_DB="backup-verify-$(date +%Y%m%d-%H%M%S)"
createdb "$TEST_DB"

# Restore backup
echo "Restoring backup..."
psql "$TEST_DB" < "$BACKUP_FILE"

# Verify critical tables exist
echo "Verifying tables..."
psql "$TEST_DB" -c "\dt" | grep -q "organizations" || { echo "ERROR: organizations table missing"; exit 1; }
psql "$TEST_DB" -c "\dt" | grep -q "kb_documents" || { echo "ERROR: kb_documents table missing"; exit 1; }
psql "$TEST_DB" -c "\dt" | grep -q "agents" || { echo "ERROR: agents table missing"; exit 1; }

# Check row counts
echo "Checking row counts..."
ORG_COUNT=$(psql "$TEST_DB" -t -c "SELECT COUNT(*) FROM organizations;")
DOC_COUNT=$(psql "$TEST_DB" -t -c "SELECT COUNT(*) FROM kb_documents;")
AGENT_COUNT=$(psql "$TEST_DB" -t -c "SELECT COUNT(*) FROM agents;")

echo "Organizations: $ORG_COUNT"
echo "Documents: $DOC_COUNT"
echo "Agents: $AGENT_COUNT"

# Cleanup
dropdb "$TEST_DB"

echo "Backup verification complete!"
```

---

## Disaster Recovery Plan

### Scenario: Complete Database Loss

1. **Immediate Actions** (0-15 min)
   - Identify latest backup
   - Verify backup integrity
   - Prepare restore environment

2. **Restore Process** (15-60 min)
   - Restore from latest backup
   - Verify data integrity
   - Test critical functions

3. **Data Recovery** (60+ min)
   - Identify data loss window
   - Restore from point-in-time if available
   - Replay transactions if possible

4. **Communication**
   - Notify stakeholders
   - Update status page
   - Document incident

---

## Backup Retention Policy

| Backup Type | Retention | Location |
|------------|-----------|----------|
| Daily Automatic | 7 days | Supabase |
| Manual | 30 days | Supabase + Local |
| Monthly Archive | 1 year | S3/Cloud Storage |

---

## Monitoring

### Backup Health Checks

- **Daily:** Verify automatic backup completed
- **Weekly:** Check backup file sizes
- **Monthly:** Perform restore test

### Alerts

- Backup failure
- Backup size anomalies
- Restore test failures

---

## Related Documentation

- [Production Operations Guide](./PRODUCTION_OPERATIONS.md)
- [Troubleshooting Guide](../deployment/TROUBLESHOOTING.md)
- [Supabase Documentation](https://supabase.com/docs/guides/database/backups)

---

**Last Updated:** January 2026  
**Maintained By:** DevOps Team

