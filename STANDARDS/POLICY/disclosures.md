# Disclosure Composer Guide

## Overview
Manages note drafting, commentary capture and linkage to supporting schedules.

## Payload Requirements
- note reference
- highlights array summarising key movements
- reviewers list for routing

## Approval Matrix
- Note Owner
- Technical Accounting

## API Workflow
- Endpoint: `/api/accounting/disclosures`
- Request body extends the global context with module payload
- Response returns `status`, `metrics`, `approvals`, `trace` and `nextSteps`

## Supabase & RLS
- Table: `public.accounting_disclosure_composer`
- RLS: read requires `public.is_member_of`, write requires `public.has_min_role` with manager privileges
- Trace: `public.accounting_trace_events` referenced via `trace_id`

## Acceptance Coverage
- tests/accounting/test_docs.py::test_guides_cover_modules
- Additional UI validation in `tests/accounting/test_workspace.py`
