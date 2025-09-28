# Telemetry Schema (GOV-CORE)

| Table | Purpose |
| --- | --- |
| `telemetry_service_levels` | Tracks SLA targets and breach status for workflow events (e.g., MAP case response time). |
| `telemetry_coverage_metrics` | Stores coverage ratios for practice monitoring (e.g., treaty WHT and US overlay computations per engagement). |
| `telemetry_refusal_events` | Captures refusal/decline events (e.g., independence refusals, partner rejections, edge-function errors) with severity and counts. |

## Usage
- Populate via background jobs or analytics pipelines after each workflow run.
- Join with `activity_log` on `module` and workflow identifiers to produce dashboards.
- SLA breaches increment `breaches` and `open_breaches`; use `status` to signal `ON_TRACK`, `AT_RISK`, or `BREACHED`.

### Syncing telemetry

Trigger the Supabase Edge Function `/functions/v1/telemetry-sync` to aggregate coverage/SLA metrics or use the
Telemetry dashboard (UI: `/{org}/telemetry`) to sync and review metrics:

```bash
curl -X POST \
  https://<YOUR_SUPABASE_PROJECT>.supabase.co/functions/v1/telemetry-sync \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"orgSlug":"acme-audit","periodStart":"2025-01-01","periodEnd":"2025-01-31"}'
```

This populates `telemetry_coverage_metrics` with treaty/US overlay coverage and updates `telemetry_service_levels` for MAP case response SLAs. Use `src/lib/telemetry-service.ts` or the dashboard sync button to invoke the same logic from the front-end.

### Logging runtime errors

Use `/functions/v1/error-notify` to log structured errors (e.g., edge-function failures) into `telemetry_refusal_events` and optionally relay them to an external webhook:

```bash
curl -X POST \
  https://<YOUR_SUPABASE_PROJECT>.supabase.co/functions/v1/error-notify \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"orgSlug":"acme-audit","module":"TAX_US_OVERLAY","error":"GILTI computation failed","context":{"traceId":"123"}}'
```

Configure `ERROR_NOTIFY_WEBHOOK` in Supabase to forward notifications (optional). The helper `src/lib/error-notify.ts` wraps this call for front-end usage.

RLS policies allow organisation members to read their data, while global (null `org_id`) rows can be published for firmwide reporting.

## Rate Limiting & Alert Routing

- **Edge functions**: Wrap long-running jobs with the shared limiter (see
  `server/rate_limit.py` and `services/rag/index.ts`). Default thresholds are 60
  requests/minute per organisation; override via `RATE_LIMIT_OVERRIDE` env var
  when onboarding high-volume clients.
- **API responses**: clients must honour the `Retry-After` header returned by the
  limiter. Document this in integration guides for external consumers.
- **Alerting**:
  - Set Supabase log drains to forward function errors and rate-limit breaches to
    the incident channel (Ops Slack / PagerDuty service `audit-platform`).
  - Create a Grafana dashboard sourcing `telemetry_service_levels` to watch the
    `MAP_CASE_RESPONSE` and `RATE_LIMIT_BREACH` events. Trigger a PagerDuty
    warning when `open_breaches > 0` for more than 15 minutes.
  - Configure OpenAI usage alerts at 70%/90% of monthly budget as a secondary
    guardrail (see `docs/backup-restore.md` cost controls).
- **Operational checks**: include `npm run lint && npm test` plus
  `scripts/test_policies.sql` in CI so deployments fail if telemetry tables or
  rate-limit hooks drift out of compliance.
