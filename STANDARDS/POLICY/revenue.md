# Revenue Contracts Guide

## Overview
Implements IFRS 15 five-step model with SSP allocations, contract metadata and release schedules.

## Payload Requirements
- contractCode and customer name
- performanceObligations array with allocation split
- transactionPrice figure for SSP comparisons

## Approval Matrix
- Revenue Operations
- Finance Business Partner

## API Workflow
- Endpoint: `/api/accounting/revenue`
- Request body extends the global context with module payload
- Response returns `status`, `metrics`, `approvals`, `trace` and `nextSteps`

## Supabase & RLS
- Table: `public.accounting_revenue_contracts`
- RLS: read requires `public.is_member_of`, write requires `public.has_min_role` with manager privileges
- Trace: `public.accounting_trace_events` referenced via `trace_id`

## Acceptance Coverage
- tests/accounting/test_registry.py::test_module_registry_integrity
- Additional UI validation in `tests/accounting/test_workspace.py`
