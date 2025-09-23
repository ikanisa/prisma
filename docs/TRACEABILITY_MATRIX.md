# Audit Traceability Matrix

This matrix links ISA requirements to implemented platform controls. Updates in this iteration focus on ISA 720 (Other Information) and ISA 710 (Comparative Information).

| Standard | Requirement | Platform capability | Evidence / Data Source |
| --- | --- | --- | --- |
| ISA 720.12 | Evaluate whether other information is materially inconsistent with the financial statements or auditor knowledge | `/audit/other-info` workspace with document viewer, reviewer flag workflow, and `OI_FLAG_*` logging | `other_information_docs` table, `oi_flags` table, `activity_log` entries (`OI_DOCUMENT_UPLOADED`, `OI_FLAG_CREATED`, `OI_FLAG_RESOLVED`) |
| ISA 720.18 | Communicate unresolved inconsistencies in the auditor’s report | Report wording export (`/api/other-info/report-wording`) summarising open flags and checklist status | API response payload and persisted flag status (`oi_flags.status`) |
| ISA 710.6-7 | Compare current period other information with prior period figures and disclosures | Comparative checklist seeded via `comparatives_checks` with status tracking and link to flags | `comparatives_checks` table, `OI_COMPARATIVE_RECORDED` / `OI_COMPARATIVE_UPDATED` activity logs |
| ISA 710.A3 | Evaluate consistency of non-GAAP measures and reconciliations | Checklist assertion `non_gaap_measures` with notes and linkage to reviewer flags | Checklist item metadata (`comparatives_checks.notes`, `linked_flag_id`) |

Additional ISA requirements are tracked in existing risk, controls, and workpaper modules; future updates should expand this matrix accordingly.
