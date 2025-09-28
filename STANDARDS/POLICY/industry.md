# Industry Toggle Guide

## Overview
Activates industry-specific policy overlays and KPI tracking across the workspace.

## Payload Requirements
- industries array
- toggles array with name/enabled flag
- optional notes for risk commentary

## Approval Matrix
- Engagement Lead
- Risk

## API Workflow
- Endpoint: `/api/accounting/industry`
- Request body extends the global context with module payload
- Response returns `status`, `metrics`, `approvals`, `trace` and `nextSteps`

## Supabase & RLS
- Table: `public.accounting_industry_toggles`
- RLS: read requires `public.is_member_of`, write requires `public.has_min_role` with manager privileges
- Trace: `public.accounting_trace_events` referenced via `trace_id`

## Acceptance Coverage
- tests/accounting/test_sql_schema.py::test_schema_tables_present
- Additional UI validation in `tests/accounting/test_workspace.py`
