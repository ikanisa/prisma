# Malta NID & Patent Box Calculators (T‑1B)

## References
- **Malta Income Tax Act (Cap.123)** – Notional Interest Deduction rules (Articles 14AA & 14AB).
- **Notional Interest Deduction Guidelines (CfR)** – reference rate composed of risk-free rate plus 5% risk premium, deduction capped at 90% of chargeable income.
- **Patent Box Regime (Deduction) Rules, 2019** – nexus fraction methodology, uplift cap of 30%, deduction of 95% of qualifying IP profits.

## Calculation overview
- **NID**
  - Inputs: qualifying equity base, risk-free rate, risk premium (default 5%), optional reference rate override, prior NID utilised, chargeable income before deduction, statutory cap ratio (default 90%).
  - Outputs: reference rate applied, gross deduction, capped deduction, deduction after carryforward, adjustment amount (negative value for CIT adjustments).
  - Evidence: computation stored in `nid_computations` with metadata, ActivityLog `MT_NID_COMPUTED`.

- **Patent Box**
  - Inputs: qualifying IP income, qualifying expenditure, overall expenditure, routine return rate (default 10%), uplift cap (default 30%), deduction rate (default 95%).
  - Outputs: routine return, uplift applied (capped), nexus fraction, deduction base, deduction amount, adjustment amount.
  - Evidence: computation stored in `patent_box_computations`, ActivityLog `MT_PATENT_BOX_COMPUTED`.

## Workflow
1. Employee captures inputs in the Malta CIT workspace (`/tax/malta-cit`).
2. UI calls `/functions/v1/tax-mt-nid` with calculator flag (`NID` or `PATENT_BOX`).
3. Supabase function validates membership, persists computation rows, logs Activity events, and returns adjustment amount.
4. User applies deduction to CIT adjustments list (automated helper ensures unique entry per computation).
5. CIT computation includes these adjustments and stores combined payload in `cit_computations.adjustments`.

## Acceptance snapshot
- Three sample scenarios covered by unit tests (`tests/tax/calculators.test.ts`).
- Computations visible in history table with apply button, ensuring traceability and reusability.
- Adjustments carry negative amounts and are reflected in CIT total adjustments display.
