# Financial Instruments & ECL Guide

## Overview
Calculates staging, probability of default, loss given default and expected losses for IFRS 9.

## Payload Requirements
- portfolio name
- exposureAtDefault amount
- probabilityOfDefault and lossGivenDefault ratios

## Approval Matrix
- Risk
- Treasury

## API Workflow
- Endpoint: `/api/accounting/ecl`
- Request body extends the global context with module payload
- Response returns `status`, `metrics`, `approvals`, `trace` and `nextSteps`

## Supabase & RLS
- Table: `public.accounting_ecl_runs`
- RLS: read requires `public.is_member_of`, write requires `public.has_min_role` with manager privileges
- Trace: `public.accounting_trace_events` referenced via `trace_id`

## Acceptance Coverage
- tests/accounting/test_sql_schema.py::test_schema_tables_present
- Additional UI validation in `tests/accounting/test_workspace.py`
