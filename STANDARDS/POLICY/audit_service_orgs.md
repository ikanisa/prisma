# Audit methodology – Service organization oversight (ISA 402)

## Purpose
ISA 402 requires auditors to obtain an understanding of a service organization’s controls and determine the impact on the user entity’s internal control over financial reporting. The SOC 1 workflow in Prisma Glow tracks this understanding through:

- a registry of service organizations engaged by the firm’s clients;
- a log of SOC 1 reports (periods, auditors, testing summaries);
- a structured Complementary User Entity Control (CUEC) checklist with status tracking; and
- residual risk notes that document exceptions, mitigations, and follow-up actions.

All information is stored in Supabase with role-based RLS policies. Activity events are recorded to maintain a defensible audit trail.

## Data model & controls
| Table | Purpose | Key access rules |
| --- | --- | --- |
| `service_orgs` | Registers service providers, scope, and contact details. | Only org members with MANAGER role may create/update entries. |
| `soc1_reports` | Stores SOC 1 period metadata, auditors, and testing coverage. | MANAGER role required to insert/update; employees may read. |
| `soc1_cuecs` | Tracks individual CUECs, frequency, status, and remediation plans. | MANAGER role may create/update; employees may read. |
| `soc1_residual_risk_notes` | Logs residual risk commentary tied to CUECs or the provider overall. | All members may add notes; updates/deletes require MANAGER role. |

Every table is protected by the existing `public.is_member_of` and `public.has_min_role` helpers. Updated-at triggers keep metadata current.

## Workflow
1. **Register the service organization** – `POST /api/soc/service-orgs` records name, industry, scope, and points of contact once the SOC 1 is received.
2. **Upload report metadata** – `POST /api/soc/reports` captures the period, auditor, testing summary, and storage location for the SOC 1 report.
3. **Document CUECs** – `POST /api/soc/cuecs` (create) and `PATCH /api/soc/cuecs` (update) maintain the complementary controls that the user entity must operate. Status options (`not_started`, `in_progress`, `effective`, `deficient`) align with ISA 402 ¶16 evaluation steps.
4. **Log residual risk** – `POST /api/soc/residual-risk` stores exceptions, mitigating actions, and ownership for follow-up testing or management letters.
5. **Monitor via the SOC panel** – `/audit/soc` provides the oversight dashboard with service org metadata, testing coverage, exception queue, and residual risk timeline.

## Evidence and logging
The API records the following Supabase activity events:

- `soc_service_org_registered`
- `soc_report_uploaded`
- `soc_cuec_created`
- `soc_cuec_updated`
- `soc_residual_risk_logged`

These events, combined with the data tables above, provide traceable evidence supporting ISA 402 and ISA 330 follow-up testing.

## Roles & responsibilities
| Role | Responsibilities |
| --- | --- |
| Audit Manager | Registers service orgs, uploads SOC 1 metadata, approves CUEC status changes. |
| Audit Staff | Reviews SOC 1 reports, executes CUEC testing, logs residual risk notes. |
| System Admin | Can review any organization’s records for quality control purposes. |

## References
- ISA 402, paragraphs 9–20 (understanding the service organization and user auditor procedures).
- SOC 1 Type II report requirements (AICPA AT-C 320).
