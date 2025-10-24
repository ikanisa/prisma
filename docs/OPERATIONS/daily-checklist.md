# Daily Operations Checklist

Use this checklist at the start of each on-call shift.

## Telemetry
- [ ] Review Grafana dashboards for SLA coverage and refusal rates; investigate anomalies.
- [ ] Check the Supabase status page for incidents.
- [ ] Verify `/api/release-controls/check` returns `environment.autonomy/mfa/telemetry = "satisfied"`.

## Alerts & Logs
- [ ] Acknowledge open PagerDuty incidents and ensure follow-up owners are assigned.
- [ ] Spot-check log drain queries for `error` or `rate_limit_breach` events in the last 24 hours.

## Overnight Jobs
- [ ] Confirm automation jobs (archive manifest sync, telemetry sync) completed; review Supabase function logs.
- [ ] Re-run failed jobs or escalate to the owning team.

## Access & Security
- [ ] Rotate temporary credentials or disable breakglass accounts that expired.
- [ ] Ensure Turnstile CAPTCHA and SMTP services respond as expected (perform sample requests if needed).

## Notes
Record observations and ticket links here:

- …
