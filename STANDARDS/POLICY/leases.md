# Lease Measurement Guide

## Overview
Provides IFRS 16 measurement checks, ROU asset schedules and discount rate governance.

## Payload Requirements
- leases array with code, termMonths, payments
- discountRate basis points
- commencement date

## Approval Matrix
- Real Estate
- Corporate Finance

## API Workflow
- Endpoint: `/api/accounting/leases`
- Request body extends the global context with module payload
- Response returns `status`, `metrics`, `approvals`, `trace` and `nextSteps`

## Supabase & RLS
- Table: `public.accounting_lease_measurements`
- RLS: read requires `public.is_member_of`, write requires `public.has_min_role` with manager privileges
- Trace: `public.accounting_trace_events` referenced via `trace_id`

## Acceptance Coverage
- tests/accounting/test_registry.py::test_module_registry_integrity
- Additional UI validation in `tests/accounting/test_workspace.py`
