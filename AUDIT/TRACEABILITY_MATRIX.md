# Audit Traceability Matrix

| Standard / Clause | Control Objective | Implementation Artifacts | Evidence & Notes |
| --- | --- | --- | --- |
| ISA 500 A9–A13 | Demonstrate sufficient appropriate audit evidence over reconciliations, including treatment of reconciling items and misstatements. | Supabase schema `supabase/sql/audit_REC1_schema.sql`, reconciliation APIs under `apps/web/app/api/recon/*`, and the audit reconciliation workbench `apps/web/app/audit/reconciliations/page.tsx`. | RECON_* activity logging (`apps/web/lib/audit/activity-log.ts`), automatic evidence hooks and misstatement generation in `reconciliation-store`, and schedule exports documenting follow-up obligations. |
