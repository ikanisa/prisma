# Runbook - Accounting & Tax AI Agent System

Generated: 2026-01-02T17:02:12Z

## Service Inventory
- Web UI: `apps/web` (Next.js)
- Admin UI: `apps/admin` (Next.js)
- Client UI: `apps/client` (Next.js)
- Gateway API: `apps/gateway` (Express)
- Python API: `server/main.py` (FastAPI)
- RAG Service: `services/rag/index.ts` (Express)
- Supabase Edge Functions: `supabase/functions/api`

## Health Checks
- Gateway: `GET /health` on gateway (`apps/gateway/src/index.ts`).
- RAG Service: `GET /health` (implemented in `services/rag` routes, verify on deploy).
- FastAPI: `server/api/health.py` (check routing in `server/main.py`).

## Logging & Observability
- Python API: structlog JSON (`server/main.py`).
- Node services: `services/rag/index.ts` logger.
- Sentry: `SENTRY_DSN` and `SENTRY_RELEASE` env vars.
- OTEL: `OTEL_EXPORTER_OTLP_ENDPOINT` for traces.

## Common Incidents
1. **401/403 across services**
   - Verify Supabase JWT secret and audience.
   - Confirm membership table alignment.
2. **RAG service fails to start**
   - Validate missing modules and env validation in `services/rag/env.ts`.
3. **Rate limit spikes**
   - Check Redis connectivity and limiter configuration.
4. **Data inconsistencies in ledger**
   - Confirm new ledger constraints and batch balancing logic.

## Deployment Checklist (Ops)
- Apply Supabase migrations.
- Verify RLS policies.
- Set secrets via vault/CI only.
- Run `pnpm -r build` and `pytest` in CI.
- Verify health endpoints.

## On-Call Playbook
- Triage severity (P0-P3) based on user impact and data exposure.
- Capture request IDs (FastAPI uses `X-Request-ID`).
- Roll back last deploy if new auth failures appear.

