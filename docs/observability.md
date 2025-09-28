# Observability Runbook

This runbook explains how logs, metrics, and alerts are collected for
prisma-glow-15 so engineers can trace incidents end to end.

## Structured Logging
- **Edge functions**: use `console.log(JSON.stringify({...}))` with an `event`
  field. Ensure every log includes `orgId`, `module`, `action`, and
  `correlationId` where available.
- **Node/Express services**: the RAG API (`services/rag/index.ts`) now injects a
  correlation ID (`x-request-id`) into each request/response and enriches every
  `logInfo`/`logError` event with that identifier. Keep the dot-delimited
  `event` naming convention so log drains can route alerts.
- **Front-end**: critical client errors should call `notifyError` so they flow to
  the edge function `/functions/v1/error-notify` and trigger telemetry updates.

## Log Drains & Retention
- Configure Supabase log drains to forward database and function logs to the
  central log sink (Grafana Loki or ELK). Apply the `orgId` and `module` custom
  fields to each drain for multi-tenant queries.
- Retain raw logs for 30 days, mirroring the retention policy documented in
  `docs/backup-restore.md`.
- Snapshot critical incidents: export related log streams and attach them to the
  incident record in `docs/incident-response.md`.

## Metrics & Dashboards
- `telemetry_service_levels`, `telemetry_coverage_metrics`, and
  `telemetry_refusal_events` (see `docs/telemetry.md`) are the authoritative
  metrics tables.
- Grafana dashboards:
  - **Audit Platform Overview**: surface rate-limited requests, error counts
    from telemetry, and Supabase function failures.
  - **Tax Workbench**: chart treaty/US overlay coverage ratios and outstanding
    MAP case breaches per organisation.
- Refresh each dashboard every minute. Add annotations sourced from
  ActivityLog actions (e.g., deployments, schema migrations) for context.

## Alerting
- Wire the Grafana dashboards to PagerDuty service `audit-platform` with
  warning/critical thresholds:
  - Warning when `telemetry_service_levels.open_breaches > 0` for 15 minutes.
  - Critical when rate-limited responses exceed 5% of traffic over a 10-minute
    window.
- Supabase log drains should trigger Slack notifications (`#audit-ops`) on any
  `supabase.organizations_error` or `EDGE_FUNCTION_ERROR` entry.
- Programmatic alerts: the telemetry sync function inserts `telemetry_alerts`
  rows and can post to `TELEMETRY_ALERT_WEBHOOK` when SLAs are `AT_RISK`. The
  RAG API emits `RATE_LIMIT_BREACH` alerts via `telemetry_alerts` and an
  optional `RATE_LIMIT_ALERT_WEBHOOK` (defaults to `ERROR_NOTIFY_WEBHOOK`).
- OpenAI and Supabase budget alerts (described in `docs/backup-restore.md`) feed
  into the same Slack channel for cost anomaly visibility.

## Runbooks & Testing
- During incident response, follow `docs/incident-response.md` and capture log
  query URLs plus Grafana snapshots in the post-mortem template.
- CI should execute `npm run lint`, `npm test`, and `scripts/test_policies.sql`
  so telemetry tables and structured logging helpers remain verified before
  deployment.
- Quarterly, rehearse the observability stack by generating a synthetic
  `EDGE_FUNCTION_ERROR` and confirming it appears in logs, telemetry metrics,
  Grafana panels, and PagerDuty alerts.
