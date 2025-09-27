# Report Opinion Decision Tree (ISA 700/705/706)

## Inputs
- **Misstatement evaluation (D3)**: uncorrected/uncleared misstatements, classification (material, pervasive).
- **Scope limitations**: inability to obtain sufficient appropriate audit evidence (SAE).
- **Going concern (D2)**: material uncertainty conclusions.
- **Engagement metadata**: whether engagement is a PIE/listed, EQR requirement.

## Decision Rules
1. **Scope limitation**
   - If SAE exists and potential effects could be both material and pervasive → **Disclaimer**.
   - If SAE exists and potential effects material but not pervasive → **Qualified (scope limitation)**.
2. **Identified misstatements**
   - Material but not pervasive misstatements → **Qualified (misstatement)**.
   - Material and pervasive misstatements → **Adverse**.
3. **Going concern**
   - If management disclosure adequate & MU exists → Opinion remains **Unmodified**; include "Material Uncertainty Related to Going Concern" section (not EOM).
   - If disclosure inadequate and matter is material → follow misstatement branch (Qualified/Adverse).
4. **Other matters**
   - Include EOM paragraph when a properly disclosed issue is fundamental to understanding but does not require opinion modification.
   - Include OM paragraph for audit-report-specific communications (ISA 706.8).

## Outputs
- `recommendedOpinion`: UNMODIFIED | QUALIFIED | ADVERSE | DISCLAIMER.
- `reasons[]`: explanation referencing controls/artifacts.
- `requiredSections[]`: e.g., `['BASIS_FOR_OPINION', 'GC_MATERIAL_UNCERTAINTY', 'EOM']`.

## Traceability
- Link decision output to misstatement IDs, KAM IDs, GC worksheet IDs.
- Store decision metadata in `audit_report_drafts` payload.
