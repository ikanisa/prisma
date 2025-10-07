# Rollback Plan

## Guiding Principles
- Prefer configuration toggles over data deletion.
- Never drop customer data; rely on Supabase point-in-time restore if required.
- Document every rollback action in the deployment log.

## Frontend
1. Redeploy previous known-good build artifact (from CDN or Vercel preview) by reactivating prior release tag.
2. Clear CDN caches (`/tasks`, `/documents`, `/onboarding`, `/assistant`) to prevent stale assets.
3. Verify UI loads without console errors; assistant dock visible.

## Backend (FastAPI)
1. Revert infrastructure to prior container image (`docker pull <registry>/<service>:<previous-tag>`).
2. Scale down current deployment, scale up previous version.
3. Re-run smoke checks (`/health`, `/readiness`, `/v1/tasks`, `/v1/storage/documents`).
4. If CSP/CORS changes caused outage, temporarily set `AUTOPILOT_WORKER_DISABLED=true` and tighten ingress rules while patching.

## Database / Supabase
1. If migrations introduced faulty schema, use Supabase PITR to timestamp immediately before deployment.
2. Alternatively, run down-migrations (if authored) on staging first, then prod.
3. Re-validate RLS helpers (`SELECT public.is_member_of(...)`) and storage policies.

## Storage Buckets
1. If new policies block legitimate access, revert to previous policy migration (apply inverse migration) while investigating.
2. Ensure signed URLs remain short-lived; rotate keys if exposed.

## Autopilot & Background Jobs
1. Cancel running RQ jobs via Redis queue if new release misbehaves (`rq requeue/cancel`).
2. Disable worker (`AUTOPILOT_WORKER_DISABLED=true`) and redeploy; re-enable after fix verified.

## Observability & Alerts
1. If correlation-ID middleware causes failures, toggle feature flag to bypass while patching (leave trace of change).
2. Confirm Sentry/OTEL pipelines still receiving data after rollback.

## Post-Rollback Verification
- Execute the same smoke suite as post-deploy (`GO-LIVE/RELEASE_RUNBOOK.md`).
- Update `GO-LIVE/GO-LIVE_SCORECARD.md` to reflect rollback and outstanding actions.
- Notify stakeholders with summary + next steps.
