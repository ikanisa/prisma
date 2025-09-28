# Basis Switcher (GAPSME) Guide

## Overview
Maps IFRS ledgers to GAPSME disclosures with adjustment traceability.

## Payload Requirements
- sourceFramework and targetFramework identifiers
- adjustments array with impact commentary
- effectiveDate for switch

## Approval Matrix
- Local GAAP SME
- Statutory Owner

## API Workflow
- Endpoint: `/api/accounting/gapsme`
- Request body extends the global context with module payload
- Response returns `status`, `metrics`, `approvals`, `trace` and `nextSteps`

## Supabase & RLS
- Table: `public.accounting_basis_switches`
- RLS: read requires `public.is_member_of`, write requires `public.has_min_role` with manager privileges
- Trace: `public.accounting_trace_events` referenced via `trace_id`

## Acceptance Coverage
- tests/accounting/test_docs.py::test_guides_cover_modules
- Additional UI validation in `tests/accounting/test_workspace.py`
