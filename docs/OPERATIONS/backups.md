# Backup Operations

Scheduled jobs create off-site backups for critical services.

- `scripts/backup_sheets.mjs` exports Google Sheets to timestamped CSV files.
- `scripts/backup_supabase.sql` dumps Supabase tables to storage.

## Cron Guidance

Run backups daily during low-traffic hours:

```
0 3 * * * node scripts/backup_sheets.mjs
15 3 * * * psql < scripts/backup_supabase.sql
```

Verify backup integrity weekly and rotate archives per the retention policy.
