# Audit Controls & ITGC Governance (CTRL-1)

## Purpose
Establish a consistent methodology for documenting the design and implementation of key controls, planning attribute testing, and routing identified deficiencies to Those Charged With Governance (TCWG) in line with ISA 315, ISA 330, and ISA 265.

## Scope
- Entity-level and process-level controls relied upon for the revenue cycle (extendable to other cycles).
- IT general controls supporting in-scope financial applications.
- Deficiency evaluation and escalation procedures.

## Responsibilities
- **Engagement Manager:** approves control register updates, walkthrough conclusions, and testing strategies.
- **Control Owner:** maintains descriptions, owners, and frequency metadata in the register.
- **Audit Senior:** executes walkthroughs and testing, documenting results and proposed remediation.
- **Partner / TCWG liaison:** reviews all raised deficiencies before inclusion in TCWG communications.

## Workflow
1. **Register / Update Controls** – Every key control is recorded with cycle, objective, frequency, and key designation. Changes require Manager approval.
2. **Design & Implementation Walkthroughs** – For each control, perform a walkthrough at least annually, capturing design and implementation observations plus supporting artefacts.
3. **Attribute Testing** – Request a Sampling C1 plan (minimum 25 items for key controls) which is stored with population references before executing testing. If the service is unavailable, fall back to the deterministic fixture plan. Exceptions automatically prompt deficiency evaluation and TCWG notification.
4. **ITGC Alignment** – Link process controls to supporting IT general controls (Access, Change, Operations) to evidence end-to-end coverage.
5. **Deficiency Handling** – Severity is assessed (Low/Medium/High). Open items flow to remediation tracking and TCWG packs with owner and due date.

## Evidence & Traceability
- **Controls table (`public.controls`)** retains control metadata and version timestamps.
- **Walkthroughs (`public.control_walkthroughs`)** store design/implementation notes, responsible staff, and dates.
- **Testing (`public.control_tests`)** stores parameters, sample items, and results.
- **Deficiencies (`public.deficiencies`)** capture severity, recommendations, and status progression.
- **Activity log** entries record control creation, walkthroughs, test runs, and raised deficiencies for audit trail.

## Approvals & Alerts
- Manager sign-off required before altering key control attributes.
- Exceptions in attribute testing must include a remediation recommendation before completion.
- High severity deficiencies trigger immediate TCWG notification via governance pack view.

## References
- ISA 315 (Revised 2019) – Identifying and Assessing the Risks of Material Misstatement.
- ISA 330 – The Auditor’s Responses to Assessed Risks.
- ISA 265 – Communicating Deficiencies in Internal Control to Those Charged With Governance.
