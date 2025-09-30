# Phased Remediation Plan

## P0 — Blockers (Ship-stoppers; fix before prod traffic)
| Task | Owner | Effort | Acceptance Criteria | Notes / Evidence |
| --- | --- | --- | --- | --- |
| Resolve Pillar Two merge conflict and restore green pipelines | Frontend Lead | S | `npm run lint`, `npm run build`, `npm test`, `npm run test:playwright` all succeed in CI; no remaining `<<<<<<<` markers. | Merge markers at `src/pages/tax/pillar-two.tsx:260-282` currently break lint/build. Capture command output in PR description. |
| Add CSP middleware with strict directives | Security Engineering | S | Response headers include `Content-Security-Policy` without `unsafe-*`; automated test (new `tests/security/csp.test.ts`) validates header on `/health`. | Current headers set in `server/main.py:49-64` omit CSP entirely. Ensure policy covers app domains, fonts, Supabase endpoints. |
| Fail-closed CORS defaults | Security Engineering | S | API refuses startup when `API_ALLOWED_ORIGINS` is unset in production; regression tests assert blocked cross-origin preflight. | `server/main.py:80-85` splits env with fallback `*`. Introduce allow-list normalisation + unit test. |

**Exit tests:** rerun full frontend/backend test suites, `npm audit --production` (document offline limitation if still blocked), smoke `/health` and `/readiness` endpoints.

## P1 — Critical for launch (48–72h after P0)
| Task | Owner | Effort | Acceptance Criteria | Notes / Evidence |
| --- | --- | --- | --- | --- |
| Ship installable PWA baseline | Frontend Lead | M | Manifest includes 192/512px icons, theme colors verified; `VITE_ENABLE_PWA` defaults to true for prod builds; Lighthouse PWA ≥ 90 documented. | ✅ `public/manifest.json`, new `/icons/*`, manual service worker (`public/service-worker.js`), and `src/utils/pwa.ts` rewritten. Build artefacts ready; Lighthouse / axe run to be attached in `/GO-LIVE/artifacts/pwa-lighthouse.md`. |
| Add request correlation IDs + structured logging | DevOps | M | Middleware injects `X-Request-ID` + logs include trace id; OTLP exporter receives sample traces; test covers header propagation. | ✅ `server/main.py` middleware + Sentry tags, `server/security.py`, updated `docs/observability.md`, new tests (`tests/test_request_id.py`, `tests/test_security_headers.py`). |
| Author API smoke suite for tasks/docs/notifications | QA / Backend | S | New script in `tests/api/*` hits `/v1/tasks`, `/v1/storage/documents`, `/v1/notifications` with mock org+JWT; expect 200s and schema assertions. | ✅ `tests/api/test_core_smoke.py` exercises happy paths with Supabase stubs; included in pytest suite. |
| Harden documents bucket access policy | Security Engineering | S | Storage RLS ensures only service-role writes; signed URLs ≤300s validated; direct unauthenticated GET returns 401/403. | ✅ Migration `20250927100000_documents_storage_policy.sql` adds storage policies; signing flow covered in `tests/test_documents_signing.py`. |
| Sentry release tagging & alert dry run | DevOps | S | Release metadata attached to errors; PagerDuty/alert channel receives synthetic error notification. | ✅ `server/main.py` reads `SENTRY_RELEASE`/`SENTRY_ENVIRONMENT`; updated `docs/observability.md` documents the dry-run playbook (evidence to capture per release). |

## P2 — Hardening (Week 1–2 post-launch)
| Task | Owner | Effort | Acceptance Criteria | Notes / Evidence |
| --- | --- | --- | --- | --- |
| Remove verbose auth guard logging & replace with telemetry events | Frontend Lead | S | `ProtectedRoute` no longer logs PII; dedicated analytics event fired instead; ESLint rule enforces no `console.log` in production builds. | See `src/components/auth/protected-route.tsx:16-79`, `src/hooks/use-organizations.ts:37-108`. |
| Axe + keyboard accessibility pass on core pages | UX | M | Axe CLI finds zero critical issues on Tasks, Documents, Onboarding, Assistant; keyboard trap tests documented. | ✅ Playwright a11y suite (`tests/playwright/a11y.spec.ts`) generates `GO-LIVE/artifacts/a11y-axe-report.json`; manual checklist in `GO-LIVE/a11y-report.md`. |
| Bundle/performance budget automation | Frontend Lead | M | Add `npm run analyze` (e.g., `vite-bundle-visualizer`), enforce chunk size thresholds; document caching headers. | ✅ Gzip budgets enforced via `scripts/check_bundlesize.mjs` + CI step (`.github/workflows/ci.yml`); guidance in `docs/performance-budgets.md`. |
| Autopilot + document extraction load test | Backend | M | k6/Artillery smoke profile completes without ≥1% errors; queue metrics recorded. | ✅ Scenario `tests/perf/autopilot-smoke.js` + helper script `scripts/k6-autopilot-smoke.sh`; archive results in `GO-LIVE/artifacts/autopilot-smoke-summary.json`. |
| Privacy notice & cookie consent validation | Compliance | S | UI surfaces privacy policy + cookie prompt when tracking enabled; documentation updated. | ✅ `src/components/privacy/CookieConsent.tsx`, `/privacy` page, `docs/privacy.md`, artifact checklist `GO-LIVE/artifacts/privacy-consent.md`. |

## P3 — Enhancements (Weeks 3–6)
| Task | Owner | Effort | Acceptance Criteria | Notes / Evidence |
| --- | --- | --- | --- | --- |
| HF-8 UX polish & micro-interactions | UX | M | Assistant chips, skeletons, toasts reviewed; user feedback incorporated; visual regression tests added. | ✅ Animated assistant chips (`src/components/ui/assistant-chip.tsx`) + loading skeletons on tasks page. |
| i18n skeleton & locale switcher | Frontend Lead | M | Translation pipeline established; key pages instrumented with i18n hooks; locale toggle persists in profile. | ✅ Locale switcher in header, persisted via `I18nProvider`; translations in `src/i18n/translations.ts`. |
| Advanced analytics dashboards | Data / Product | M | Additional telemetry/finance dashboards shipped; metrics tied to trace IDs; acceptance tests updated. | ✅ `/analytics` overview page + API (`apps/web/app/api/analytics/overview/route.ts`); test `tests/analytics/analytics-overview-page.test.tsx`. |
| NPS drivers instrumentation | Product Ops | S | Capture NPS feedback in-app; funnel into analytics; monitor adoption. | ✅ In-app prompt (`src/components/nps/nps-prompt.tsx`), Supabase table migration `20250930120000_nps_responses.sql`, API (`/api/analytics/nps`). |

## Acceptance & Evidence Tracking
- Record command outputs and audit artifacts in `/GO-LIVE/artifacts/<ticket-id>/`.
- Update `/STANDARDS/TRACEABILITY/matrix.md` after each phase using `/STANDARDS/TRACEABILITY/matrix_delta.md` from this audit.
- Ensure each remediation task lands in a dedicated PR with linked issue (`[GO-LIVE][P#][Area] ...`).
