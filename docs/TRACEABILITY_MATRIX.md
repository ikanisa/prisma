# Assurance Traceability Matrix

This matrix maps key professional requirements to implemented controls in the platform. Previous
entries for ISA 315/330 remain applicable; the section below adds ISA 600 coverage introduced by
the GRP1 workstream.

## ISA 600 – Special Considerations—Audits of Group Financial Statements
| Requirement | Implementation | Evidence |
| --- | --- | --- |
| Establish responsibilities of the group engagement team for components (ISA 600.12-14) | `group_components` table with manager-only CRUD and dashboard context selectors ensure the group team defines scope, risk, and lead auditors. | `supabase/sql/audit_GRP1_schema.sql` (table + RLS), `/api/group/components` routes, `/audit/group` heatmap. |
| Communicate instructions to component auditors and confirm acknowledgement (ISA 600.40-41) | `group_instructions` captures message content, due dates, sender, and acknowledgement metadata; `/api/group/instructions` endpoints enforce user context and GRP activity logging. | API handlers under `apps/web/app/api/group/instructions`, activity records `GRP_INSTRUCTION_SENT/ACK`, dashboard instruction tracker. |
| Evaluate sufficiency of component workpapers (ISA 600.42-44) | `component_workpapers` records ingestion method, linked instruction/document IDs, and status; dashboard links to `/client-portal` for supporting documentation. | SQL schema, `/api/group/workpapers`, dashboard upload links. |
| Direct, supervise, and review component work (ISA 600.24, .49-.50) | `component_reviews` assigns reviewers, due dates, and sign-off timestamps; `/api/group/reviews` and `/api/group/reviews/{id}/signoff` capture reviewer actions with GRP_REVIEW_* logging. | Review queue on `/audit/group`, Supabase policies restricting updates to assigned reviewers/managers. |
| Maintain audit documentation and trail of actions (ISA 600.56-57) | All endpoints persist `activity_log` entries with GRP_* actions, preserving user/org context alongside Supabase RLS protections. | `apps/web/lib/group/activity.ts`, `activity_log` policies, governance note in `STANDARDS/POLICY/audit_group_audits.md`. |
