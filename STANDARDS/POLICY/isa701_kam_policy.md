# ISA 701 Key Audit Matters Policy

## Purpose
Key Audit Matters (KAMs) communicate the most significant matters arising from the audit of financial statements. This policy aligns the Prisma Glow platform with ISA 701, ISA 260, ISA 230, ISA 315, and ISA 330 requirements.

## Scope
- Applies to all assurance engagements classified as audit within the platform.
- Mandatory for public interest entities (PIEs) and listed entities; optional for non-PIEs unless required by regulation or engagement letter.
- Covers identification, selection, drafting, approval, and reporting of KAMs.

## Roles and Responsibilities
- **Engagement Partner**: ultimate responsibility, approves final KAM drafts and report release.
- **Engagement Manager**: manages candidate pipeline, ensures drafting discipline, prepares approval package.
- **EQR Partner**: reviews KAM drafts where the engagement is flagged `eqr_required = true`.
- **Audit Team Members (Employee+)**: propose candidates, supply evidence, maintain traceability.

## Candidate Identification
1. **Mandatory feeds**
   - Significant risks (ISA 315) and fraud risks automatically seed candidates.
   - Estimates with `uncertainty_level` of `HIGH` or `SIGNIFICANT` in the estimate register.
   - Going concern worksheets with assessment `MATERIAL_UNCERTAINTY` (ISA 570 linkage).
2. **Manual entries**
   - Any team member with at least Employee role may add `source = 'OTHER'` when matters warrant partner attention.
3. **Selection & Exclusion**
   - Manager+ may mark candidates as `SELECTED` (will move to drafting) or `EXCLUDED` (requires rationale recorded in ActivityLog).
   - Exclusions should capture basis (e.g., mitigated, insufficient significance) and be revisited at completion.

## Drafting Standards
- Use the drafting workflow (`kam_drafts`) for selected candidates only.
- Required narrative sections:
  - `why_kam`: concise rationale linked to associated risk/estimate/GC drivers.
  - `how_addressed`: summary of tailored procedures, no boilerplate, cross-reference to planned procedures.
  - `results_summary`: neutral, factual outcome statement referencing evidence.
- Cross-references:
  - `procedures_refs`: at least one planned procedure (`audit_planned_procedures.id`) with ISA references.
  - `evidence_refs`: at least one evidence item (`audit_evidence.id` or `documents.id`) with contextual note.
- Draft status progression: `DRAFT` → `READY_FOR_REVIEW` → `APPROVED` (or `REJECTED` for rework).

## Approval Workflow
1. Submission triggers Approval Queue item `KAM_DRAFT` with manager/partner routing.
2. If engagement `eqr_required = true`, create secondary Approval Queue item for the EQR partner; final approval requires both sign-offs.
3. Rejections must include corrective guidance and revert draft to `DRAFT`.
4. Approved drafts become immutable aside from metadata updates driven by reconsideration at completion.

## Activity Logging & Traceability
- All candidate status changes and draft lifecycle events captured via `ActivityLog` events (`KAM_CANDIDATE_*`, `KAM_DRAFT_*`).
- Traceability matrix entries must link control objectives (identification, drafting, approvals, reporting) to artefacts (candidate IDs, draft IDs, approval IDs, evidence references).
- Store supporting documentation in `documents` or `workpapers` with org-scoped storage and short-lived signed URLs.

## Documentation & Retention
- Maintain drafting history and approvals per ISA 230.
- Retain KAM documentation for at least seven years or longer if local regulation requires.
- Export packages (JSON/Markdown) retained in secure storage with immutable versioning.

## Quality Control
- Engagement Partner reviews candidate pipeline at planning, execution, and completion stages.
- EQR partner reviews KAM conclusions when triggered by firm policy (see `/STANDARDS/POLICY/eqr_criteria.md`).
- Monitor for boilerplate language and ensure updates when circumstances change.
