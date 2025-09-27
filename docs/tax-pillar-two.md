# Pillar Two QDMTT & IIR Engine (T‑2C)

## References
- **OECD/G20 Inclusive Framework on BEPS – Pillar Two Model Rules (December 2021)**
- **EU Council Directive (EU) 2022/2523** on ensuring a global minimum level of taxation for multinational groups.
- **Maltese transposition guidance** (Commissioner for Revenue circulars on QDMTT implementation).

## Scope & Data model
- `tax_entity_relationships` registers ownership links between parent and child tax entities (percentage, effective date, notes).
- `pillar_two_computations` stores jurisdiction-level results, GIR payload, and calculated aggregates (total top-up, QDMTT, residual IIR).
- ActivityLog catalog entry `PILLAR_TWO_COMPUTED` enriches audit trail with module `TAX_PILLAR_TWO` and policy pack `T-GOV-1`.

## Workflow
1. Navigate to `/tax/pillar-two` (manager role).
2. Maintain the tax entity tree via the **Entity relationships** card (parent/child pairs, ownership %).
3. For the period under review, capture jurisdiction inputs (GloBE income, covered taxes, substance carve-out, QDMTT already paid, safe harbour thresholds).
4. Click **Compute Pillar Two**:
   - If Supabase is configured, the edge function `/functions/v1/tax-mt-nid?calculator=PILLAR_TWO` validates membership, runs the calculator, persists the computation, and logs `PILLAR_TWO_COMPUTED`.
   - In demo mode the client evaluates the calculation locally using `calculatePillarTwo` for training purposes.
5. Review totals (top-up, QDMTT credit, residual IIR) and jurisdiction rows. The GIR summary is stored alongside the computation for downstream exports.
6. History table lists prior computations with references suitable for inclusion in the global information return pack.

## Testing
- Deterministic unit coverage in `tests/tax/calculators.test.ts` ensures QDMTT offsets and safe harbour scenarios behave as expected.
- Manual acceptance: configure two jurisdictions (parent with ≥15% effective tax rate, subsidiary below the minimum with €10k QDMTT already paid). Expected outcome – total top-up equals €20k, QDMTT credit €10k, residual IIR €10k, ActivityLog entry recorded.

## Evidence & Controls
- Computation history and GIR payloads are queryable via `pillar_two_computations` (RLS enforced through `app.is_member_of`).
- ActivityLog metadata links each calculation to policy pack `T-GOV-1`, satisfying governance requirements around cross-border minimum tax filings.
