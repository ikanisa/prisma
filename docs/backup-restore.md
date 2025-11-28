# Backup, Retention, and Cost Controls

This runbook defines the recovery posture for prisma-glow-15. It covers
authoritative data sources (Supabase/Postgres + Storage), evidence archives,
supporting SaaS systems, and API consumption guardrails.

| Domain | Target RPO | Target RTO |
| --- | --- | --- |
| Supabase Postgres | 12 hours | 4 hours |
| Supabase Storage (documents) | 24 hours | 6 hours |
| Evidence manifest / archive packs | 12 hours | 4 hours |
| Google Sheets working files | 24 hours | 8 hours |

## Supabase (Postgres)
- Nightly `pg_dump` backups are scheduled via Supabase (30-day retention).
- On Sunday 02:00 UTC run `supabase db dump --db-url <ROLLING-READ-ONLY>` to
  generate an encrypted off-site copy. Store in the firm S3 vault.
- For point-in-time recovery, request a PITR snapshot from Supabase support and
  replay using `pg_restore --clean --if-exists` into a staging database before
  promoting it to production.
- Verification: weekly automated restore rehearsal in staging using the latest
  dump; execute `scripts/test_policies.sql` afterwards to ensure RLS policies
  survived the restore.
- Before running destructive migrations or restores, set
  `AUTOPILOT_WORKER_DISABLED=true` to pause background jobs; re-enable and run
  `/api/release-controls/check` (environment block) once validation completes to
  confirm autonomy/MFA guardrails are intact.
- Schema migrations must remain idempotent; track applied migration versions in
  `/supabase/migrations` as part of configuration backups.

## Supabase Storage / Evidence artefacts
- Evidence PDFs, TCWG packs, and schedule exports land in Supabase Storage
  buckets. Enable built-in bucket versioning and export object listings weekly
  using `supabase storage list`.
- Evidence manifests are regenerated via `/functions/v1/archive-sync`; schedule
  a nightly invocation so `engagement_archives` always holds a fresh manifest and
  checksum. Archive the returned manifest JSON alongside the storage export.
- Restoration drill: select a random engagement quarterly, fetch the manifest,
  rehydrate linked documents to a temporary tenant, and reconcile checksums.

## Google Sheets / Working Papers
- Service account exports every workbook referenced by Sampling or Analytics to
  CSV each Friday 18:00 UTC. Files are uploaded to the secure vault with the
  engagement slug and period in the filename.
- Google Drive retains native version history; enforce a 180-day minimum before
  purging revisions.
- Restoration: import the latest CSV into a new Sheet, re-link the service
  account credential, and run the substantive test to confirm formulas and named
  ranges still evaluate.

## Data Retention Windows
- Engagement & audit evidence: retain for 7 fiscal years plus current period.
- Telemetry, refusal events, and activity logs: retain 30 days in hot storage,
  export monthly parquet snapshots to the analytics warehouse if long-term
  trending is required.
- Operational logs (Supabase function logs, error-notify payloads): purge after
  30 days unless an incident review requires longer retention.

## Cost Monitoring & API Guardrails
- `OPENAI_RPM` governs OpenAI embedding throughput; alert when utilisation
  exceeds 70% of the limit.
- Configure OpenAI usage budgets with email + Slack webhooks for threshold
  breaches.
- Set Supabase spend alerts (Projects → Billing) with a notification at 75% and
  90% of the monthly cap.
- Reconciliation and analytics jobs emit coverage rows into
  `telemetry_coverage_metrics`; use these to spot runaway workloads.
