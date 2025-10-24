# Learning Policy Rollback Runbook

Use this runbook to revert Reinforced RAG policy changes within 5 minutes.

## When to Roll Back

- `evaluate-and-gate` job detects SLO violation (allowlist precision, temporal validity, HITL recall,
  Maghreb banner coverage, or case score regret).
- Manual alert from Security/Compliance after reviewing outputs.
- PagerDuty/Slack alert from `learning-applier` or evaluation monitors.

Pending learning jobs must be approved (`POST /api/learning/approve`) before the applier runs. If
jobs accumulate, review the payloads in the Admin console (Learning → Pending Jobs) and approve or
reject before continuing with rollback steps.

## Prerequisites

- Admin or Owner role with access to `/api/learning/rollback`.
- Access to `ops/report-learning.ts` for pre/post snapshots.
- Confirm no active apply jobs are running (check `agent_learning_jobs` state).

## Rollback Steps

1. Identify the last known good `agent_policy_versions` entry (`status = 'approved'`).
2. Trigger rollback:

   ```bash
   curl -X POST \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     https://api.prisma-cpa.vercel.app/api/learning/rollback \
     -d '{"policy_version_id": "<version-id>"}'
   ```
3. Verify response `status: "ok"`.
4. Confirm rollback in the Admin Learning console (Policy Versions panel) and via
   `ops/report-learning.ts` (compare diffs).
5. Monitor metrics:
   - `GET /api/learning/metrics?metric=citations_allowlisted_p95&window=1d`
   - Repeat for other SLOs.
6. Annotate incident in `learning_metrics` (insert note) and update runbook with findings.

If automatic rollback triggered, review `agent_policy_versions` diff to understand the change and
suspend new apply jobs until the issue is resolved.

## Post-Rollback Checks

- Ensure new signals accumulate for at least 200 runs before reapplying adjustments.
- Audit `learning_signals` for anomalies tied to the rolled-back version.
- Update documentation and communicate to stakeholders (Security, Product Ops).
