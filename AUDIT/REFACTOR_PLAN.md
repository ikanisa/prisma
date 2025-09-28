# Refactor Plan

## Phase 1 – Safety & Security (1–2 days)

### 1. Rotate Supabase creds & fix env hygiene
- **Scope:** Remove hard-coded keys from `src/integrations/supabase/client.ts`, load via env in build steps, update `.gitignore` to ignore `.env.*`, rotate anon/service keys.
- **Acceptance:** Build consumes keys from env, repo free of secrets, post-rotation smoke tests pass.
- **Risk:** Disconnecting existing environments; mitigate with coordinated key rollout.
- **Rollback:** Restore previous `.env` handling and redeploy old keys (short-lived).

### 2. Enforce tenancy-aware API gateways
- **Scope:** Require Supabase JWT verification for FastAPI/Express endpoints, attach org scope, disable unauthenticated routes.
- **Acceptance:** Requests without valid JWT fail 401; authorized requests log actor + org.
- **Risk:** Breaking existing integrations; stage behind feature flag.
- **Rollback:** Revert middleware commits and redeploy.

### 3. Align RLS helpers & storage policies
- **Scope:** Audit Supabase tables to ensure `is_member_of`/`has_min_role` policies apply, add missing policies for new tables, plan Storage bucket RLS with signed URLs ≤120s.
- **Acceptance:** `supabase db diff` shows no tables without RLS; storage helper documented.
- **Risk:** Locking out system processes; add service role bypass testing.
- **Rollback:** Reapply previous policies snapshot.

### 4. Ship baseline rate limiting & logging
- **Scope:** Wrap write endpoints with rate limiter, emit structured logs (correlation ids) and send to Sentry.
- **Acceptance:** Burst traffic beyond limits returns 429, logs include request ID.
- **Risk:** Over-aggressive limits; tune thresholds via config.
- **Rollback:** Disable limiter middleware.

### 5. Patch known vulnerable packages
- **Scope:** Upgrade `multer` to v2, bump Vite/esbuild, document post-upgrade manual testing.
- **Acceptance:** `npm audit --production` clean, services build.
- **Risk:** Breaking file upload behaviour; add integration tests.
- **Rollback:** Pin to previous versions and open CVE waiver.

## Phase 2 – Core Domain Hardening (3–5 days)

### 6. Centralize tenant-aware data access
- **Scope:** Introduce server-side Supabase client wrappers enforcing org filters, replace direct browser mutations.
- **Acceptance:** All writes funnel through helpers with explicit `orgId`, tests cover unauthorized access.
- **Risk:** Large surface area change; roll out module by module.
- **Rollback:** Restore previous hook usage.

### 7. Indexes & pagination for Supabase tables
- **Scope:** Add SQL indexes on `documents/org_id`, `tasks/(org_id,status,created_at)`, `notifications/(org_id,created_at)`, implement pagination in SPA lists.
- **Acceptance:** Query plans show index usage; UI fetches paged results.
- **Risk:** Migration downtime; run online index builds.
- **Rollback:** Drop new indexes and revert pagination.

### 8. HTTP caching & ETag strategy
- **Scope:** Apply cache headers/stale-while-revalidate for read endpoints, set SW to match actual build artefacts.
- **Acceptance:** Lighthouse shows cache hits; SW offline fallback valid.
- **Risk:** Serving stale data; tune TTL per resource.
- **Rollback:** Remove cache headers.

### 9. Module decomposition & shared error handler
- **Scope:** Split `sidebar` and other >300-line files, add centralized error boundary/logging utilities.
- **Acceptance:** Largest component <300 lines; errors bubble to consistent toast/log.
- **Risk:** UI regressions; snapshot visual checks required.
- **Rollback:** Restore original components.

### 10. Extract upload/sign library
- **Scope:** Build reusable service module to upload to Storage, record ActivityLog, issue signed URLs.
- **Acceptance:** Documents UI uses library; ActivityLog entry created per upload.
- **Risk:** Requires storage design finalization; coordinate with Phase 3 deliverables.
- **Rollback:** Fall back to direct Supabase calls.

## Phase 3 – Feature Completion (5–10 days)
1. **Documents lifecycle:** Implement Supabase Storage bucket, metadata + preview, deletion workflow with approvals.
2. **Compliance packs:** Persist config/provenance, add PDF/XLSX export with disclaimers, guard API with auth.
3. **Accounting close:** Build journal import, period lock, TB view, cashflow/P&L drafts.
4. **Audit & client portal:** Checklist templates, PBC automation, client approval loops, archive export.
5. **E-signature:** OTP flow, signer metadata, signed doc storage + trail.
- **Risks:** High scope; requires cross-team alignment. Stage via feature flags per module.
- **Rollback:** Disable feature flags to hide incomplete areas.

## Phase 4 – Ops & SLOs (2–4 days)
1. **CI/CD & metrics:** Activate GitHub Actions for lint/test/build, hook OTEL exporters to dashboards, define error budgets.
2. **Performance testing:** Add k6 load scripts for key endpoints, set thresholds.
3. **Feature flags & runbooks:** Introduce config-driven flags, document runbooks (outage, key rotation, storage incident).
4. **Go-live checklist:** Security review sign-offs, backup/restore drills, DR procedures.
- **Risks:** Tooling integration complexity. Validate in staging before enforcing SLOs.
- **Rollback:** Pause pipelines/flags via configuration.
