# Phase 4 Security Review Checklist

This checklist guides the final security hardening activities prior to production launch. Complete all items, attach evidence, and record outcomes in the table below.

---

## 1. Supabase RLS & Policy Validation

| Item | Command / Artefact | Evidence |
| --- | --- | --- |
| Run policy regression suite | `psql "$DATABASE_URL" -f scripts/test_policies.sql` | `docs/SECURITY/evidence/rls-<date>.log` |
| Validate new KAM tables | Confirm RLS policies exist for `estimate_register`, `going_concern_worksheets`, `audit_planned_procedures`, `audit_evidence`, `kam_candidates`, `kam_drafts`. |
| Verify approval queue policy | Ensure Manager+ and Partner/EQR flows enforced via Supabase policies and API gating. |
| Storage buckets | Run `scripts/storage/test_signed_urls.sh` to verify signed URL TTL and redaction. |

---

## 2. Secrets & Configuration Audit

| Item | Command / Artefact | Evidence |
| --- | --- | --- |
| Vault / 1Password audit | Export secret inventory (`docs/SECURITY/secrets-inventory.md`) and confirm rotations. |
| `.env` drift check | `scripts/secrets/compare_env.sh` ensures `.env.local` matches `.env.example`. |
| Supabase service roles | Confirm no service role keys are exposed in hosting/CI logs; rotate if older than 90 days. |
| OpenAI / Agent credentials | Check `lib/openai/client.ts` uses Vault loader; ensure no raw keys committed. |

---

## 3. Endpoint Hardening & Monitoring

| Item | Command / Artefact | Evidence |
| --- | --- | --- |
| API security tests | Run `npm run test:security` *(supertest/owasp zap smoke)*; capture report. |
| Webhook signature verification | Replay invalid payloads via `scripts/security/webhook_replay.ts` and confirm 4xx. |
| Rate limiting assertions | `npm run test:ratelimit` or targeted k6 script to ensure 429s with proper headers. |
| Telemetry alerts | Verify Grafana alerts for error spikes and rate limiting under Phase 4 load; screenshot dashboards. |

---

## 4. Dependency & Build Hygiene

| Item | Command / Artefact | Evidence |
| --- | --- | --- |
| Dependency audit | `npm audit --production`, `npm run lint`, `npm run typecheck`. |
| Container / runtime scan | If deploying via container, run `trivy fs .` or relevant scanner. |
| CI pipeline | Ensure CI enforces lint/test coverage gates; capture latest CI run. |

---

## 5. Penetration Testing & Threat Drills

| Item | Command / Artefact | Evidence |
| --- | --- | --- |
| External pen test | Attach latest report with remediation notes. |
| Internal threat drill | Run tabletop exercise covering Supabase breach, API abuse, storage leak; document outcomes in `docs/SECURITY/threat-drills.md`. |
| Incident response review | Confirm runbook in `docs/SECURITY/incident-response.md` is up to date and on-call roster signed off. |

---

## 6. Sign-off Summary

| Date | Reviewer | Area | Status | Notes / Jira |
| --- | --- | --- | --- | --- |
|  |  | RLS & policies |  |  |
|  |  | Secrets & config |  |  |
|  |  | Endpoint hardening |  |  |
|  |  | Dependency audit |  |  |
|  |  | Pen test / drills |  |  |

---

**Instructions**
1. Clone this file as needed per environment (staging, prod).
2. Store all evidence under `docs/SECURITY/evidence/<date>/`.
3. Update the Implementation Plan Phase 4 section with completion links.
4. Obtain Partner & Security sign-off before promoting to production.

Maintain this checklist in source control for auditors. Update whenever new modules introduce additional attack surface.
