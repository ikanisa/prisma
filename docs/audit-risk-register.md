# Audit Risk Register (AP-PLAN-2)

## Tables
- `audit_risks`: One row per identified risk of material misstatement with categorisation, assertions, ratings, and analytics summary.
- `audit_risk_signals`: Stores analytics-driven indicators and metrics feeding risk assessment.
- `audit_risk_activity`: Timeline of reviewer/approver actions, notes, and metadata for each risk.

## Enums
- `audit_risk_category`: Categorises risks (Financial Statement, Fraud, Control, IT, Going Concern, Compliance, Estimate, Other).
- `risk_rating`: Likelihood/impact ratings (Low, Moderate, High, Significant).
- `risk_status`: Tracks lifecycle (Open, Monitored, Closed).

## Usage
- Edge function `supabase/functions/audit-risk/index.ts` (to be added) will orchestrate CRUD, analytics injection, and ActivityLog/telemetry updates.
- UI risk workspace surfaces inherent vs residual ratings, linked analytics signals, and action history.

Refer to `STANDARDS/TRACEABILITY/matrix.md` for mappings to ISA 315 requirements and governance pack `AP-GOV-1`.
