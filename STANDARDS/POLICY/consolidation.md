# Group Consolidation Guide

## Overview
Controls consolidation runs, intercompany eliminations, minority allocations and CFO approvals.

## Payload Requirements
- period (e.g. 2024-Q4)
- entities array including parent/subsidiaries
- eliminations and adjustments counts

## Approval Matrix
- Controller
- CFO

## API Workflow
- Endpoint: `/api/accounting/consolidation`
- Request body extends the global context with module payload
- Response returns `status`, `metrics`, `approvals`, `trace` and `nextSteps`

## Supabase & RLS
- Table: `public.accounting_consolidation_runs`
- RLS: read requires `public.is_member_of`, write requires `public.has_min_role` with manager privileges
- Trace: `public.accounting_trace_events` referenced via `trace_id`

## Acceptance Coverage
- tests/accounting/test_registry.py::test_module_registry_integrity
- Additional UI validation in `tests/accounting/test_workspace.py`
