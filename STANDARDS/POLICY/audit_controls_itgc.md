# IT General Controls – Sampling Integration Policy

## Purpose
Sampling C1 provides deterministic attribute selection for ITGC control tests, ensuring that evidence requests are consistent across environments. This document outlines how test teams must interact with the Sampling C1 client, track sampling status, and document outcomes for traceability.

## Scope
- Control testing executed through the web application under `apps/web/app/audit/controls`.
- API interactions routed through `POST /api/controls/test/run`.
- Sample plan references produced by Sampling C1.

## Policy Requirements
1. **Sampling Invocation** – Every control test run must call the Sampling C1 client before persisting a result. The client is responsible for retrieving the `samplePlanRef`, `samplePlanUrl`, and attribute-level status metadata.
2. **Fixture Predictability** – In demo or local environments the client returns deterministic fixtures derived from the control and test plan identifiers. This enables consistent demos and supports automated testing.
3. **Error Handling** – Service failures must not crash the workflow. The API surface returns HTTP 5xx responses with explanatory error payloads so the UI can signal retry actions.
4. **Persistence** – Returned sampling payloads are stored with the test run (including attribute statuses and sample references). Retries overwrite the stored run while retaining the original identifier for auditing.
5. **Workspace Visibility** – The controls workspace must surface sampling state, including:
   - Aggregate run status (`completed`, `partial`, `failed`).
   - Attribute-level sample coverage and failure messaging.
   - Deep links to the generated `samplePlanUrl` for evidence collection.
   - Retry affordances when sampling encounters errors.
6. **Traceability** – Each persisted run must capture `requestedAt`, `createdAt`, and `updatedAt` timestamps so audit reviewers can reconcile sampling events with downstream evidence uploads.

## Operational Notes
- The Sampling C1 client automatically selects demo fixtures when `NEXT_PUBLIC_APP_ENV` equals `local` or `demo`, or when `NODE_ENV !== 'production'`.
- Live mode requires `SAMPLING_C1_BASE_URL` (configured via environment variables) so that requests can be routed to the remote service endpoint.
- The fixture algorithm ensures at least one deterministic failure path to exercise the retry workflow during testing sessions.
