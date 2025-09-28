# Specialised Pack Guide

## Overview
Delivers industry packs, questionnaires and SME metrics.

## Payload Requirements
- industry label
- metrics array
- questionnaire prompts

## Approval Matrix
- Industry SME
- Engagement Lead

## API Workflow
- Endpoint: `/api/accounting/specialised`
- Request body extends the global context with module payload
- Response returns `status`, `metrics`, `approvals`, `trace` and `nextSteps`

## Supabase & RLS
- Table: `public.accounting_specialised_packs`
- RLS: read requires `public.is_member_of`, write requires `public.has_min_role` with manager privileges
- Trace: `public.accounting_trace_events` referenced via `trace_id`

## Acceptance Coverage
- tests/accounting/test_sql_schema.py::test_schema_tables_present
- Additional UI validation in `tests/accounting/test_workspace.py`
