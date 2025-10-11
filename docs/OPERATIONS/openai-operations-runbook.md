# OpenAI Operations Runbook

This runbook explains how to enable, monitor, and validate OpenAI workloads
across prisma-glow-15 services. Follow these steps when promoting new
environments or investigating production issues.

## 1. Enable Shared Instrumentation
- Ensure the service uses the shared helpers:
  - `lib/openai/client.ts` for SDK-based calls.
  - `lib/openai/url.ts` (via `buildOpenAiUrl()`) for REST fetch calls to avoid
    duplicate `/v1` path segments.
- Confirm environment variables:
  - `OPENAI_API_KEY` (`<environment>` scoped).
  - `OPENAI_BASE_URL` (optional override; the helper strips trailing `/v1`).
  - `OPENAI_ORG_ID` (for multi-org dashboards and quota partitioning).

## 2. Observability & Tagging
- Toggle debug logging (`OPENAI_DEBUG_LOGGING=true`) to persist records in the
  Supabase table `openai_debug_events`.
- Enable payload enrichment (`OPENAI_DEBUG_FETCH_DETAILS=true`) to call
  `/v1/requests/{id}/debug` and capture status codes plus refusal metadata.
- Configure tagging to align Datadog/Splunk dashboards with OpenAI usage:
  - `OPENAI_REQUEST_TAGS=service:rag,env:<env>,workload:<domain>` (comma-separated).
  - `OPENAI_REQUEST_QUOTA_TAG=<billing-tag>` (optional; stored alongside the
    debug event for finance and quota routing).
- Finance workloads can override these defaults via
  `OPENAI_REQUEST_TAGS_FINANCE_*` / `OPENAI_REQUEST_QUOTA_TAG_FINANCE_*`; the
  helper `lib/openai/workloads.ts` keeps service code synchronized with the
  selected workload.
- Tags are automatically merged with contextual information (endpoint, model,
  org) and stored as `metadata.tags` on each debug event.
- ChatKit speech loops write transcripts to `chatkit_session_transcripts`; verify
  S2T/TTS metadata (voice, duration, language) is present when debugging audio
  issues.

## 3. Dashboards & Alerts
- Grafana/Splunk: query `openai_debug_events` filtering on `metadata.tags`.
  - Suggested panels: requests by endpoint/model, status distribution,
    finance-specific quota tag breakdown.
- Datadog monitors should include tag filters that mirror `OPENAI_REQUEST_TAGS`
  (e.g., `service:rag`).
- Verify the existing PagerDuty circuit (`audit-platform`) receives alerts when
  OpenAI request errors exceed defined thresholds.

## 4. Validation Checklist
1. Trigger a test request (embedding, response, realtime, or video) using the
   relevant service endpoint.
2. Confirm the event appears in `openai_debug_events` with the expected tags and
   quota tag:
   ```sql
   select request_id, endpoint, metadata->'tags', metadata->>'quota_tag'
   from openai_debug_events
   order by created_at desc
   limit 5;
   ```
3. Check the Datadog/Splunk dashboard for the updated tag dimensions.
4. If `OPENAI_DEBUG_FETCH_DETAILS=true`, ensure the debug payload includes
   `response.status_code`; otherwise review the service logs for
   `openai.debug_fetch_failed`.

## 5. Incident Response
- On failures, locate the relevant request ID via logs or telemetry,
  cross-reference `openai_debug_events`, and export the debug payload for
  support.
- Include the `metadata.tags` snapshot and quota tag in incident timelines so
  finance impact can be assessed quickly.
- See `docs/incident-response.md` for escalation paths and post-mortem steps.

## 6. Maintenance
- Quarterly: audit the tag catalogue to ensure it matches the finance billing
  structure and Datadog dashboards.
- After rotating OpenAI keys or onboarding a new organisation, verify
  `OPENAI_ORG_ID` and quota tags are updated in the deployment pipeline.
- Keep this runbook in sync with `docs/openai-phase0.md` and downstream phase
  documents as the integration matures.
- Nightly agent evaluations (`npm run agents:evaluate`) publish
  `dist/agent_evaluations_report.json` and
  `dist/agent_evaluations_metrics.ndjson`; upload them to dashboards or Supabase
  for compliance review.
