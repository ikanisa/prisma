# Activity Event Catalog (GOV-CORE)

The `public.activity_event_catalog` table normalises ActivityLog actions with governance metadata.

| Column | Description |
| --- | --- |
| `action` | Stable action identifier used by edge functions. |
| `description` | Human readable description for reporting. |
| `module` | Functional area (`AUDIT_PLAN`, `TAX_MALTA_CIT`, `ACCOUNTING_CLOSE`, etc.). |
| `policy_pack` | Linked governance policy pack code (`AP-GOV-1`, `T-GOV-1`, `A-GOV-1`). |
| `standard_refs` | Array of standards/clauses providing the regulatory anchor. |
| `severity` | Suggested log severity for telemetry dashboards. |

A trigger (`app.activity_log_enrich`) ensures ActivityLog rows automatically inherit module, policy pack, and standard references when an action has a catalog entry. Additional actions can be appended with an `INSERT ... ON CONFLICT` migration or using Supabase SQL once approved by governance owners.

## Default actions
- `PLAN_*` – audit strategy/materiality lifecycle (ISA 300/320).
- `RISK_*` – risk register lifecycle and analytics signals (ISA 315R).
- `RESPONSE_*` – planned responses to risks and completeness checks (ISA 330).
- `FRAUD_PLAN_*` – fraud planning approvals, JE strategy checkpoints (ISA 240).
- `MT_CIT_*` – Malta CIT computations and approvals (Malta ITA).
- `PILLAR_TWO_COMPUTED` – OECD Pillar Two QDMTT/IIR calculation logged with GIR snapshot.
- `TREATY_WHT_COMPUTED` – Treaty withholding calculation stored with domestic vs treaty rates.
- `TAX_DISPUTE_EVENT_LOGGED` – MAP/APA timeline event added to a dispute case.
- `US_GILTI_COMPUTED`, `US_163J_COMPUTED`, `US_CAMT_COMPUTED`, `US_4501_COMPUTED` – US overlay computations persisted with adjustment metadata.
- `ARCHIVE_MANIFEST_UPDATED` – Engagement archive manifest regenerated and checksum refreshed.
- `JE_*`, `RECON_*`, `CLOSE_*` – accounting close workflows (IAS 1/7/10).
- `GRP_*` – group component oversight and review tracking (ISA 600).
- `SOC_*` – service organisation reliance, SOC report metadata, and CUEC exceptions (ISA 402).
- `EXP_*` – specialist/internal audit assessments and reliance conclusions (ISA 620 / ISA 610).
- `OI_*` – other information intake, flagging, and resolution (ISA 720).

Refer to `STANDARDS/POLICY/approvals_matrix.md` for the approval routing associated with each module.
