# Merge Tracking Board

> _Constraints:_ The GitHub API is unavailable from the current environment, so this board is documented as configuration notes for manual creation. Copy these columns/cards into a GitHub Project (beta) titled **"Mainline Merge Tracking"**.

## Columns & Cards

### 🟢 Ready for Validation
- **Card:** `work → main fast-forward`
  - **Owner:** Platform Team (Integration Captain)
  - **Validations Required:**
    - Vitest regression suite (`pnpm test`)
    - Python API suite (`pytest`)
    - k6 Autopilot smoke (`scripts/k6-autopilot-smoke.sh` with `k6` installed)
  - **Notes:** Branch is already rebased onto `main`; awaiting green builds.

### 🟡 Blocked on Fixes
- **Card:** `Vitest telemetry + RAG syntax regressions`
  - **Owner:** Frontend Guild
  - **Blockers:**
    - Telemetry dashboard specs fail because mocked totals omit the `events` property, causing runtime crashes in `src/pages/telemetry/dashboard.tsx`.
    - `services/rag/index.ts` contains stray return statements in helper scopes, breaking compilation and multiple Vitest suites (`tests/rag/openai-client-lazy-load.test.ts`, `tests/api/openai-chat-completions-endpoints.test.ts`).
  - **Unblock Plan:** Patch fixtures to include `events` counts and refactor the harvest helpers to return values from within the async function scope.

- **Card:** `Backend regression triage`
  - **Owner:** Backend Guild
  - **Blockers:**
    - Autopilot document extraction now returns `classification: OTHER` rather than `INCORP_CERT` (`tests/test_autopilot_worker.py`).
    - CORS preflight returns HTTP 400 when the allow-list is set via `API_ALLOWED_ORIGINS` (`tests/test_csp_and_cors.py`).
    - Web knowledge source endpoint flag handling fails expectations (`tests/test_data_sources.py`).
    - Sentry dry-run route calls non-awaitable `require_auth` (`tests/test_sentry_dry_run.py`).
  - **Unblock Plan:** Align fixtures/environment defaults, ensure CORS middleware receives proper list parsing, respect feature flags, and update `require_auth` usage.

- **Card:** `k6 smoke environment`
  - **Owner:** SRE / QA Automation
  - **Blockers:** Local toolchain lacks the `k6` binary, preventing execution of `scripts/k6-autopilot-smoke.sh`.
  - **Unblock Plan:** Install `k6` locally or run the script inside CI (container image `grafana/k6`).

## Exit Criteria for Fast-Forwarding `main`
1. All cards in **Blocked on Fixes** moved to **Ready for Validation** with passing automated checks.
2. Document sign-off from Platform, Frontend, Backend, and SRE owners confirming no open Sev1/Sev2 issues.
3. Final smoke + regression evidence attached to the PR (Vitest, Pytest, k6 logs) and reviewed.
4. Execute `git checkout main && git merge --ff-only work` once validations are green.

