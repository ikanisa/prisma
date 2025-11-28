# Production Readiness Checklist

## Table of Contents
- [Security](#security)
- [Reliability](#reliability)
- [Observability](#observability)
- [DevOps](#devops)
- [Data Management](#data-management)
- [Compliance](#compliance)
- [Hardening & UAT](#hardening--uat)

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
| Accounting Supabase schemas with RLS | PASS |
| Accounting API approvals & trace logging | PASS |
| Accounting workspace job cards implemented | PASS |
| Policy guides in STANDARDS/POLICY refreshed | PASS |
| Automated tests for accounting modules | PASS |
| CAPTCHA + leaked-password checks enabled | PASS |
| SMTP invite delivery configured | PASS |

## Security
- OAuth scope catalogue maintained in `docs/SECURITY/oauth-scopes.md`; changes require security sign-off and rotation per the key-rotation guide.
- Penetration test & threat drill procedures defined in `docs/SECURITY/penetration-testing.md` (bi-annual cadence, reporting requirements).
- Supabase keys rotated per `docs/SECURITY/KEY_ROTATION.md` (placeholders updated in `.env.example`).
- Edge functions and server runtimes source Supabase secrets through Vault helpers (`lib/secrets/*`, `supabase/functions/_shared/supabase-client.ts`); rotation only requires updating the Vault path referenced in `.env.example`.
- Turnstile CAPTCHA and HaveIBeenPwned password checks are enforced in the auth flow; confirm `TURNSTILE_*` variables and breach lookup toggles via `docs/deployment/configuration-audit.md`.
- SMTP invites and notifications use credentials defined in `.env.example`; validate delivery through the provider before production go-live.

## Reliability
- Retries with exponential backoff on all external integrations; idempotency keys for webhook processing.
- Graceful degradation paths and circuit breakers for critical downstreams.
- Runbooks include RTO/RPO targets and escalation paths.

## Observability
- Logging architecture documented in `docs/observability.md` (structured events, Supabase drains, Grafana dashboards, PagerDuty routing).
- Telemetry schemas and rate-limit guidance in `docs/telemetry.md` with actionable alerts.
- Error notification pipeline implemented via `/functions/v1/error-notify`; process captured in `docs/incident-response.md`.
- Rate-limit breaches and SLA at-risk events emit `telemetry_alerts` rows and optional webhooks (`RATE_LIMIT_ALERT_WEBHOOK`, `TELEMETRY_ALERT_WEBHOOK`) routing to PagerDuty/Slack.
- Web search cache retention monitored via `telemetry-sync` (`WEB_CACHE_RETENTION` alerts) with operational steps captured in `docs/web-search.md` and `GO-LIVE/RELEASE_RUNBOOK.md`.
- `/api/release-controls/check` reports `environment.autonomy/mfa/telemetry` states as `satisfied` before change approval; archive the response JSON in the go-live ticket.
- Observability and backup verification sequence documented in `docs/OPERATIONS/observability-checklist.md`; attach evidence when executed.

## DevOps
- CI runs linting, unit/integration tests, SCA, and secret scanning (gitleaks).
- Versioned infrastructure and environment-specific configs.
- Blue/green or canary strategy documented where applicable.

## Data Management
- Backup/restore playbooks for Sheets and DB verified.
- Data retention & deletion policies enforced per regulatory requirements.
- Financial close & disclosure workflows in `docs/financial-reporting.md` (ledger imports, TB snapshots, IFRS note composer, ESEF export).

## Compliance
- GDPR/PII handling guidelines documented and enforced.
- Access controls based on least-privilege; periodic access reviews.
- Audit trails retained for accounting APIs (approvals & trace logging).

## Hardening & UAT
- Performance/load test & UAT plan in `docs/performance-uat-plan.md` covering ADA, recon, consolidation, telemetry, and partner sign-off scripts.
- Phase D load profiles (`tests/perf/autonomy-burst.js`, `tests/perf/doc-ingestion-spike.js`, `tests/perf/archive-rebuild.js`) executed with summaries stored under `GO-LIVE/artifacts/` alongside release-control evidence.
