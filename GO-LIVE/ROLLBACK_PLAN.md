# Rollback Plan

## Guiding Principles
- Prefer configuration toggles over data deletion.
- Never drop customer data; rely on Supabase point-in-time restore if required.
- Document every rollback action in the deployment log.

## Frontend
1. Redeploy previous known-good build artifact (from CDN or your hosting platform's preview) by reactivating the prior release tag.
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
4. If the extension/search-path rollout causes issues, execute the emergency SQL:
   ```sql
   DO $$
   DECLARE
     ext text;
     role_name text;
   BEGIN
     FOR ext IN SELECT unnest(ARRAY['pgcrypto','vector','btree_gin','pg_trgm']) LOOP
       IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = ext) THEN
         EXECUTE format('ALTER EXTENSION %I SET SCHEMA public', ext);
       END IF;
     END LOOP;
     FOR role_name IN SELECT unnest(ARRAY['postgres','supabase_admin','supabase_auth_admin','supabase_storage_admin','authenticator','service_role','authenticated','anon']) LOOP
       IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
         EXECUTE format('ALTER ROLE %I SET search_path TO app, public, auth', role_name);
       END IF;
     END LOOP;
   END
   $$;
   ```
   Document the execution and schedule a follow-up migration to reinstate the fix once the root cause is addressed.

## Storage Buckets
1. If new policies block legitimate access, revert to previous policy migration (apply inverse migration) while investigating.
2. Ensure signed URLs remain short-lived; rotate keys if exposed.

## Autopilot & Background Jobs
1. Cancel running RQ jobs via Redis queue if new release misbehaves (`rq requeue/cancel`).
2. Disable worker (`AUTOPILOT_WORKER_DISABLED=true`) and redeploy; re-enable after fix verified.
3. Once stabilised, run `/api/release-controls/check` to confirm `environment.autonomy.state` returns to `satisfied` before restoring automation.

## Observability & Alerts
1. If correlation-ID middleware causes failures, toggle feature flag to bypass while patching (leave trace of change).
2. Confirm Sentry/OTEL pipelines still receiving data after rollback.

## Post-Rollback Verification
- Execute the same smoke suite as post-deploy (`GO-LIVE/RELEASE_RUNBOOK.md`).
- Capture the release controls response to ensure the `environment` block (autonomy, MFA, telemetry) is healthy post-rollback.
- Update `GO-LIVE/GO-LIVE_SCORECARD.md` to reflect rollback and outstanding actions.
- Notify stakeholders with summary + next steps.
