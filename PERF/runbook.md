# Performance Runbook

## Test Execution
1. **k6 Smoke Tests**
   - Navigate to `tests/perf` (if absent, clone from shared repo).
   - Run `k6 run k6/agents-smoke.js --vus 10 --duration 5m` with `BASE_URL` and `AUTH_TOKEN` env vars.
   - Capture output summary (p95 latencies, HTTP errors).
2. **Latency Sampling via API**
   - Call `/api/metrics` (if exposed) or query Supabase `agent_traces` for recent `payload.latencyMs` samples.
   - Cross-reference with `/api/agent/telemetry` latency card.
3. **Approval Queue Audit**
   - Pull `/api/agent/telemetry?orgSlug=…` to review `approvals.pendingCount` and `averagePendingHours`.
   - If > target, identify open approvals via `/approvals` UI and notify owners.

## Troubleshooting Failing Targets
- **GET latency high**
  - Add database indexes on query fields (`approval_queue.status`, `agent_sessions.status`).
  - Enable cache headers (`Cache-Control: private, max-age=30`) for read endpoints.
  - Reduce payload size (exclude heavy JSON fields or paginate aggressively).
- **Compute/export latency >2s**
  - Profile tool handler (e.g., heavy PDF generation) and optimize I/O.
  - Introduce background processing or caching of recurrent outputs.
- **Refusal latency >1s**
  - Review OpenAI model latency; consider lighter model for guardrails.
  - Ensure refusal path avoids extra DB writes before responding.
- **Approvals age >2h**
  - Escalate to Ops; ensure manager notifications triggered.
  - Auto-remind reviewers (Slack/email) using existing notification hook.

## Telemetry & Dashboards
- **Telemetry Settings tab**: latency, approvals, groundedness cards.
- **k6 Grafana (if configured)**: monitors p95/99 latencies, error rate.
- **Activity Log**: confirm approvals processed after remediation.

## Escalation
- Notify Ops lead and QMS lead if any SLI breached for more than one business day.
- Document incident in QMS monitoring log (`STANDARDS/QMS/monitoring_checklist.md`).
- Update traceability matrix row TM-038 after remediation.

