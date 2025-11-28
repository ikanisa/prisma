# Cash Flow Builder Guide

## Overview
Builds IAS 7 statements, calculates liquidity metrics and supports scenario overlays.

## Payload Requirements
- method (direct/indirect)
- operatingActivities / investingActivities / financingActivities objects
- net change reconciliation inputs

## Approval Matrix
- Treasury
- Financial Controller

## API Workflow
- Endpoint: `/api/accounting/cashflow`
- Request body extends the global context with module payload
- Response returns `status`, `metrics`, `approvals`, `trace` and `nextSteps`

## Supabase & RLS
- Table: `public.accounting_cash_flow_blueprints`
- RLS: read requires `public.is_member_of`, write requires `public.has_min_role` with manager privileges
- Trace: `public.accounting_trace_events` referenced via `trace_id`

## Acceptance Coverage
- tests/accounting/test_docs.py::test_guides_cover_modules
- Additional UI validation in `tests/accounting/test_workspace.py`
