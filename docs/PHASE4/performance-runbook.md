# Phase 4 Performance & Load Test Runbook

This runbook captures the exact steps, environment variables, and expected artefacts for executing the Phase 4 performance scenarios. Use it alongside `docs/performance-uat-plan.md`.

---

## 1. Environment Preparation

| Item | Command / Notes |
| --- | --- |
| Ensure Supabase stack is running | `supabase db start` |
| Seed representative data | `npm run supabase:seed -- --scenario=phase4` *(idempotent seed function covering ledgers, documents, and autonomy jobs)* |
| Export database URL for tooling | `export DATABASE_URL=$(supabase db remote get-url)` *(or use `.env` override)* |
| K6 auth tokens | `export K6_SUPABASE_SERVICE_ROLE=...` and workload-specific API keys stored in 1Password / Vault |
| Result directory | `export PERF_RESULTS_DIR=docs/PERF/$(date +%Y%m%d-%H%M)`; create via `mkdir -p "$PERF_RESULTS_DIR"` |

> ℹ️  Each k6 script reads its configuration from `jest.k6.config.cjs`, `.env`, or the variables above. Update the config if staging/prod URLs differ.

---

## 2. Running Scenarios

Use the helper shell script to wrap k6 execution, handle thresholds, and export JSON. Example:

```bash
scripts/perf/run_k6.sh tests/perf/ada-k6.js \
  --vus 20 --duration 3m \
  --summary-export "$PERF_RESULTS_DIR/ada-k6.json"
```

| Scenario | Script | Suggested Args | Result Artefact |
| --- | --- | --- | --- |
| ADA analytics batch | `tests/perf/ada-k6.js` | `--vus 20 --duration 3m` | `ada-k6.json` |
| Reconciliation engine | `tests/perf/recon-k6.js` | `--vus 25 --duration 5m` | `recon-k6.json` |
| Disclosure / consolidation | `tests/perf/disclosure-sync.js` | `--vus 15 --duration 2m` | `disclosure-sync.json` |
| Autonomy burst | `tests/perf/autonomy-burst.js` | `--vus 25 --duration 2m` | `autonomy-burst.json` |
| Document ingestion spike | `tests/perf/doc-ingestion-spike.js` | `--vus 30 --duration 4m` | `doc-ingestion-spike.json` |
| Archive rebuild | `tests/perf/archive-rebuild.js` | `--vus 10 --duration 90s` | `archive-rebuild.json` |
| Telemetry sync | `tests/perf/telemetry-sync.js` | `--vus 5 --duration 60s` | `telemetry-sync.json` |

> ✅  After each run copy the console summary to `docs/PERF/<date>/SUMMARY.md` and paste Grafana / Supabase screenshots to the same folder or attach to the release ticket.

---

## 3. Post-Run Validation

1. **Policy regression tests**  
   ```bash
   psql "$DATABASE_URL" -f scripts/test_policies.sql
   ```
   Save the output to `"$PERF_RESULTS_DIR/test_policies.log"`.

2. **Coverage & unit tests**  
   ```bash
   npm run coverage
   ```
   Archive `coverage/coverage-final.json` and `coverage/lcov-report/index.html`.

3. **Release controls snapshot**  
   ```bash
   curl -s -X POST "$API_BASE/api/release-controls/check" \
     -H "Authorization: Bearer $MANAGER_TOKEN" \
     | tee "$PERF_RESULTS_DIR/release-controls.json"
   ```

4. **Dashboard capture**  
   Grab Grafana / Supabase performance dashboards (CPU, DB latency, error rate) during the run and store under the results directory.

---

## 4. SLA Acceptance Matrix

| Scenario | Target p95 | Observed p95 | Pass/Fail | Notes / Jira |
| --- | --- | --- | --- | --- |
| ADA analytics | `< 180s` | | | |
| Reconciliation engine | `< 300s` | | | |
| Consolidation + disclosures | `< 120s / 30s` | | | |
| Autonomy burst | No escalations | | | |
| Document ingestion | Upload pass rate 100% | | | |
| Archive rebuild | `< 90s` | | | |
| Telemetry sync | `< 60s` | | | |

Fill this table once metrics are captured. Link any failures to follow-up work items.

---

## 5. Reporting & Hand-off

- Commit the artefacts within a PR (if the repo can store them) or attach to the Phase 4 Confluence / Notion page.
- Update `docs/performance-uat-plan.md` with the completion date and link to the artefacts.
- Notify the Partner & DevOps owners that performance testing passed, or raise blocking issues with remediation steps.

---

### Troubleshooting

- **k6 missing**: install via `brew install k6` or Docker (`docker run --rm -i grafana/k6 run - < script.js`).
- **Supabase auth errors**: ensure service role key is scoped to staging and RLS policies allow the testing role.
- **Rate limiting**: The tenancy rate limiter is active; disable via `SUPABASE_RATE_LIMITS_DISABLED=true` in staging only if required (restore afterwards).

---

Maintainers: update this runbook if scripts or SLAs change. Keep previous result folders for auditability.
