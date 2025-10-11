# Approvals Matrix Overview (GOV-CORE)

This matrix summarises mandatory reviewers/approvers across audit, tax, and accounting pillars. Detailed controls live in each policy pack (`A-GOV-1`, `AP-GOV-1`, `T-GOV-1`).

| Module | Workflow | Preparer | Reviewer | Approver | Secondary Reviewer | Archive Owner | Standards |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Audit planning | Strategy & materiality | Employee | Manager | Partner | EQR (High risk) | System Admin | ISA 220R, ISA 300/320 |
| Agent operations | Sensitive agent tool execution (`AGENT_ACTION`) | Employee (agent) | Manager | Manager | System Admin (escalation) | ISA 220R, ISQM 1 §§32-33; [AGT-GOV-1](./agent_hitl.md) |
| Audit risk register | Risk identification & rating | Employee | Manager | Partner | EQR (High risk) | System Admin | ISA 315R, ISA 330 |
| Audit responses | Controls, analytics, fraud | Employee | Manager | Partner | EQR (High risk) | System Admin | ISA 240/330/530 |
| TCWG communications | Issuance | Employee | Manager | Partner | EQR (Listed) | System Admin | ISA 260, ISA 230 |
| Malta CIT | Computation & filing | Employee | Manager | Partner | Tax Tech Reviewer (complex) | System Admin | Malta ITA, IESBA 600 |
| Refund claims | Refund pack | Employee | Manager | Partner | Tax Tech Reviewer (>€250k) | System Admin | Malta ITA, CFR refund guidance |
| ATAD ILR/CFC | Review memo | Employee | Manager | Partner | Tax Tech Reviewer | System Admin | ATAD I/II |
| Treaty WHT & MAP tracker | Computation / case management | Employee | Manager | Partner | Tax Tech Reviewer (cross-border) | System Admin | OECD Model Convention, MAP Manual |
| US tax overlays | Overlay computation | Employee | Manager | Partner | Tax Tech Reviewer (complex) | System Admin | IRC §§951A, 163(j), 55, 4501 |
| Accounting close | Journal batches | Preparer | Reviewer | Approver | Quality Reviewer (High risk) | System Admin | IAS 1/8, ISQM 1 |
| Accounting close | Reconciliations | Preparer | Reviewer | Approver | Quality Reviewer (High risk) | System Admin | IAS 7, IAS 21 |
| Close lock | Period closure | Preparer | Reviewer | Approver | Quality Reviewer (Listed) | System Admin | IAS 10, ISQM 1 |

> Agent HITL tooling routes through Next.js proxies (`/api/agent/approvals`, `/api/agent/tool-registry`,
> `/api/agent/approvals/:id/decision`) which enforce the same reviewer matrix before delegating to the
> core `/v1/approvals` service.

Use the policy pack codes when logging ActivityLog events or configuring approval routing to ensure telemetry alignment.
