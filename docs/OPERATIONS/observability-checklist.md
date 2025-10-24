# Observability & Backup Verification – Phase 3

Complete this checklist prior to the release window to satisfy log-drain and backup controls.

## Observability
- [ ] Confirm Supabase log drains stream to the central sink (Grafana Loki/ELK). Capture drain configuration screenshots.
- [ ] Verify OTLP exporter (`OTEL_EXPORTER_OTLP_ENDPOINT`) receives traces from FastAPI (check for recent spans in the collector).
- [ ] Trigger `/v1/observability/dry-run` (with Sentry release env configured) and confirm alerts reach PagerDuty/Slack.
- [ ] Ensure rate-limit webhook (`RATE_LIMIT_ALERT_WEBHOOK`) delivers notifications by forcing a test breach in staging.
- [ ] Run `scripts/test_policies.sql` against staging to confirm telemetry tables retain RLS assertions.

## Backups & PITR
- [ ] Supabase dashboard → Backups: confirm PITR is enabled and retention window matches policy.
- [ ] Execute a point-in-time restore _dry run_ on staging (create disposable branch or fork project snapshot).
- [ ] Review `docs/backup-restore.md` and attach the signed maintenance log.
- [ ] Validate document restore runbook by fetching a sample object via signed URL and confirming TTL behaviour.

Document evidence (links, screenshots) in the deployment ticket or RunOps log when each item is complete.
