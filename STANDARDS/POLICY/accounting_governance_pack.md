# Accounting Governance Policy Pack (A-GOV-1)

## Purpose
Define responsibilities, approvals, and controls for the accounting close, reconciliations, journal processing, and financial reporting modules so that IFRS / GAPSME compliance and ISQM 1 quality objectives are achieved.

## Standards anchors
- IAS 1 / IAS 7 / IAS 8 / IAS 10 – financial statements presentation, cash flow, adjustments, subsequent events
- IAS 21 / IFRS 10 / IFRS 11 / IFRS 12 – consolidation and foreign currency
- ISQM 1 – engagement performance, resources, monitoring
- IESBA Code Section 600 – safeguards when providing accounting services to audit clients

## Roles & responsibilities
| Role | Responsibilities |
| --- | --- |
| Preparer (Employee/Senior) | Maintain trial balance, perform reconciliations, draft journals, compile PBC evidence. |
| Reviewer (Manager) | Review reconciliations, variance analyses, journals; ensure completeness; initiate approvals. |
| Approver (Controller/Partner) | Approve journal postings, reconciliations, close milestones, release draft financials. |
| Quality Reviewer | Independent review of high-risk closes prior to lock. |
| System Admin | Configure close calendars, templates, segregation-of-duties rules. |

## Approvals matrix
| Workflow event | Preparer | Reviewer | Approver | Quality Reviewer | System Admin |
| --- | --- | --- | --- | --- | --- |
| Journal batch | Prepare | Review | Approve/Post | Optional for high risk | Maintain segregation rules |
| Reconciliation | Prepare | Review | Approve | Optional | Maintain templates |
| Trial balance snapshot & lock | Initiate | Review | Approve lock | Required on high risk | Configure lock policies |
| Financial statement draft release | Draft | Review pack | Approve issue | Mandatory for listed entities | Manage disclosure templates |

## Control points & evidence
- ActivityLog events `JE_*`, `RECON_*`, `TB_*`, `FS_*`, `CLOSE_*` tagged with policy pack `A-GOV-1`.
- Approval queue kinds `JE_APPROVAL`, `RECON_APPROVAL`, `CLOSE_LOCK_APPROVAL` enforce dual control.
- Plan change log style audit trails on close calendars store reviewer/approver metadata.
- Immutable archive manifest stores final trial balance hash, reconciliation status, FS export ID on close lock.

## Monitoring & escalation
- SLA targets: reviewer turnaround 2 business days; approver turnaround 3 business days post-review.
- Exception categories (ageing >30 days, high risk journals) flagged in telemetry tables for oversight.
- Segregation-of-duties breach attempts generate alerts and escalate to System Admin + Controller.

## Related artefacts
- `STANDARDS/POLICY/close_governance.md`
- `STANDARDS/TRACEABILITY/matrix.md` (accounting sections)
- Phase 4 roadmap modules (reconciliations, consolidations, disclosures)
