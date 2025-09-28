# Audit Policy: Other Information (ISA 720 / ISA 710)

## Purpose
This policy establishes the minimum procedures the audit team must perform when reviewing "other information" accompanying the financial statements. It operationalises ISA 720 requirements on evaluating other information for inconsistencies with the audited financial statements and ISA 710 requirements on comparative information.

## Scope
- All engagements onboarded in the platform that include published narrative reports, management commentary, or regulatory filings issued alongside audited financial statements.
- Comparative information disclosed for prior periods, including non-GAAP metrics that reconcile to audited results.

## Roles and responsibilities
- **Engagement partner / manager** – approves the final other information conclusion and ensures all reviewer flags are cleared or documented.
- **Engagement team** – uploads other information artefacts, performs comparative checklist procedures, and documents flags with resolution evidence.
- **Quality reviewer** – monitors activity log entries for `OI_*` actions to confirm traceability of review steps.

## Required controls and tooling
1. **Document intake** – other information artefacts must be uploaded through the `/audit/other-info` workspace. Uploads capture checksum, file size, MIME type, and (for PDFs) inferred page counts. Each upload is logged in `activity_log` with the `OI_DOCUMENT_UPLOADED` action.
2. **Reviewer flags** – potential inconsistencies or omissions are recorded as flags with severity and category tags. Resolution requires setting the flag status to `resolved`, automatically logging `OI_FLAG_RESOLVED` in the activity log.
3. **Comparatives checklist** – the comparative procedures seeded from the ISA 710 defaults must be completed for every engagement. Changes to checklist status are tracked with `OI_COMPARATIVE_RECORDED` and `OI_COMPARATIVE_UPDATED` log entries.
4. **Report wording export** – once documentation is complete, the "Generate report wording" control produces a summary for inclusion in the auditor's report and records an `OI_REPORT_EXPORTED` activity.

## Evidence retention
- `other_information_docs`, `oi_flags`, and `comparatives_checks` tables retain engagement-specific evidence under Supabase row-level security, ensuring only organisation members can access the data.
- Activity log entries retain the actor ID, organisational context, and metadata for each OI action, supporting post-engagement reviews.

## Compliance mapping
| Standard | Requirement | Platform control |
| --- | --- | --- |
| ISA 720 | Evaluate other information for material inconsistencies | Document viewer, reviewer flags, and logging of OI actions |
| ISA 710 | Compare current and prior period disclosures | Comparative checklist with default ISA 710 assertions |
