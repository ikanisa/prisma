# Production Readiness Checklist

## Table of Contents
- [Security](#security)
- [Reliability](#reliability)
- [Observability](#observability)
- [DevOps](#devops)
- [Data Management](#data-management)
- [Compliance](#compliance)

| Item | Status |
|---|---|
| Secrets managed via dedicated secret manager or vault | PASS |
| .env.example committed with placeholders | PASS |
| Environment separation (DEV/PROD) | PASS |
| Webhook verification tokens/signatures | PASS |
| Retries and exponential backoff for external calls | PASS |
| Idempotency keys / dedupe for webhooks | PASS |
| Centralized error handling workflow | PASS |
| Structured logging and metrics | PASS |
| Alerting and incident response runbooks | PASS |
| CI pipeline with lint/test/SCA | PASS |
| Unit/integration tests | PASS |
| Dependency scanning (npm audit/Snyk) | PASS |
| gitleaks or secret scanning in CI | PASS |
| Backup/restore plan for Sheets and DB | PASS |
| Data retention & deletion policy | PASS |
| Access controls & least privilege | PASS |
| GDPR/PII handling guidelines | PASS |

## Observability
- Logging architecture documented in `docs/observability.md` (structlog events,
  Supabase drains, Grafana dashboards, PagerDuty routing).
- Telemetry schemas and rate-limit guidance in `docs/telemetry.md` with
  actionable alerts.
- Error notification pipeline implemented via `/functions/v1/error-notify` and
  captured in `docs/incident-response.md`.
- Rate-limit breaches and SLA at-risk events emit `telemetry_alerts` rows and
  optional webhook notifications (`RATE_LIMIT_ALERT_WEBHOOK`,
  `TELEMETRY_ALERT_WEBHOOK`). Verify webhooks route to PagerDuty/Slack.
- `/api/release-controls/check` should report `environment.autonomy/mfa/telemetry`
  states as `satisfied` before change approval; archive the response JSON in the
  go-live ticket.

## Security Notes
- OAuth scope catalogue maintained in `docs/SECURITY/oauth-scopes.md`; changes
  require security sign-off and rotation per the key rotation guide.
- Penetration test & threat drill procedures defined in
  `docs/SECURITY/penetration-testing.md` with bi-annual cadence and reporting
  requirements.
- Supabase keys rotated per `docs/SECURITY/KEY_ROTATION.md` (placeholders updated in `.env.example`).
- Edge functions and server runtimes source Supabase secrets through Vault helpers
  (`lib/secrets/*`, `supabase/functions/_shared/supabase-client.ts`); rotation only
  requires updating the Vault path referenced in `.env.example`.

## Hardening & UAT
- Performance/load test and UAT plan documented in `docs/performance-uat-plan.md`
  covering ADA, recon, consolidation, telemetry, and partner sign-off scripts.
- Phase D load profiles (`tests/perf/autonomy-burst.js`,
  `tests/perf/doc-ingestion-spike.js`, `tests/perf/archive-rebuild.js`) executed
  with summaries stored under `GO-LIVE/artifacts/` alongside release-control evidence.

## Data Management
- Financial close & disclosure workflows documented in `docs/financial-reporting.md`
  (ledger imports, trial balance snapshots, IFRS note composer, ESEF export).
