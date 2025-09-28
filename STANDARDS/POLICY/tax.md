# Income Tax Pack Guide

## Overview
Automates IAS 12 current and deferred tax computations with jurisdiction drill-down.

## Payload Requirements
- jurisdictions array containing taxableProfit/currentTax
- deferredAdjustments figure
- reportingPeriod string

## Approval Matrix
- Local Controller
- Group Tax

## API Workflow
- Endpoint: `/api/accounting/tax`
- Request body extends the global context with module payload
- Response returns `status`, `metrics`, `approvals`, `trace` and `nextSteps`

## Supabase & RLS
- Table: `public.accounting_tax_packs`
- RLS: read requires `public.is_member_of`, write requires `public.has_min_role` with manager privileges
- Trace: `public.accounting_trace_events` referenced via `trace_id`

## Acceptance Coverage
- tests/accounting/test_docs.py::test_guides_cover_modules
- Additional UI validation in `tests/accounting/test_workspace.py`
