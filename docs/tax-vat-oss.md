# VAT & OSS Returns (T‑2A)

## References
- **Maltese VAT Act (Cap.406)** and Commissioner for Revenue guidance on VAT returns.
- **EU OSS/IOSS rules** for distance sales reporting.

## Inputs captured
- Outputs (standard and reduced rate), intra-community acquisitions, distance sales.
- Inputs eligible for credit (standard/capital goods) and recovery rate.
- Manual adjustments for rounding or prior period corrections.

## Workflow
1. Navigate to `/tax/vat-oss` and select the tax entity + period.
2. Enter figures for supplies/inputs, recovery rate, and adjustments.
3. Call `/functions/v1/tax-mt-nid` with `calculator=VAT` to compute and persist the filing.
4. Return is stored in `vat_filings` with net VAT payable, notes, and evidence for audit trail.
5. History table exposes recent filings with timestamps and net payable amounts for reconciliation.

## Activity & traceability
- ActivityLog action `VAT_RETURN_COMPUTED` records period, tax entity, and net VAT payable.
- Filings include raw payload (JSON) for replication into working papers.

## Testing
- Calculator logic is unit-tested in `tests/tax/calculators.test.ts` (VAT case).
- UI flow validated manually; add Playwright coverage in future hardening phase.
