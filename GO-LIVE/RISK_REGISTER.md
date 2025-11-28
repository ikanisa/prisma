# Risk Register

| Risk | Impact | Likelihood | Owner | Mitigation | Status | Reference |
| --- | --- | --- | --- | --- | --- | --- |
| Build pipeline blocked by Pillar Two merge conflict | Release cut impossible; QA halted | High | Frontend Lead | Conflict resolved; keep regression suite green. | Mitigated (await release) | `src/pages/tax/pillar-two.tsx`, `npm run build` logs |
| No CSP header on API responses | XSS / content injection exposure; fails go-live checklist | High | Security Engineering | CSP middleware + security header tests landed. | Mitigated (await release) | `server/main.py:60-127`, `tests/test_security_headers.py` |
| CORS defaults to `*` | Cross-origin abuse of authenticated endpoints | High | Security Engineering | Allow-list enforcement shipped; requires prod env configuration. | Mitigated (await release) | `.env.example`, `server/main.py:83-91` |
| PWA artefacts not validated | Lighthouse PWA <90; install prompt unverified | Medium | Frontend Lead | Run Lighthouse/axe on built bundle; attach artefacts per runbook. | Open (P1) | `GO-LIVE/artifacts/pwa-lighthouse.md` |
| Missing correlation/request IDs | Incident response slowed; traceability gap | Medium | DevOps | Request-ID middleware + structured logging; release dry run pending. | Mitigated (validation pending) | `server/main.py:60-127`, `docs/observability.md` |
| Storage bucket lacks explicit RLS | Potential cross-tenant leakage | Medium | Security Engineering | Storage policy migration + signing tests implemented; run staging negative test. | Mitigated (validation pending) | `supabase/migrations/20250927100000_documents_storage_policy.sql`, `tests/test_documents_signing.py` |
| No automated API smoke tests | Regressions in HF-1..HF-3 could ship undetected | Medium | Backend QA | Smoke suite with Supabase stubs committed; execute against staging. | Mitigated (validation pending) | `tests/api/test_core_smoke.py` |
| Sentry release tagging/alert dry run outstanding | Missed production alerts or untagged issues | Medium | DevOps | Use updated playbook to trigger synthetic error + capture PagerDuty alert. | Open (P1) | `docs/observability.md`, `GO-LIVE/RELEASE_RUNBOOK.md` |
| Autonomy/document/archival load unproven | Background job instability under load | Low | Backend | Run Phase D k6 suites (`tests/perf/autonomy-burst.js`, `tests/perf/doc-ingestion-spike.js`, `tests/perf/archive-rebuild.js`) and capture release-control environment output | Mitigated (validation pending) | `server/main.py:700-820`, `tests/test_autopilot_worker.py`, `tests/perf/README.md` |
| Verbose console logging leaks user/org info | Info disclosure via devtools logs | Medium | Frontend Lead | Replace logs with telemetry, lint rule | Planned (P2) | `src/components/auth/protected-route.tsx:16-79` |
