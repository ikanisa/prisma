# Backup, Retention, and Cost Controls

## Supabase
- Nightly `pg_dump` backups stored for 30 days.
- Restore by loading dumps with `pg_restore` or via the Supabase dashboard.

## Google Sheets
- Scheduled export to CSV and upload to secure storage weekly.
- Drive version history offers point-in-time recovery.

## Data Retention
- Engagement data retained for 7 years.
- Logs and transient data purged after 30 days.

## API Cost Monitoring
- `OPENAI_RPM` limits embed requests per minute.
- Configure budget alerts in provider dashboards to notify Slack on overages.
