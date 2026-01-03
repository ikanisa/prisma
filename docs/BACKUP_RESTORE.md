# Backup and Restore Procedures

> **P1 FIX: Document backup and restore procedures (P1-4)**

---

## Overview

This document covers backup and restore procedures for the Prisma Glow platform.

---

## Supabase Automated Backups

### Daily Backups (Included)
- **Frequency:** Daily
- **Retention:** 7 days (Free/Pro), 14 days (Team), 30 days (Enterprise)
- **Type:** Full database snapshot

### Point-in-Time Recovery (PITR)
- **Available on:** Pro plan and above
- **Retention:** 7 days (Pro), 28 days (Team/Enterprise)
- **Granularity:** Any point in time within retention window

---

## Manual Backup Procedures

### 1. Database Backup via CLI

```bash
# Export full database
supabase db dump -f backup_$(date +%Y%m%d_%H%M%S).sql

# Export specific schema
supabase db dump --schema=public -f public_$(date +%Y%m%d).sql

# Export data only (no schema)
supabase db dump --data-only -f data_$(date +%Y%m%d).sql
```

### 2. Storage Backup

```bash
# List all buckets
supabase storage ls

# Download all files from a bucket
supabase storage cp -r "ss:///documents" ./backup/documents/
```

### 3. Edge Functions Backup

Edge functions are stored in `supabase/functions/` and version-controlled in Git.

---

## Restore Procedures

### 1. Restore from Supabase Dashboard

1. Go to **Project Settings** > **Database** > **Backups**
2. Select the backup date/time
3. Click **Restore**
4. Confirm the operation

> ⚠️ **Warning:** Restore is a destructive operation. Current data will be overwritten.

### 2. Restore from SQL Dump

```bash
# Restore full database
psql "$DATABASE_URL" < backup_20260101_120000.sql

# Restore specific tables
psql "$DATABASE_URL" -c "TRUNCATE TABLE tasks CASCADE;"
psql "$DATABASE_URL" < tasks_backup.sql
```

### 3. Point-in-Time Restore

1. Go to **Project Settings** > **Database** > **Backups**
2. Enable PITR if not already enabled
3. Select **Point-in-Time Recovery**
4. Choose the exact timestamp
5. Confirm restoration

---

## Testing Restore Procedures

### Monthly Restore Test Checklist

- [ ] Create a test project in Supabase
- [ ] Download latest backup
- [ ] Restore to test project
- [ ] Verify table counts match
- [ ] Verify RLS policies applied
- [ ] Verify edge functions work
- [ ] Document any issues found

---

## Disaster Recovery Contacts

| Role | Contact | Responsibility |
|------|---------|----------------|
| DBA Lead | [TBD] | Database restoration |
| Platform Lead | [TBD] | Application deployment |
| Security Lead | [TBD] | Data integrity verification |

---

## Recovery Time Objectives (RTO)

| Scenario | Target RTO | Procedure |
|----------|------------|-----------|
| Database corruption | 2 hours | PITR restore |
| Accidental deletion | 30 minutes | PITR or table restore |
| Full disaster | 4 hours | Full restore + redeploy |

---

## Recovery Point Objectives (RPO)

| Backup Type | RPO |
|-------------|-----|
| Daily backup | 24 hours |
| PITR | Minutes |
| Real-time replication | Seconds |

---

## Related Documents

- `RUNBOOK.md` - Operational procedures
- `SECURITY_REVIEW.md` - Security controls
- `ARCHITECTURE.md` - System architecture
