# Performance smoke profiles

The scenarios in this directory provide a reproducible baseline for critical API paths that surfaced in production telemetry (gateway health, release controls, knowledge & task dashboards, and job submission).

## Prerequisites

- [k6](https://grafana.com/docs/k6/latest/set-up/install-k6/) installed locally (binary in your `PATH`).
- A service account token with access to the Prisma Glow gateway and FastAPI backend.
- Organisation metadata that matches staging/production (org slug, memberships, and a synthetic user id).

Populate the environment variables via `tests/performance/.env` (copy from `.env.example`) or by exporting them inline:

```bash
cp tests/performance/.env.example tests/performance/.env
# Edit the file with real values, or export them manually
```

Required variables:

- `PERF_BASE_URL` – gateway base URL (include `/v1`).
- `PERF_SERVICE_TOKEN` – JWT used to authorise gateway -> backend calls.
- `PERF_ORG_SLUG`, `PERF_ORG_ID`, `PERF_ORG_MEMBERSHIPS`, `PERF_USER_ID` – org context headers.

Optional overrides include scenario pacing (`PERF_API_RATE`, `PERF_JOURNEY_RATE`, …), summary output (`PERF_SUMMARY_FORMAT=json` to skip HTML), and custom Autopilot tokens.

## Running locally

```bash
pnpm install
pnpm run test:performance
```

The runner (`tests/performance/run.mjs`) ensures `test-results/performance/` exists, executes each scenario sequentially, and writes:

- JSON summaries that can be diffed or ingested by dashboards.
- HTML reports (via `benc-uk/k6-reporter`) for manual review.

Results are stored in `test-results/performance/<scenario>.{json,html}` and printed to stdout.

To run a single scenario:

```bash
PERF_SCENARIOS=api-smoke pnpm run test:performance -- --iterations 10
```

Any additional CLI flags after `--` are forwarded to `k6 run`.

## CI behaviour

`pnpm run test:performance:ci` sets `PERF_SUMMARY_FORMAT=ci` (JSON + stdout) and is wired into `.github/workflows/ci.yml`. The workflow only executes on the nightly schedule or manual dispatch when the required secrets (`PERF_BASE_URL`, `PERF_SERVICE_TOKEN`, etc.) are present. Reports are uploaded as the `k6-performance-reports` artifact for later inspection.

## Interpreting results

- Watch the `http_req_failed` threshold for error rates (`< 2%` in smoke tests).
- p95 latency guards are encoded via scenario tags (`gateway-health`, `release-controls`, `documents-feed`, `tasks-list`).
- HTML summaries highlight slow endpoints and any threshold breaches. Retain these artefacts in release tickets or post-mortem evidence folders.

Always archive generated reports after major releases to preserve baseline metrics.
