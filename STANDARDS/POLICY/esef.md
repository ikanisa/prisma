# ESEF / iXBRL Exporter Guide

## Overview
Coordinates tagging coverage, validation and regulator-ready export bundles.

## Payload Requirements
- taxonomy code
- documentType (annual report, interim)
- warnings array for outstanding issues

## Approval Matrix
- Tagging Lead
- Regulatory Reporting

## API Workflow
- Endpoint: `/api/accounting/esef`
- Request body extends the global context with module payload
- Response returns `status`, `metrics`, `approvals`, `trace` and `nextSteps`

## Supabase & RLS
- Table: `public.accounting_esef_exports`
- RLS: read requires `public.is_member_of`, write requires `public.has_min_role` with manager privileges
- Trace: `public.accounting_trace_events` referenced via `trace_id`

## Acceptance Coverage
- tests/accounting/test_docs.py::test_guides_cover_modules
- Additional UI validation in `tests/accounting/test_workspace.py`
