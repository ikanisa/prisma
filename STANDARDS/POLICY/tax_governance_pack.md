# Tax Governance Policy Pack (T-GOV-1)

## Purpose
Provide an approvals and control framework for Malta and international tax workflows embedded in Aurora so that obligations under the Malta Income Tax Act, EU directives, and IESBA independence rules are satisfied before filings or opinions are released.

## Standards anchors
- Malta Income Tax Act (Cap.123) – computation, refund, and filing requirements
- Commissioner for Revenue guidelines – participation exemption, refund claims, fiscal unity
- EU Anti-Tax Avoidance Directives (ATAD I & II) – CFC, ILR, hybrid mismatch controls
- ISQM 1 – engagement performance and monitoring for tax services
- IESBA Code Section 600 – Provision of Non-Assurance Services to Audit Clients

## Roles & responsibilities
| Role | Responsibilities |
| --- | --- |
| Employee / Tax Senior | Prepare computations, supporting schedules, draft disclosures, document refund analysis. |
| Manager | Review computations, challenge adjustments, ensure supporting evidence, initiate approval routing. |
| Partner | Approve tax positions, refunds, disclosures, ensure independence safeguards, liaise with stakeholders. |
| Tax Technical Reviewer | Provide secondary review on complex matters (ATAD, CFC, Pillar Two). |
| System Admin | Maintain tax policy catalog, refund parameters, workflow toggles. |

## Approvals matrix
| Workflow event | Employee | Manager | Partner | Technical Reviewer | System Admin |
| --- | --- | --- | --- | --- | --- |
| Malta CIT computation | Prepare | Review | Approve | Optional | Maintain rates & profiles |
| Refund claim pack | Draft | Review | Approve | Review (mandatory for >€250k) | Configure thresholds |
| Participation exemption memo | Draft | Review | Approve | Mandatory | Track policy version |
| ATAD ILR / CFC review | Draft | Review | Approve | Mandatory | Maintain scenario templates |
| Fiscal unity consolidation | Draft | Review | Approve | Mandatory | Maintain configuration |

## Control points & evidence
- ActivityLog events prefixed `MT_CIT_`, `ATAD_`, `CFC_`, `REFUND_`, `TAX_MEMO_` tagged with policy pack `T-GOV-1`.
- Approval queue kinds `MT_CIT_APPROVAL`, `TAX_POLICY_APPROVAL` enforce partner sign-off and optional technical reviewer acknowledgement.
- Return files stored in `return_files` with checksum and payload metadata linking to export artefacts.
- Telemetry thresholds: refund SLA (partner decision) 5 days, technical reviewer sign-off 3 days.

## Monitoring & escalation
- Automated alerts raised when SLA breached; escalated to partner and System Admin.
- Independence breaches flagged to Audit leadership; flagged events logged under `quality_incidents` with linkage to related audit engagement.
- Quarterly sample of high-risk tax engagements reviewed by Tax Technical Reviewer for quality findings tracked in telemetry tables.

## Related artefacts
- `STANDARDS/POLICY/tax_mt_cit_imputation.md`
- `STANDARDS/POLICY/report_decision_tree.md`
- Future modules: NID, Patent Box, ATAD ILR/CFC, Fiscal Unity (Phase 2 roadmap)
