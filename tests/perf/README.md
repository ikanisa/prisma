# Performance Scripts

These k6 scenarios support the Phase 4 hardening plan documented in
`docs/performance-uat-plan.md`. Each script expects a Supabase staging environment with
seeded data and a valid access token (service user or session token).

## Prerequisites

- [k6](https://k6.io/docs/getting-started/installation/) installed locally.
- Environment variables:
  - `BASE_URL` – Web app base URL (e.g. `https://staging.example.com`).
  - `ACCESS_TOKEN` – Bearer token for the test user (manager role recommended).
  - `ORG_SLUG` / `ORG_ID` / `ENTITY_ID` / `PERIOD_ID` – Context identifiers for the load test.
  - `TELEMETRY_FUNCTION_URL` – Direct Supabase function endpoint (for telemetry sync script).
  - Optional: `VUS`, `DURATION` to override defaults.

## Scenarios

```bash
# ADA analytics load test
k6 run tests/perf/ada-k6.js \
  -e BASE_URL="https://staging.example.com" \
  -e ACCESS_TOKEN="$TOKEN" \
  -e ORG_SLUG="acme" \
  -e ENGAGEMENT_ID="$ENGAGEMENT_ID"

# Reconciliation workload
k6 run tests/perf/recon-k6.js \
  -e BASE_URL="https://staging.example.com" \
  -e ACCESS_TOKEN="$TOKEN" \
  -e ORG_SLUG="acme" \
  -e ENTITY_ID="$ENTITY_ID" \
  -e PERIOD_ID="$PERIOD_ID"

# Consolidation + disclosures + ESEF
k6 run tests/perf/disclosure-sync.js \
  -e BASE_URL="https://staging.example.com" \
  -e ACCESS_TOKEN="$TOKEN" \
  -e ORG_ID="$ORG_ID" \
  -e ENTITY_ID="$ENTITY_ID" \
  -e PERIOD_ID="$PERIOD_ID"

# Telemetry sync
k6 run tests/perf/telemetry-sync.js \
  -e TELEMETRY_FUNCTION_URL="https://<project>.supabase.co/functions/v1/telemetry-sync" \
  -e ACCESS_TOKEN="$SERVICE_TOKEN" \
  -e ORG_SLUG="acme"
```

Store k6 summary outputs in `docs/PERF/<date>-<scenario>.json` for review and attach the
results to the UAT/performance evidence pack.
