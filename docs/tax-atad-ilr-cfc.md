# ATAD Interest Limitation & CFC Inclusion (T‑1C)

## References
- **Council Directive (EU) 2016/1164 (ATAD)** – Article 4 interest limitation rules.
- **Income Tax Act (Cap.123)** – Maltese transposition of ATAD interest deduction restrictions.
- **Article 5 ATAD** – Controlled Foreign Company rules.

## Interest Limitation (ILR)
- Threshold: higher of 30% of tax EBITDA or €3,000,000 safe harbour.
- Inputs: exceeding borrowing costs, tax EBITDA, standalone allowance (optionally set for standalone entities), carryforward interest, carryforward capacity, prior disallowed interest.
- Output: allowed interest, disallowed interest, updated carryforward figures, adjustment amount (increase to chargeable income).
- Stored in `interest_limitation_computations` with activity log `MT_ILR_COMPUTED`.

## CFC Inclusion
- Inputs: CFC profit, foreign tax paid, optional foreign effective rate (calculated if omitted), domestic rate (default 35%), participation percentage, profit attribution ratio, entity name.
- Output: inclusion amount (positive adjustment), tax credit eligible amount, evidence stored in `cfc_inclusions` with activity log `MT_CFC_COMPUTED`.
- Supports multiple entities per period; each entry can be re-applied to CIT adjustments.

## UI workflow
1. Navigate to `/tax/malta-cit` and select tax entity & period.
2. Populate ILR / CFC cards with relevant data and compute.
3. Apply generated adjustments to the master CIT adjustments list.
4. Run CIT computation; adjustment totals reflect ILR disallowance and CFC inclusions.
5. Historical computations visible with timestamps for traceability.

## Testing
- Unit tests in `tests/tax/calculators.test.ts` cover ILR and CFC scenarios.
- UI acceptance verified manually: compute values, apply adjustments, confirm totals update, and CIT computation includes applied amounts.
