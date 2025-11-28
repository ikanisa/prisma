# Audit Responses Matrix (AP-PLAN-3)

## Tables
- `audit_responses`: Links risks to planned responses (control reliance, substantive tests, analytics, sampling) with ownership, planned effectiveness, coverage assertions, and status.
- `audit_response_checks`: Reviewer/EQR completeness checks ensuring coverage before execution.

## Enums
- `response_type`: `CONTROL`, `SUBSTANTIVE`, `ANALYTICS`, `SAMPLING`, `OTHER`.
- `response_status`: `PLANNED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`.

## Workflow
- API surface: `/functions/v1/audit-responses` (list), `/response/upsert`, `/response/status`, `/response/check`.
- ActivityLog actions `RESPONSE_*` populate module `AUDIT_RESPONSE` with policy pack `AP-GOV-1`.
- UI path: `/:orgSlug/engagements/:engagementId/planning/responses`.

ISA 330 requires completeness across assertions and alignment with identified risks; completeness checks document reviewer conclusions prior to fieldwork.
