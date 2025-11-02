# Performance & Load Testing

The performance harness now standardises on [Artillery](https://www.artillery.io/). The
scenarios target the API flows highlighted by production telemetry (agent session
creation, planning/respond, telemetry sync, approvals fetch). This document covers
local execution, configuration, and how the CI job publishes artefacts.

## Directory structure

```
tests/performance/
├── agent_journeys.test.yml      # agent start → plan/respond → rate-limit
├── api_smoke.test.yml           # health/readiness + telemetry & approvals hot paths
├── fixtures/personas.csv        # non-secret demo persona used for local runs
└── processors/
    ├── agent-flows.mjs
    └── common.mjs
```

`scripts/performance/run-artillery.mjs` orchestrates execution, report generation, and
scenario selection. JSON and HTML outputs are written to `test-results/performance/`
by default.

## Required environment variables

Populate the following variables in your `.env` (see [`.env.example`](../.env.example)):

| Variable | Description |
| --- | --- |
| `PERF_BASE_URL` | Base URL for the target API (e.g. `https://staging.api.example.com`). |
| `PERF_EMAIL` / `PERF_PASSWORD` | Service account used to mint Supabase JWTs via `/api/auth/token/issue`. |
| `PERF_ORG_SLUG` | Organisation slug referenced by the telemetry endpoints. |
| `PERF_ENGAGEMENT_ID` | Engagement identifier for archive & sync flows (optional but improves coverage). |
| `PERF_BEARER_TOKEN` | Optional static JWT override if you do not want to mint on every run. |
| `PERF_PERSONA_FILE` | Optional CSV path (same schema as `fixtures/personas.csv`) if you want to cycle personas. |
| `PERF_STATIC_HEADERS` | Optional JSON string merged into every request header (e.g. feature flags, tracing). |
| `PERF_OUTPUT_DIR` | Custom output directory for reports (defaults to `test-results/performance`). |

The CSV in `tests/performance/fixtures/personas.csv` works for local demo data. In CI you
should inject secrets through repository/organisation secrets instead of committing
real credentials.

## Running the suite locally

Install dependencies and execute the harness:

```bash
pnpm install
pnpm run test:performance        # defaults to ARTILLERY_ENV=local
```

Useful overrides:

- `ARTILLERY_ENV=ramp pnpm run test:performance:ramp` increases arrival rate to mimic
  production bursts.
- `PERF_SCENARIOS=api_smoke pnpm run test:performance` runs a single scenario.
- `PERF_OUTPUT_DIR=/tmp/perf pnpm run test:performance` writes results to a custom path.

Every run produces a `*.json` summary (Artillery metrics) and a matching `*.html`
report. Open the HTML in a browser to inspect latency histograms, percentile charts,
and failure counts. The CLI logs include ensure-threshold checks (p95 latency,
HTTP 5xx/429 budgets) so you see failures immediately.

## CI integration & artefacts

`.github/workflows/ci.yml` contains the `performance-tests` job. It runs on the nightly
`cron` schedule only and depends on the base `build-test` job. The job:

1. Verifies that `PERF_BASE_URL`, `PERF_EMAIL`, `PERF_PASSWORD`, and `PERF_ORG_SLUG` secrets
   are present (skipping gracefully if they are missing).
2. Executes `pnpm run test:performance:ci` (which pins `ARTILLERY_ENV=ci`) against the
   staging environment.
3. Uploads the contents of `test-results/performance/` as the `performance-reports`
   artefact, even if the load step fails.

Consume the reports directly from the workflow run or forward them to external storage
(S3/GCS) if required. Each JSON file can be post-processed for dashboards, while the
HTML report is suitable for human review.

## Legacy k6 harness

The historical k6 scripts remain in `tests/perf/` for reference during the Phase 4
programme. New scenarios should be authored in Artillery to benefit from shared
processors, environment-driven configuration, and the CI automation described above.
