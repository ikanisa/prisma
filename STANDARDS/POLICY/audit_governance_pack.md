# Audit Governance Policy Pack (AP-GOV-1)

## Purpose
Define firmwide governance guardrails for audit planning, execution, and reporting streams so that ISA 220 (Revised) leadership responsibilities, ISQM 1 quality objectives, and IESBA Code independence safeguards are consistently enforced within the Aurora platform.

## Standards anchors
- ISA 220 (Revised) – paras. 12-39 (leadership and direction of engagements)
- ISA 300 / 315 (Revised) / 330 – planning, risk assessment, responses
- ISA 240 / 402 / 600 / 570 / 560 / 530 – specialised modules triggered across the suite
- ISA 260 / 230 – communications with TCWG and audit documentation
- ISQM 1 – quality objectives for engagement performance, resources, and monitoring
- IESBA Code of Ethics – independence, conflicts, and rotation (Sections 400-540)

## Roles & responsibilities
| Role | Responsibilities |
| --- | --- |
| Employee / Senior | Prepare strategy inputs, risk assessments, walkthroughs, analytics; document evidence and propose conclusions. |
| Manager | Review preparer work, ensure completeness, supervise testing, initiate submissions for approval, maintain action plans. |
| Partner | Own overall audit opinion, approve plans and opinions, resolve significant matters, liaise with TCWG. |
| Engagement Quality Reviewer (EQR) | Perform independent quality review on high-risk engagements pre-report issuance. |
| System Admin | Maintain policy templates, approval routing, and archive configuration. |

## Approvals matrix
| Workflow event | Employee | Manager | Partner | EQR | System Admin |
| --- | --- | --- | --- | --- | --- |
| Audit plan strategy & materiality draft | Prepare | Review | Approve | Optional review on high risk | Ensure workflow templates active |
| Risk register & responses | Draft | Approve mitigations | Resolve critical / sign-off | Mandatory review high risk | Configure severity thresholds |
| Fraud, JE strategy, going concern bundles | Draft | Review | Approve & lock | Review (default) | Maintain override controls |
| TCWG communications & archive | Draft | Review & queue | Approve issuance | Review (if mandated) | Manage immutable archive links |

## Control points & evidence
- ActivityLog actions prefixed `PLAN_`, `RISK_`, `RESP_`, `FRAUD_`, `TCWG_` recorded with policy pack code `AP-GOV-1`.
- Approval queue kinds `AUDIT_PLAN_FREEZE`, `AUDIT_RISK_LOCK`, `AUDIT_REPORT_RELEASE` enforce dual-control with Partner/EQR sign-off.
- Change logs persist preparer/ reviewer/ approver metadata with timestamp and standard references.
- Immutable archive manifest stores export hashes alongside TCWG bundle version IDs.

## Monitoring & escalation
- Quality reviewers sample 20% of engagements flagged `High` risk category each quarter.
- Exceptions (controls failed, fraud indicators) trigger SLA requirement: manager review within 2 business days; partner resolution within 5 business days.
- Independence or scope concerns escalate to System Admin + AQMM with documented resolution in `quality_incidents` telemetry.

## Related artefacts
- `STANDARDS/POLICY/audit_plan_strategy_materiality.md`
- `STANDARDS/POLICY/audit_controls_itgc.md`
- `STANDARDS/POLICY/isa701_kam_policy.md`
- `STANDARDS/POLICY/tcwg_communications.md`
- `STANDARDS/TRACEABILITY/matrix.md` (audit sections)
