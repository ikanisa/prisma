# Hotfix Release Operations Playbook

This playbook outlines the temporary branching, monitoring, UAT, and documentation tasks needed to support a hotfix release cycle.

## 1. Temporary Hotfix Release Branch

- Create a short-lived branch from the latest production tag:
  ```bash
  git fetch origin
  git checkout -b release/hotfix-<ticket> origin/main
  ```
- Lock the branch to critical fixes only and require code-owner review before merging.
- Tag pre- and post-deployment milestones for rollback traceability:
  - `hotfix-prep-YYYYMMDD` immediately after QA sign-off.
  - `hotfix-prod-YYYYMMDD` immediately after production deployment.
- After the hotfix merges to `main`, fast-forward `release/hotfix-*` to the new production tag so rollback points stay aligned.

## 2. Observability & Alerting

- Monitor the Sentry project `prisma-app-prod` and the OpenTelemetry dashboard `Prod Application Health` during the hotfix window.
- Set temporary alert thresholds:
  - Error rate > 1% for 5 minutes.
  - P95 latency > 1200 ms for 3 consecutive windows.
  - Crash-free sessions < 98% over 30 minutes.
- Configure alerts to page the on-call engineer and notify `#hotfix-war-room`.
- Capture a post-mortem report summarizing alert triggers and remediation actions.

## 3. Stakeholder UAT Coordination

- Schedule UAT within 24 hours of deploying to staging.
- Include finance ops, compliance, and support stakeholders.
- Provide a UAT checklist covering critical workflows (payment posting, reconciliation, alerts routing).
- Collect feedback via the shared `Hotfix UAT` form and log issues in Linear under the `HOTFIX` project.
- Prioritize follow-up fixes using severity (blocker, high, medium) and effort estimates.

## 4. Post-Deployment Cleanup

- Verify that monitoring metrics have returned to baseline for 24 hours.
- Merge the hotfix branch back to `main` (fast-forward) and delete it both locally and in origin after confirmation:
  ```bash
  git checkout main
  git pull origin main
  git merge --ff-only release/hotfix-<ticket>
  git branch -d release/hotfix-<ticket>
  git push origin --delete release/hotfix-<ticket>
  ```
- Tag the final production state as `prod-YYYYMMDD-hotfix` for audit tracking.
- Update documentation:
  - Append the deployment summary to `CHANGELOG.md`.
  - Note playbook adjustments in the internal wiki (Deployment > Hotfix Process).

## 5. Communication Checklist

- Announce the hotfix start and completion in `#eng-prod` and `#stakeholders` channels.
- Share the UAT summary and prioritized backlog items with product leadership.
- Archive all related Slack threads to the incident record.

---

_Last updated: 2025-10-22_
