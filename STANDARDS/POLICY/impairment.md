# Impairment Testing Guide

## Overview
Supports IAS 36 cash generating unit headroom monitoring and scenario analysis.

## Payload Requirements
- cgu identifier
- carryingAmount versus recoverableAmount
- growthRate assumptions

## Approval Matrix
- FP&A
- Valuations

## API Workflow
- Endpoint: `/api/accounting/impairment`
- Request body extends the global context with module payload
- Response returns `status`, `metrics`, `approvals`, `trace` and `nextSteps`

## Supabase & RLS
- Table: `public.accounting_impairment_tests`
- RLS: read requires `public.is_member_of`, write requires `public.has_min_role` with manager privileges
- Trace: `public.accounting_trace_events` referenced via `trace_id`

## Acceptance Coverage
- tests/accounting/test_sql_schema.py::test_schema_tables_present
- Additional UI validation in `tests/accounting/test_workspace.py`
