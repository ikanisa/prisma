# Autopilot & Document Extraction Load Test

## Command

```bash
AUTOPILOT_BASE_URL="https://staging.example.com" \
AUTOPILOT_ACCESS_TOKEN="$TOKEN" \
AUTOPILOT_ORG_SLUG="acme-demo" \
AUTOPILOT_VUS=5 \
AUTOPILOT_DURATION=1m \
scripts/k6-autopilot-smoke.sh
```

## Acceptance
- [ ] k6 summary exported to `GO-LIVE/artifacts/autopilot-smoke-summary.json`
- [ ] `http_req_failed` < 1%
- [ ] Document extraction job success rate recorded in notes below

## Notes
- Capture Redis/queue metrics from monitoring dashboards and attach screenshots.
- Record any SLA breaches or anomalies observed during the run.
