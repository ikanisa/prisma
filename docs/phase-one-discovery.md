# Phase One: Discovery & Scope Confirmation

## 1. Inventory of Existing Assets

### Data Layer (Supabase)
- `supabase/blueprint.sql` defines shared tables for agent sessions, audit records, accounting entries, and generic tax rules with RLS policies but contains no Malta-specific engines or EU overlays.
- `supabase/migrations/` currently lacks module-specific migrations for the requested calculators or telemetry controls.
- No seed data in `supabase/seed/` relates to Malta CIT, NID, ATAD ILR, fiscal unity, VAT/OSS/IOSS, DAC6, Pillar Two, treaty resolver, or US overlays.

### Backend/API Layer (Next.js)
- `apps/web/app/api/` exposes `auth` and `compliance` namespaces only; there are no tax-focused routes such as `/api/tax/mt/cit/compute` or `/api/vat/period/prepare`.
- Logging utilities and shared helpers exist under `lib/` and `services/`, but no dedicated calculators or approval workflows are present for the requested tax modules.

### Frontend (Web App)
- `apps/web/app/tax/page.tsx` renders a minimal placeholder that references "VAT helper tools" without workspace segmentation or integration hooks.
- Existing UI components under `ui/` and `app/dashboard` offer generic patterns (cards, tables, filters) that can be repurposed, but nothing is wired to tax data sources yet.

### Testing & QA
- `tests/test_vat_evaluator.py` is the only tax-adjacent automated test, covering a static VAT Q&A helper; there are no calculator verifications or refusal-gate scenarios.
- Broader integration and API tests focus on agent routing, rate limits, and idempotency, leaving the tax workflows untested.

### Documentation & Standards
- Repository root documentation (e.g., `ENDPOINTS_AND_WORKFLOWS.md`, `DATA_MODEL.md`, `IMPLEMENTATION_PLAN.md`) makes no mention of Malta engines or EU/US overlays.
- There is no `/STANDARDS/` directory in the repository, confirming that policy packs and traceability artifacts must be authored from scratch.

## 2. Gap Analysis vs. Requested Features

| Capability | Data Layer Gaps | API Gaps | Frontend Gaps | Testing/Docs Gaps |
| --- | --- | --- | --- | --- |
| Malta CIT engine | No tables, functions, or RLS for corporate tax computations or approvals | Missing compute/approval routes and logging hooks | No workspace, form inputs, or evidence export flows | No calculator unit tests or policy coverage |
| Malta NID / participation benefits | Missing schema for participation equity tracking or benefit caps | No NID calculators or review endpoints | UI lacks scenario builders and approval queues | Lacks tests documenting refusal gates |
| ATAD ILR / CFC controls | No entities for interest limitation carryforwards or CFC classifications | No ATAD computation APIs | UI has no monitoring panels | No compliance automation tests |
| Fiscal unity | No consolidated group tables or rule engines | Absent fiscal-unity simulators | UI has no consolidation workflow | No regression coverage |
| VAT / OSS / IOSS | Only generic `tax` table; lacks regime-specific rates or filings | No period preparation APIs or evidence logging | UI lacks filing calendar or sampling interface | Only basic VAT Q&A test exists |
| DAC6 | No mandatory disclosure storage or taxonomy | Missing `/api/dac6/scan` or reporting routes | UI lacks risk flags and disclosure wizard | No tests for hallmarks or approvals |
| Pillar Two | No minimum tax or safe harbor data structures | No `/api/p2/compute` endpoints | UI lacks Pillar Two dashboards | No unit/integration tests |
| Treaty resolver / MAP / APA | No treaty database or article mapping | Missing resolver endpoints | UI lacks treaty navigator | No scenario coverage |
| US overlays (GILTI, BEAT, etc.) | No US-specific tables or rate sets | No `/api/us/gilti/compute` routes | UI lacks US overlay workspace | No automated validations |
| Autonomy controls (policy packs, telemetry) | No policy pack metadata or telemetry events | No control surfaces or logging APIs | UI lacks policy dashboards | Docs/tests do not mention autonomy controls |

## 3. Domain Alignment Summary

### Malta Core Engines
- **Corporate Income Tax (CIT):** Requires entity-level taxable base inputs (EBIT, deductions, tax credits), treaty adjustments, and approval audit trails. Outputs should include taxable income, Malta tax liability, refunds, and audit logs.
- **Notional Interest Deduction (NID):** Needs capital base tracking, risk capital adjustments, and participation exemption interactions. Calculations should surface allowable deductions, residual balance, and rejection reasons when thresholds are exceeded.
- **ATAD Interest Limitation Rule (ILR) & CFC:** Must account for exceeding borrowing costs, EBITDA, equity escape tests, and controlled foreign company classifications, producing allowable interest, disallowed amounts, and CFC inclusion triggers.
- **Fiscal Unity:** Requires group membership metadata, consolidation adjustments, and intra-group eliminations, with outputs for consolidated taxable profit and member-level allocations.

### EU Overlays
- **VAT/OSS/IOSS:** Needs regime selection, transaction categorisation, evidence sampling, and filing calendars. Outputs include net VAT payable/receivable per period, evidence packages, and readiness states.
- **DAC6:** Must map arrangements to hallmarks, assign disclosure deadlines, and log reporting status per intermediary/taxpayer, surfacing risk tiers and outstanding actions.
- **Pillar Two:** Requires group revenue, effective tax rate computations, safe harbor tests, and top-up tax calculations across jurisdictions, returning jurisdictional liabilities and adjustment notes.

### International Tools
- **Treaty Resolver / MAP / APA:** Needs treaty database, article lookup, mutual agreement case tracking, and APA inventory. Outputs should cover treaty applicability, relief recommendations, and case status.
- **US Overlays (e.g., GILTI, BEAT):** Must handle tested income, QBAI, foreign tax credits, and base erosion payments, yielding US inclusions, credits, and exposure analytics.

### Autonomy Controls
- **Policy Packs:** Require templated control catalogs, attestation workflows, and versioning to enforce oversight per tax regime.
- **Telemetry:** Should emit structured events for calculator runs, approvals, rejections, exports, and manual overrides to support monitoring and audit readiness.

## 4. Open Questions & Next Steps
- Confirm authoritative data sources (ERP, statutory ledgers, manual inputs) for each calculator to design schemas and ingestion flows.
- Determine preferred precision library (e.g., `decimal.js` or `dinero.js`) for financial calculations and whether regulatory rounding rules differ by module.
- Align on approval hierarchies, evidence retention requirements, and retention schedules to inform both RLS policies and policy pack documentation.
- Validate whether autonomy controls require integration with existing telemetry services or if new Supabase functions should be introduced in Phase Two.
