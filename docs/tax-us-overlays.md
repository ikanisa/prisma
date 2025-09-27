# US Tax Overlays (T‑3B)

## References
- **IRC §951A** – Global Intangible Low-Taxed Income (GILTI).
- **IRC §163(j)** – Limitation on business interest expense deductions.
- **IRC §55** – Corporate alternative minimum tax (CAMT) as amended by the Inflation Reduction Act.
- **IRC §4501** – Excise tax on stock repurchases.

## Data model
- `us_tax_overlay_calculations` aggregates overlay runs with normalised inputs and computed results per tax entity & period.
- Activity Log entries (`US_GILTI_COMPUTED`, `US_163J_COMPUTED`, `US_CAMT_COMPUTED`, `US_4501_COMPUTED`) provide traceability with policy pack `T-GOV-1`.

## Workflow
1. Go to `/tax/us-overlays` (manager role required).
2. Choose the overlay type (GILTI, §163(j), CAMT, or §4501) and populate the relevant inputs.
3. Click **Compute overlay**. The edge function validates inputs, executes the calculator, stores the result, and emits the relevant Activity Log event with adjustment metadata.
4. Review stored calculations in the history grid. Each record includes key metrics (e.g., net GILTI tax, §163(j) disallowed interest, CAMT top-up, excise tax).
5. Use the adjustment amounts within the broader tax automation (e.g., CIT adjustments).

## Testing
- Deterministic unit coverage in `tests/tax/calculators.test.ts` exercises all overlay calculators and the `calculateUsOverlay` helper.
- Edge-function integration coverage to be added alongside future Supabase integration tests.
- Manual acceptance: run each overlay scenario and confirm Activity Log entries and `us_tax_overlay_calculations` rows are created with appropriate adjustment amounts.

## Evidence & Controls
- RLS ensures only org members (role ≥ staff) can access and mutate overlay data.
- Metadata column allows storing additional audit support (e.g., worksheet references, reviewer notes).
- Adjustment amounts produced by overlays should reconcile to tax provision workpapers and tie into CIT adjustments where applicable.
