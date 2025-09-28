# Tax Governance Policy Packs

The multi-workspace deployment introduces staged approval and evidence packs that align with the new Supabase schemas. This
policy defines the control expectations for the core calculators and escalation routes.

## Scope

- Malta corporate income tax, participation/NID, ATAD ILR, and fiscal unity engines.
- EU VAT/OSS/IOSS preparation, DAC6 arrangement scanning, and Pillar Two top-up monitoring.
- International treaty resolver, MAP/APA triage, and US GILTI overlays.
- Autonomy telemetry events and policy pack approvals stored in Supabase (`autonomy_policy_packs`, `autonomy_telemetry_events`).

## Roles & Responsibilities

| Role | Responsibilities |
| --- | --- |
| Head of Tax | Approves Malta CIT runs above the automated threshold, signs off on refunds and DAC6 escalations. |
| Group Tax Director | Reviews Pillar Two exposures, OSS/IOSS filings, and cross-border arrangements flagged for refusal. |
| Regional Tax Manager | Owns treaty resolver submissions and ensures APA/MAP packages include the exported evidence bundle. |
| Compliance Operations | Monitors telemetry anomalies and verifies that policy pack status transitions follow this checklist. |

## Control Activities

1. **Deterministic calculators** – Each API route returns decision, reasons, next steps, and telemetry data. These outputs must
   be archived via the "Export evidence JSON" action in the workspace UI before close.
2. **Approval routing** – Refused or review decisions require manual sign-off. Evidence of approval is recorded by inserting the
   activity payload into `autonomy_policy_packs` with `decision` set to `REVIEW` or `REFUSED` and linking to the exported JSON.
3. **Segregation of duties** – Preparers (employees) may insert computation rows; only managers can update or delete rows per the
   Supabase RLS policies embedded in `supabase/sql/*.sql`.
4. **Telemetry monitoring** – Each calculator emits metrics to `autonomy_telemetry_events`. Compliance operations run weekly
   checks to verify that no module exceeds the tolerated variance (±5% relative to prior period benchmarks).

## Escalation Matrix

| Decision | Escalation Path | Required Evidence |
| --- | --- | --- |
| Approved | Automation release | Exported JSON bundle + Supabase record ID |
| Review | Head of Tax or Group Director | Calculator evidence, manual commentary, DAC6/treaty attachments |
| Refused | Group Tax Director + Compliance Ops | Evidence bundle, root-cause analysis, remediation plan |

## Review Cadence

- Quarterly walkthrough of the policy pack with Legal and Compliance.
- Monthly sampling of five calculator runs per module, confirmed against telemetry and Supabase records.
- Annual tabletop exercise for MAP/APA workflows and GILTI overrides.
