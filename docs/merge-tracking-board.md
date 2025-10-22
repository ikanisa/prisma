# Merge Tracking Board

_Proposed GitHub project structure capturing readiness to fast-forward `main`._

| Item | Owner | Status | Blockers | Required Validations |
| --- | --- | --- | --- | --- |
| `work` ➜ `main` fast-forward | Release Engineering | Blocked | `pnpm test` failures (telemetry dashboard tests and syntax errors in `services/rag/index.ts`), `pytest` regressions (`autopilot_worker`, `csp_and_cors`, `web_sources`, `sentry_dry_run`), smoke suite requires `k6` binary. | `pnpm test`, `pytest`, `./scripts/k6-autopilot-smoke.sh` (once dependencies are restored). |
| Telemetry dashboard fixes | Frontend Platform | Blocked | React telemetry page assumes `embeddingQuery.data.totals.events` exists, causing vitest failures. | Update vitest fixtures, add null-guards, rerun `pnpm test`. |
| RAG service syntax regression | Knowledge Systems | Blocked | Syntax errors in `services/rag/index.ts` introduced upstream prevent vitest compilation. | Correct TypeScript module structure, re-run `pnpm test`. |
| API regression triage | Backend Platform | Blocked | `pytest` regressions across autopilot extract, CORS, web sources, and Sentry dry-run flows. | Implement feature toggles or bug fixes; re-run `pytest`. |
| Smoke test dependency | DevOps | Blocked | `k6` binary not available in CI image. | Provision `k6` in runner or container; rerun `./scripts/k6-autopilot-smoke.sh`. |

## Workflow Notes
- Track the above items as columns (`Blocked`, `In Progress`, `Ready for Review`, `Ready to Merge`) in a GitHub project named **Merge Readiness Board**.
- Link each branch PR card to its validation checklist (pnpm, pytest, smoke) so deployment readiness can be audited before merging to `main` and triggering Vercel deployment.
- Update blockers as they are resolved so the final `main` fast-forward can occur without surprises.

## Phased Remediation Plan
1. **Stabilise automated tests**
   - Patch telemetry dashboard vitest failures and resolve the TypeScript syntax error in `services/rag/index.ts`.
   - Re-run `pnpm test`; once passing, mark the Telemetry dashboard and RAG service items `Ready for Review`.
2. **Restore backend regression suites**
   - Implement targeted fixes or feature flags for the failing `pytest` suites (`autopilot_worker`, `csp_and_cors`, `web_sources`, `sentry_dry_run`).
   - Capture owner sign-off in the Merge Readiness Board notes before advancing the API regression card.
3. **Reinstate smoke coverage and rollout**
   - Provision the `k6` dependency, execute `./scripts/k6-autopilot-smoke.sh`, and archive the results in the project card.
   - When all validation gates are green, schedule the fast-forward of `main` and trigger the Vercel deployment workflow.
