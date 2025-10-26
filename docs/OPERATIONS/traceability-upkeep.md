# Traceability & Compliance Upkeep – Phase 5

Maintain audit evidence and regulatory documentation post-launch.

## Monthly
- [ ] Update `STANDARDS/TRACEABILITY/matrix.md` with any new controls, analytics, or reporting modules.
- [ ] Archive Phase 4/5 artefacts in `docs/SECURITY/evidence/<yyyy-mm>/` (performance runs, UAT sign-offs, edge review evidence).
- [ ] Review Supabase RLS policies (run `scripts/test_policies.sql` on staging) and record the hash in `docs/SECURITY/evidence/<date>/policy-tests.log`.

## Quarterly
- [ ] Refresh SOC/ISA traceability mapping (TCWG, acceptance, specialists) per `STANDARDS/POLICY/*.md`.
- [ ] Ensure tax policy packs and audit policy guides reflect regulatory updates; capture sign-off in `docs/DECISIONS.md`.

## Audit Prep
- [ ] Confirm the latest `/api/release-controls/check` responses are stored for each release.
- [ ] Validate evidence manifests (reconciliation, ADA runs, TCWG packs) include checksums.

Log completion in the operations runbook and link supporting evidence for compliance reviews.
