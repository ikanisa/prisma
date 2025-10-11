# Fullstack Source Audit (Phase 5 Kick-off)

Date: 2025‑10‑09  
Owner: Platform Engineering

## 1. Architecture Overview

| Layer | Key Components | Notes |
| --- | --- | --- |
| Frontend (App) | `apps/web`, `src/` shared lib | Vite + React + shadcn UI, heavy reliance on `src/lib/system-config.ts` for product behaviour. |
| API / Edge | `apps/web/app/api/*`, `apps/gateway` | Next-style route handlers, Express gateway, both calling Supabase and bespoke services. |
| Services | `services/rag`, `server`, `supabase/functions` | Node + Python workers (OpenAI, document processing), Supabase Edge Functions for data/analytics. |
| Data & Auth | `supabase/` migrations, RLS helpers in SQL/PLPGSQL | Extensive schema (>150 migrations). RLS relies on helper functions (`has_min_role`, `is_member_of`). |
| Configuration | `config/system.yaml`, numerous YAML/JSON manifests | Drives autonomy levels, role hierarchy, UI entry points, agent manifests. |
| Tooling & Tests | `tests/*`, `scripts/*`, Vitest, Playwright, k6 perf suites | Coverage script (`scripts/coverage.sh`) assumes demo-env secrets, k6 scenarios under `tests/perf/`. |

### Observed Pain Points
- **Configuration drift:** `config/system.yaml` is parsed separately on frontend and services with ad-hoc validation. A missing/invalid autonomy level silently falls back to defaults.  
- **Role duplication:** Org role enumerations exist in multiple places (TypeScript, Python, SQL), increasing drift risk.  
- **Fragile tests:** Vitest suite relies on demo-mode Supabase config; missing secrets produce noisy failures (`supabase.config_missing_demo_mode`).  
- **Package installation:** Scripts assume `ts-node`/`@sentry/node` installed; missing dependencies halt coverage runs in clean environments.  
- **Operational docs scattered:** Phase 4 added hardening runbooks but production (Phase 5) cadence was undocumented.

## 2. Refactor Goals

| Goal | Description | Risk if Unaddressed |
| --- | --- | --- |
| Validate shared configuration | Provide repeatable validation for `config/system.yaml` (autonomy, roles, permissions). | Silent misconfiguration leading to incorrect autonomy gating or approval flows. |
| Centralise role & autonomy constants | Reuse a single source of truth across frontend scripts and validation tooling. | Divergent behaviour across app layers, hard-to-debug bugs. |
| Harden production operations | Document on-call cadence, incident response, compliance tasks. | Launch without clear operational ownership; regressions unnoticed. |

## 3. Phased Plan & Status

| Phase | Scope | Deliverables | Status |
| --- | --- | --- | --- |
| 1. Audit & Backlog | Capture architecture, issues, prioritized actions. | This document + backlog items in Phase 5 plan. | ✅ |
| 2. Config Refactor | Extract shared constants, add config validator, wire into scripts. | `src/lib/config/constants.ts`, `scripts/config/validate-config.ts`, `npm run config:validate`. | ✅ *(implemented in this iteration)* |
| 3. Operationalisation | Define steady-state runbook & checklists for post-launch. | `docs/PHASE5/production-operations-runbook.md`, updated implementation plan. | ✅ |
| 4. Follow-up | Stabilise Vitest demo env, align server role config, add artefact archive helper. | Demo env defaults in tests/config, server role map derived from config, `scripts/operations/archive-phase4.sh`. | ✅ |

## 4. Recommendations / Next Steps

1. **Adopt the config validator in CI:** add `npm run config:validate` to the lint/test pipeline to catch autonomy/role discrepancies before merge.
2. **Backfill server-side usage:** mirror the new constants/validation into Python services (single JSON payload) to eliminate role drift.
3. **Stabilise tests:** Provide mocked Supabase config or adjust coverage script to skip demo-mode gating when secrets absent.
4. **Track OPS backlog:** seed upcoming improvements (observability automation, cost guardrails, retention audits) using the Phase 5 backlog table in `IMPLEMENTATION_PLAN.md`.

> This document should be revisited quarterly (or after major architecture changes) to confirm assumptions remain valid and backlog items progress.
