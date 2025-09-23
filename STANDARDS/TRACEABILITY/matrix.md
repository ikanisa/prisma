# Tax Module Traceability Matrix

The matrix aligns statutory requirements with the new database schemas, API routes, UI workspaces, and automated tests.

| Requirement | Supabase Schema | API Route | UI Workspace | Test Coverage | Notes |
| --- | --- | --- | --- | --- | --- |
| Malta CIT (ISA 315, MT CIT Act) | `mt_cit_calculations` | `/api/tax/mt/cit/compute` | Malta core – CIT | `tests/tax/test_calculators.py::test_malta_cit_decisions` | Review threshold 500k triggers Head of Tax approval. |
| Malta NID / Participation Benefit | `mt_nid_positions` | Client computation | Malta core – Participation/NID | `tests/tax/test_calculators.py::test_malta_nid_cap` | Enforces statutory cap and utilisation metric. |
| ATAD ILR (EU ATAD) | `mt_atad_ilr_evaluations` | Client computation | Malta core – ATAD ILR | `tests/tax/test_calculators.py::test_atad_ilr_refusal_gate` | Refusal when disallowed interest > 20% EBITDA. |
| Fiscal Unity (MT regulations) | `mt_fiscal_unity_reviews` | Client computation | Malta core – Fiscal unity | `tests/tax/test_calculators.py::test_fiscal_unity_review` | Review when pooling benefit claimed, refusal on loss. |
| VAT/OSS/IOSS (EU VAT directive) | `eu_vat_periods` | `/api/vat/period/prepare` | EU overlays – VAT | `tests/tax/test_vat_workflow.py::test_vat_review_flags` | Review on refunds and non-domestic schemes. |
| DAC6 (EU DAC6) | `eu_dac6_assessments` | `/api/dac6/scan` | EU overlays – DAC6 scanner | `tests/tax/test_calculators.py::test_dac6_flagging` | Refusal when >2 arrangements flagged. |
| Pillar Two (OECD GloBE) | `eu_pillar_two_monitoring` | `/api/p2/compute` | EU overlays – Pillar Two | `tests/tax/test_calculators.py::test_pillar_two_top_up` | Refusal when aggregate top-up ≥ 500k. |
| Treaty Resolver / MAP / APA | `intl_treaty_resolver_runs` | `/api/treaty/resolve` | International – Treaty resolver | `tests/tax/test_calculators.py::test_treaty_workflow` | Review when MAP unavailable or APA requested. |
| US GILTI (IRC §951A) | `us_overlay_gilti_runs` | `/api/us/gilti/compute` | International – US overlays | `tests/tax/test_calculators.py::test_us_gilti_thresholds` | Refusal when no GILTI base, review above 250k tax. |
| Autonomy Telemetry & Policy Packs | `autonomy_telemetry_events`, `autonomy_policy_packs` | Activity logging within all routes | Evidence export banner | `tests/tax/test_telemetry_payloads` | Ensures activity snapshots include decision + metrics. |
