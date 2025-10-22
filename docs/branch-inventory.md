# Branch Inventory

| Branch | Head Commit | Author | Commit Date (UTC) | Purpose / Notes |
| --- | --- | --- | --- | --- |
| main | 88ed55769edb035138593aa335a7ed6f4bdf4c06 | ikanisa | 2025-10-22 13:04:28 | Baseline integration branch used for fast-forward releases. Created locally to mirror the deployed state so feature branches can rebase consistently. |
| work | 88ed55769edb035138593aa335a7ed6f4bdf4c06 | ikanisa | 2025-10-22 13:04:28 | Active development branch that tracks combined feature work (currently mirrors `main` after the latest PR merge). |

## Rebase & Validation Status

- `work` → rebased onto `main` on 2025-01-08; no new commits required and the branch is aligned with the release baseline.
- Automated checks executed from `work` after the rebase:
  - `pnpm test` *(fails: existing Vitest suites contain telemetry dashboard, RAG service syntax, and OpenAI endpoint regressions; see `tests/telemetry/dashboard-page.test.tsx`, `services/rag/index.ts`, `tests/api/openai-chat-completions-endpoints.test.ts`)*.
  - `pytest` *(fails: autopilot document extraction expectation, strict CORS behaviour, web knowledge source resolver, and Sentry dry-run auth awaitable issue; see failing tests in `tests/test_autopilot_worker.py`, `tests/test_csp_and_cors.py`, `tests/test_data_sources.py`, `tests/test_sentry_dry_run.py`)*.
  - `./scripts/k6-autopilot-smoke.sh` *(blocked: `k6` CLI is not installed in the local environment).* 
- Failures have been documented for follow-up before attempting a `main` fast-forward merge.

## Follow-up Recommendations

1. Restore `k6` smoke coverage by installing the CLI locally or wiring the script to a containerised runner.
2. Investigate the Vitest telemetry dashboard fixtures—the mock totals payload lacks the `events` key which now drives ratio calculations.
3. Resolve the new syntax errors introduced near `services/rag/index.ts:4486` to unblock the RAG lazy-load tests and OpenAI endpoint coverage.
4. Update backend fixtures so autopilot extract jobs emit `INCORP_CERT` classifications, align CORS configuration with stricter FastAPI behaviour, ensure web knowledge source toggles respect feature flags, and make `require_auth` awaitable in the Sentry dry-run route.

