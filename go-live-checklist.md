# Go-Live Verification Checklist

_Last updated: 2025-11-04_

## 1. Platform Controls
- [x] FastAPI gateway enforces trusted hosts, strict CORS, and CSP defaults.
- [x] Request telemetry middleware enabled with OTEL tracer + Sentry release metadata.
- [x] Release control evaluations executed via `/api/release-controls/check` with environment gating.
- [ ] Attach Sentry release drill outputs (tagged release + PagerDuty notification transcript).
- [ ] Upload Lighthouse + axe artefacts from the PWA audit workflow.

## 2. Data & Storage
- [x] Supabase document storage policies deployed with migration hash recorded in runbook.
- [ ] Negative download attempt captured against staging bucket to confirm policy enforcement.
- [ ] Archive Supabase CLI output (`supabase db push`) alongside deployment record.

## 3. Client Experience
- [x] PWA manifest and service worker precache verified in staging build.
- [x] Offline queue retries bounded with IndexedDB durability across reloads.
- [ ] Bundle size and Lighthouse budgets signed off by performance lead.

## 4. Quality Gates
- [x] Lint, unit, API smoke, and Playwright suites run clean on latest main.
- [x] Release runbook reviewed and signed off by SRE + product.
- [ ] Observability dashboard links (APM, logs, uptime) added to release record.

## 5. Approvals
- [x] Security: ✅ (CISO)
- [x] Product: ✅ (GM, Prisma Glow)
- [x] Engineering: ✅ (Head of Platform)
- [ ] Operations: ⏳ pending Sentry drill evidence
