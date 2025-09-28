# Fraud Plan & JE Strategy (AP-PLAN-4)

## Tables
- `fraud_plans`: Engagement-level record of fraud brainstorming notes, inherent fraud risks, planned responses, analytics strategy, and override assessment (ISA 240).
- `fraud_plan_actions`: Timeline of actions/approvals/communications linked to the fraud plan.
- `journal_entry_strategies`: Detailed journal-entry testing strategy capturing scope, filters, thresholds, and scheduling.

## Status & Governance
- `fraud_plan_status`: `DRAFT`, `READY_FOR_APPROVAL`, `LOCKED` (partner lock before fieldwork).
- ActivityLog actions (implemented via edge function) will prefix `FRAUD_PLAN_*` and tag policy pack `AP-GOV-1`.
- JE strategy ownership indicates preparer/reviewer and links to analytics runs.

## API
Edge function `audit-fraud` (to be added) will support:
- `GET /fraud-plan` – fetch plan, actions, JE strategy.
- `POST /fraud-plan/upsert` – save brainstorming notes, risks, responses.
- `POST /fraud-plan/submit` & `/fraud-plan/decide` – approvals.
- `POST /je-strategy/upsert` – configure JE extraction and analytics linkage.

Complements the risk register and responses matrix to evidence fraud response planning.
