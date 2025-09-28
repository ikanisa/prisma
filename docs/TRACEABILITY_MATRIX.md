# Assurance Traceability Matrix

This matrix maps key professional requirements to implemented platform controls and evidence.
Existing ISA 315/330 coverage remains applicable. New coverage below includes:

- **GRP1**: ISA 600 – Group audits (components, instructions, workpapers, reviews, audit trail)
- **EXP1 / OI**: ISA 720 – Other information; ISA 710 – Comparative information

---

## ISA 600 — Special Considerations—Audits of Group Financial Statements (GRP1)

| Requirement | Platform capability | Evidence / Data Source |
| --- | --- | --- |
| Establish responsibilities of the group engagement team for components (ISA 600.12–14) | `group_components` table with manager-only CRUD; dashboard context selectors to define scope, risk, lead auditors | SQL: `supabase/sql/audit_GRP1_schema.sql` (tables + RLS); API: `/api/group/components`; UI: `/audit/group` heatmap |
| Communicate instructions to component auditors and confirm acknowledgement (ISA 600.40–41) | `group_instructions` captures content, due dates, sender, acknowledgement metadata; API enforces org/user context and GRP activity logging | API: `apps/web/app/api/group/instructions/*`; Activity: `GRP_INSTRUCTION_SENT`, `GRP_INSTRUCTION_ACKED`; UI: dashboard instruction tracker |
| Evaluate sufficiency of component workpapers (ISA 600.42–44) | `component_workpapers` records ingestion method, links to instruction/document IDs and status; `/client-portal` for supporting docs | SQL schema; API: `/api/group/workpapers`; UI: upload links on dashboard |
| Direct, supervise, and review component work (ISA 600.24, .49–.50) | `component_reviews` assigns reviewers, due dates, sign-offs; endpoints capture reviewer actions with GRP_REVIEW_* logging | API: `/api/group/reviews`, `/api/group/reviews/{id}/signoff`; RLS restricts updates to assigned reviewers/managers; UI: Review queue |
| Maintain audit documentation and trail of actions (ISA 600.56–57) | All endpoints persist `activity_log` entries with GRP_* actions, preserving user/org context under RLS | Code: `apps/web/lib/group/activity.ts`; `activity_log` policies; Governance: `STANDARDS/POLICY/audit_group_audits.md` |

---

## ISA 720 — Other Information (OI) and ISA 710 — Comparative Information

| Standard | Requirement | Platform capability | Evidence / Data Source |
| --- | --- | --- | --- |
| ISA 720.12 | Evaluate whether other information is materially inconsistent with the financial statements or auditor knowledge | `/audit/other-info` workspace: document viewer, reviewer flag workflow, and `OI_FLAG_*` logging | Tables: `other_information_docs`, `oi_flags`; `activity_log` entries (`OI_DOCUMENT_UPLOADED`, `OI_FLAG_CREATED`, `OI_FLAG_RESOLVED`) |
| ISA 720.18 | Communicate unresolved inconsistencies in the auditor’s report | Report wording export endpoint summarizing open flags and checklist status | API: `/api/other-info/report-wording`; Data: `oi_flags.status` |
| ISA 710.6–7 | Compare current period other information with prior period figures and disclosures | Comparative checklist seeded via `comparatives_checks` with status tracking and links to flags | Table: `comparatives_checks`; Activity: `OI_COMPARATIVE_RECORDED`, `OI_COMPARATIVE_UPDATED` |
| ISA 710.A3 | Evaluate consistency of non-GAAP measures and reconciliations | Checklist assertion `non_gaap_measures` with notes and linkage to reviewer flags | Fields: `comparatives_checks.notes`, `linked_flag_id` |

> Additional ISA requirements are tracked in existing risk, controls, and workpaper modules; future updates should expand this matrix as features land.
