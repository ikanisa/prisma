# Governance Telemetry Guide

## Overview
Streams control room signals, SLA tracking and severity based escalations.

## Payload Requirements
- module reference for the originating process
- severity (info/warning/high)
- signals array with acknowledgement metadata

## Approval Matrix
- Control Room

## API Workflow
- Endpoint: `/api/accounting/telemetry`
- Request body extends the global context with module payload
- Response returns `status`, `metrics`, `approvals`, `trace` and `nextSteps`

## Supabase & RLS
- Table: `public.accounting_governance_telemetry`
- RLS: read requires `public.is_member_of`, write requires `public.has_min_role` with manager privileges
- Trace: `public.accounting_trace_events` referenced via `trace_id`

## Acceptance Coverage
- tests/accounting/test_sql_schema.py::test_schema_tables_present
- Additional UI validation in `tests/accounting/test_workspace.py`
