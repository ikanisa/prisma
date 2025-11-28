# Autonomy & Guardrail UAT Guide

This guide supplements the three-day UAT scripts with Phase D activities that
exercise the new autonomy, MFA, and telemetry guardrails prior to go-live.

## Objectives
- Demonstrate how autonomy floors/ceilings gate autopilot jobs and surface
  readiness via `/v1/autonomy/status` and `/api/release-controls/check`.
- Rehearse manual overrides, including disabling the worker, forcing MFA, and
  resolving telemetry alerts before re-enabling automation.
- Capture evidence artefacts (JSON responses, k6 summaries, screenshots) required
  for the go-live ticket.

## Session Outline

1. **Autonomy posture walkthrough (Managers, Partners)**
   - Open the autonomy HUD in the shell and review domain coverage. Confirm the
     release controls environment block reports `state: satisfied` for autonomy,
     MFA, and telemetry.
   - Trigger a controlled downgrade by lowering a tester's `autonomy_ceiling`
     to `L1`; attempt to run `close_cycle` via `/v1/autopilot/jobs/run` and note
     the expected 403 response and HUD downgrade. Restore the ceiling and rerun
     the job to verify recovery.

2. **MFA and irreversible actions (Partners, EQR)**
   - Use WhatsApp OTP to obtain a fresh MFA challenge, then call
     `/api/release-controls/check` to capture the `environment.mfa` timestamp.
   - Attempt a close lock without MFA to confirm the guard denies the action;
     reattempt after OTP verification.

3. **Telemetry & load spikes (Ops/QA)**
   - Execute the autonomy/document/archive k6 scripts (`tests/perf/autonomy-burst.js`,
     `tests/perf/doc-ingestion-spike.js`, `tests/perf/archive-rebuild.js`).
   - After each run, record the `/api/release-controls/check` payload and the k6
     summary under `GO-LIVE/artifacts/<date>/`.
   - Review Grafana alerts to confirm no `WARNING+` telemetry alerts remain open.

4. **Rollback rehearsal**
   - Toggle `AUTOPILOT_WORKER_DISABLED=true`, redeploy the worker, and confirm
     release controls reports `environment.autonomy.state: pending`.
   - Re-enable the worker, rerun the autonomy burst script, and verify the state
     returns to `satisfied`.

## Evidence Checklist
- ✅ Release controls JSON with `environment` section for at least one satisfied
  run and one intentionally degraded run.
- ✅ k6 summaries for autonomy burst, document ingestion spike, and archive
  rebuild scenarios.
- ✅ Screenshots of the autonomy HUD before and after a ceiling downgrade.
- ✅ Notes capturing MFA OTP timestamps and related ActivityLog entries.

Store artefacts in `/GO-LIVE/artifacts/<release>/autonomy-uat/` and link them to
the deployment ticket for audit review.
