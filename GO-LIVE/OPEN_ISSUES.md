# Open Issues

| Severity | Title | Owner | Area | GitHub | Status |
| --- | --- | --- | --- | --- | --- |
| P0 | [GO-LIVE][P0][frontend] Resolve Pillar Two merge conflict blocking build | Frontend Lead | frontend | _pending_ | ✅ Implemented (pending review) |
| P0 | [GO-LIVE][P0][security] Add CSP middleware to FastAPI gateway | Security Engineering | security | _pending_ | ✅ Implemented (pending review) |
| P0 | [GO-LIVE][P0][security] Enforce explicit CORS allow-list for API | Security Engineering | security | _pending_ | ✅ Implemented (pending review) |
| P1 | [GO-LIVE][P1][pwa] Ship installable PWA baseline for Aurora web | Frontend Lead | pwa | _pending_ | ✅ Implemented (Lighthouse run pending) |
| P1 | [GO-LIVE][P1][observability] Add correlation IDs & structured logging | DevOps | observability | _pending_ | ✅ Implemented (pending review) |
| P1 | [GO-LIVE][P1][api] Add smoke suite for tasks/documents/notifications | Backend QA | api | _pending_ | ✅ Implemented (pending review) |
| P1 | [GO-LIVE][P1][security] Define storage policies for documents bucket | Security Engineering | rls | _pending_ | ✅ Implemented (pending review) |

> Create each issue in GitHub with labels `go-live`, `severity:P#`, and `area:<frontend|api|db|rls|pwa|observability|security|ux>` as shown above.

## Issue Drafts

### [GO-LIVE][P0][frontend] Resolve Pillar Two merge conflict blocking build
- **Impact:** `npm run lint` and `npm run build` fail due to unresolved merge markers, blocking CI/CD and preventing production deploys.
- **Fix approach:** Resolve merge in `src/pages/tax/pillar-two.tsx:260-282`, reconcile Supabase-backed vs demo code paths, ensure tests updated if relationships table unavailable. Re-run `npm run lint`, `npm run build`, `npm test`, `npm run test:playwright`.
- **Acceptance:** All commands above succeed; no `<<<<<<<` markers; Pillar Two UI renders both demo + live paths without regression.
- **Evidence:** Command output, screenshot of Pillar Two page, updated tests. References: lint/build logs, `src/pages/tax/pillar-two.tsx:260`.

### [GO-LIVE][P0][security] Add CSP middleware to FastAPI gateway
- **Impact:** Absence of CSP leaves the app vulnerable to XSS/asset injection; violates go-live security gate.
- **Fix approach:** Extend `server/main.py` to emit strict CSP (script-src/style-src allow-lists, Supabase/storage endpoints, data URIs only where necessary). Add regression test hitting `/health` to assert header; document policy in `SECURITY.md`.
- **Acceptance:** New test passes; manual curl confirms CSP header; security review sign-off.
- **Evidence:** Updated middleware code, test snapshot, header dump.

### [GO-LIVE][P0][security] Enforce explicit CORS allow-list for API
- **Impact:** Current fallback `*` allows any origin to call authenticated endpoints when env unset; unacceptable for production multi-tenant data.
- **Fix approach:** Require `API_ALLOWED_ORIGINS` in production; parse/validate origins; default to safe demo list only in dev. Add unit test verifying failure when unset and success with allow-list.
- **Acceptance:** Startup fails in prod mode without allow-list; tests covering success/denial; documentation updated.
- **Evidence:** Updated `server/main.py:80-85`, tests, config docs.

### [GO-LIVE][P1][pwa] Ship installable PWA baseline for Aurora web
- **Impact:** PWA requirements (manifest, icons, offline strategy) unmet; Lighthouse score cannot reach ≥90.
- **Fix approach:** Add 192×192 & 512×512 icons, adjust manifest metadata, enable service worker by default, audit offline caching. Run Lighthouse + axe; document results.
- **Acceptance:** Lighthouse PWA ≥90 screenshot attached; install prompt works on staging; manifest validated.
- **Evidence:** Updated manifest, build logs, Lighthouse report.

### [GO-LIVE][P1][observability] Add correlation IDs & structured logging
- **Impact:** Without correlation IDs, ops cannot trace incidents or tie logs to requests; requirement for auditability unmet.
- **Fix approach:** Introduce middleware generating/storing `X-Request-ID`, propagate to logs/Sentry/OTel; add tests ensuring header present and reused. Update observability runbook.
- **Acceptance:** Automated test passes; logs show request_id; sample trace visible in collector; runbook updated.
- **Evidence:** Middleware diff, test artifacts, screenshot of trace.

### [GO-LIVE][P1][api] Add smoke suite for tasks/documents/notifications
- **Impact:** No automated verification that HF-1..HF-3 endpoints return 200; risk of regressions going undetected.
- **Fix approach:** Build Vitest or pytest suite hitting `/v1/tasks`, `/v1/storage/documents`, `/v1/notifications` against local Supabase fixture; assert schema + auth behavior. Integrate into CI.
- **Acceptance:** Smoke suite passes locally and in CI; failures block merge; documentation of setup in `/tests/README.md`.
- **Evidence:** New test files under `tests/api`, CI run log.

### [GO-LIVE][P1][security] Define storage policies for documents bucket
- **Impact:** Bucket exists but lacks explicit RLS policies; need to guarantee uploads/downloads scoped per org and via signed URLs only.
- **Fix approach:** Add storage policy migration tying access to `is_member_of`, allow service-role for ingestion, deny public read. Add tests/smoke to confirm direct GET without signed URL fails.
- **Acceptance:** Migration applied in staging; test proves unauthorized access denied; documentation updated.
- **Evidence:** New migration, test script, policy documentation.
