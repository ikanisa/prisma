# Performance & Load Testing

This project standardises on [Artillery](https://www.artillery.io/) for HTTP load tests. Test
scenarios live under `tests/performance/` and are designed around the production telemetry that
shows the most critical user journeys:

- Agent-assisted engagements (`/api/agent/start`, `/api/agent/plan`, `/api/agent/respond`)
- Audit workspace snapshots (`/functions/v1/audit-kam/list`, `/functions/v1/audit-plan/status`, `/functions/v1/audit-report/get`)

## Prerequisites

1. Install dependencies: `pnpm install`
2. Provide credentials via environment variables. Copy `.env.performance.example` to
   `.env.performance` (git ignored) or append the variables to your local `.env` file:

   ```dotenv
   PERF_BASE_URL=https://api.prismaglow.example.com
   PERF_AUTH_TOKEN=service_jwt
   PERF_SUPABASE_SERVICE_KEY=service_role_key
   PERF_ORG_SLUG=demo-org
   PERF_ENGAGEMENT_ID=demo-engagement
   PERF_AGENT_TYPE=audit-assistant
   PERF_AGENT_PROMPT="Summarise the engagement status for the manager."
   ```

   These variables are automatically loaded by `scripts/performance/run-artillery.mjs`.

## Running locally

Run the standard smoke scenario and generate both JSON and HTML reports:

```bash
pnpm test:performance
```

Artifacts are written to `test-results/performance/api_smoke.json` and
`test-results/performance/api_smoke.html`. The HTML report includes request rate, latency
percentiles, and failure counts.

To exercise an alternate phase profile (for example, a stress test), specify the environment by
passing an additional flag to Artillery:

```bash
ARTILLERY_ENV=stress pnpm test:performance
```

### Interpreting results

Key metrics to review in the HTML report:

- **Latency percentiles (p95/p99)** – ensure they remain within the service SLO.
- **HTTP codes & errors** – spiking 4xx/5xx rates indicate regression in auth or platform stability.
- **Scenario completion rate** – failed flows highlight broken dependencies (e.g., missing Supabase
  data for seeded engagements).

## Continuous Integration

- `pnpm test:performance:ci` performs a dry-run validation of the Artillery configuration. The
  command is executed on every pull request to protect against broken scenarios.
- `.github/workflows/performance-nightly.yml` runs the full scenario each night when the
  `PERF_*` secrets are available. JSON and HTML artifacts are uploaded for inspection.

## CI artifacts

HTML and JSON reports are persisted under the workflow run's artifacts. Download the
`performance-reports` artifact to review the metrics offline or share them with stakeholders.

## Troubleshooting

- **Missing secrets:** The CI run skips automatically when the mandatory `PERF_*` variables are not
  present. Ensure they are configured in GitHub Actions secrets for the appropriate environment.
- **403/401 responses:** Verify that the Supabase service role key and JWT token map to the same
  organisation/engagement pair used in telemetry sampling.
- **Unexpected latency:** Compare the current reports with the historical baseline stored in your
  telemetry dashboards to detect regressions.
