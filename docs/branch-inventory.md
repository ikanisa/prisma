# Branch Inventory

_Last updated: 2025-10-22 14:35:04Z_

| Branch | Purpose | Last Commit | Rebase & Validation Notes |
| --- | --- | --- | --- |
| `main` | Stable release branch used for production deployments and as the rebase target for feature work. | `88ed557` – Merge pull request #140 from ikanisa/codex/explore-best-practices-for-gpt-5 (2025-10-22) | Rebased reference for validation today; requires pnpm/pytest suites and k6 smoke before fast-forward. Current blockers: `pnpm test` suites (`telemetry/dashboard`, `rag/index.ts` syntax) failing, smoke script missing `k6`. |
| `work` | Active integration branch for in-flight development in this workspace. Tracks features prior to stabilisation on `main`. | `88ed557` – Merge pull request #140 from ikanisa/codex/explore-best-practices-for-gpt-5 (2025-10-22) | Successfully rebased onto `main` (`2025-10-22`). Same validation blockers as `main`: vitest suites failing, pytest regressions (`autopilot_worker`, `csp_and_cors`, `web_sources`, `sentry_dry_run`), and missing `k6` binary for smoke tests. |

## Test Execution Summary
- `pnpm test` failed: vitest reported syntax errors in `services/rag/index.ts` and failing telemetry dashboard UI tests that existed prior to this task.
- `pytest` failed: regression suite surfaced four failing cases (`test_handle_autopilot_extract_documents_success`, `test_cors_allows_only_configured_origins`, `test_web_sources_endpoint`, `test_sentry_dry_run_returns_500`).
- `./scripts/k6-autopilot-smoke.sh` could not run because the required `k6` binary is unavailable in the execution environment.

These results have been flagged on the merge tracking board for remediation before attempting a `main` fast-forward.
