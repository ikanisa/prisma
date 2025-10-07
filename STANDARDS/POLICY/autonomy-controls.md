# Autonomy Controls for Tax Telemetry

The autonomy control layer ensures that calculator telemetry, refusal gates, and policy pack approvals remain tamper evident
across Malta, EU, and international workspaces.

## Telemetry Requirements

- Every API computation persists an activity snapshot (module, scenario, decision, metrics). UI exports must include the
  `activity.id` so the event can be reconciled against `autonomy_telemetry_events`.
- Telemetry payloads are immutable; managers update remediation status via separate `autonomy_policy_packs` entries. Updates to
  telemetry records are restricted by RLS to managers (`public.has_min_role(org_id, 'MANAGER')`).
- Weekly telemetry digest: Compliance Ops reviews aggregated metrics (aggregate top-up, total flagged arrangements, VAT refund
  counts) and documents findings in the evidence locker referenced by the policy pack.

## Approval Packs

1. **Creation** – When a refusal or review occurs, the preparer captures the exported evidence JSON and uploads it to the policy
   pack referencing the same scenario key.
2. **Review** – Approvers validate the Supabase calculation row, review telemetry, and sign off by updating the policy pack
   status (`IN_REVIEW` → `APPROVED` or `REJECTED`). Comments must record the reason code.
3. **Audit Trail** – Telemetry IDs, policy pack IDs, and exported filenames must match to close the audit item.

## Alerts & Thresholds

| Module | Automated Alert | Threshold |
| --- | --- | --- |
| Malta CIT | Trigger review | Tax due > 500k or taxable income ≤ 0 |
| VAT/OSS | Require manager approval | Net VAT < 0 or scheme ≠ domestic |
| DAC6 | Immediate refusal | More than two flagged arrangements |
| Pillar Two | Refuse | Aggregate top-up ≥ 500k |
| US GILTI | Review | GILTI tax > 250k |

## Sampling Guidance

- **Quarterly**: Sample one scenario from each workspace ensuring evidence bundle, telemetry record, and policy pack row match.
- **Ad-hoc**: When telemetry shows sudden spikes (≥25% variance), escalate to Group Tax Director for mitigation.
- **Continuous**: Run the automated Python tests under `tests/tax/` before promoting policy pack changes to production.
