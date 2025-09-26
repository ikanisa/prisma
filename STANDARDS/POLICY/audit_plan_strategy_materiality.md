# Audit Plan – Strategy & Materiality (AP-PLAN-1)

## Purpose
Define the overall audit strategy and materiality thresholds in accordance with:
- **ISA 300** (Planning an Audit of Financial Statements)
- **ISA 320** (Materiality in Planning and Performing an Audit)
- **ISA 230** (Audit Documentation)
- **ISA 220 (Revised)** (Quality Management for an Audit of Financial Statements)

## Scope
This policy applies to every assurance engagement created in Aurora. The plan must be complete and approved **before** substantive fieldwork begins. Updates are allowed but must go through change control and logging.

## Required Artifacts
1. **AP‑001 Overall Audit Strategy**: basis framework, scope, reliance decisions, timetable, specialists, EQR requirement.
2. **AP‑002 Materiality Set**: financial statement materiality, performance materiality, clearly trivial threshold, benchmark rationale.
3. **Plan Change Log**: immutable record of submissions, approvals, revisions (ISA 230).
4. **Approval Evidence**: Partner (and EQR if applicable) approval captured in `approval_queue` and `audit_plans.approvals` JSON.

## Workflow Summary
1. **Strategy Capture**
   - Minimum role: Employee.
   - Records `basis_framework` and structured `strategy` JSON.
   - Resets status to `DRAFT` if previously submitted.
   - Logs Activity (`PLAN_CREATED`/`PLAN_STRATEGY_UPDATED`) and change log with reason `STRATEGY_CREATED/UPDATED`.

2. **Materiality Determination**
   - Minimum role: Employee.
   - Validates all thresholds are > 0 (ISA 320.10–12).
   - Stores benchmark metadata and rationale.
   - Logs Activity (`MATERIALITY_SET`) and change log `MATERIALITY_UPDATED`.

3. **Submission for Approval**
   - Minimum role: Manager.
   - Preconditions: strategy + materiality available.
   - Status changes to `READY_FOR_APPROVAL` and creates approval queue record (`AUDIT_PLAN_FREEZE`, stage `PARTNER`).
   - Logs Activity (`PLAN_SUBMITTED`).

4. **Partner/EQR Approval**
   - Partner (and EQR where required) approves or rejects the plan via `/plan/approve`.
   - On approval: status becomes `LOCKED`, `locked_at` stamped, Activity `PLAN_APPROVED` and `PLAN_LOCKED` added.
   - On rejection: plan returns to `DRAFT`, change log reason `APPROVAL_REJECTED` recorded.

## Governance Controls
- **RLS**: only members of the org can view/modify plan data; delete requires System Administrator (rare, migration only).
- **Plan Mutability**: locked plans throw `plan_locked` on any mutation attempts.
- **Traceability**: `plan_change_log` lines include reason + JSON impact referencing ISA paragraph(s) when rendered in the UI.
- **Approvals**: Partner approval enforced via `approval_queue` (ISA 220R); prevents fieldwork kick-off in downstream modules until status `LOCKED`.

## Evidence Expectations
- Strategy summary explains entity, scoping, reliance, specialists, timetable (ISA 300.A8–A21).
- Materiality memo documents benchmark, percentage, qualitative factors (ISA 320.A1–A14).
- Change log demonstrates iterative planning (ISA 300.11) and documentation sufficiency (ISA 230.8–9).
- Approval workflow shows partner sign-off before release to execution teams.

## Telemetry
- Coverage metrics: plan status, time to approval, rework count (`PlanChangeLog` entries after freeze).
- Exceptions: failed submissions due to missing materiality; attempted updates post-lock.
