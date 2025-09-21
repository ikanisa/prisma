# Performance & Reliability Targets

| Metric | Target (Staging) | Rationale | Observability |
| --- | --- | --- | --- |
| p95 GET list endpoints (`/api/agent/sessions`, `/api/agent/approvals`) | ≤ 250 ms | Responsive manager workflows | k6 dashboards; `/api/metrics` latency; Telemetry latency card |
| p95 compute/export (agent tool executions generating reports, archives) | ≤ 2 s | Maintain acceptable wait for automated outputs | Agent traces latency field; Telemetry `latency.p95` |
| Refusal latency | ≤ 1 s | Rapid feedback for unsafe requests | Red-team harness timings; Telemetry `latency.p50`/`p95` on refusal traces |
| Approval average age | ≤ 2 h during business hours | Ensure HITL queue stays actionable | Telemetry approvals card (`averagePendingHours`); ops alerts |
| Groundedness ratio | ≥ 90% memos with citations (rolling 7d) | Regulatory assurance for AI content | Telemetry groundedness card |
| Refusal accuracy | 100% policy-violating cases refused | Safety guardrail | Red-team suite results; Telemetry refusal counters |

## Notes
- Targets apply to staging smoke tests; production thresholds may be tighter once telemetry stabilizes.
- Approval age target measured during 9am–6pm local working hours; escalate if exceeded twice in a week.

