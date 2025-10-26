# Environment Secret Backfill Plan

This checklist summarizes the remaining work for each owning team to ensure production, preview, and local environments have all required secrets configured. Status should be updated as exports from the deployment managers become available.

## Gateway Team
- [ ] Import the latest hosting platform environment export and confirm `API_BASE_URL`, `REDIS_URL`, `AGENT_SERVICE_API_KEY`, `RAG_SERVICE_API_KEY`, and Sentry keys are present.
- [ ] Populate `FASTAPI_BASE_URL` and `GATEWAY_API_KEYS` in Vault for production and staging.
- [ ] Review rate limit webhook destinations and update `RATE_LIMIT_ALERT_WEBHOOK` / `ERROR_NOTIFY_WEBHOOK` if ownership changed.

## Web Application Team
- [ ] Ensure Supabase dashboard secrets include `AUTH_CLIENT_ID`, `AUTH_CLIENT_SECRET`, and `AUTH_ISSUER` values aligned with the IdP configuration.
- [ ] Confirm the automation hooks (`AUTOMATION_WEBHOOK_SECRET`, `N8N_WEBHOOK_SECRET`) are stored in hosting platform for preview & production.
- [ ] Verify public NEXT_PUBLIC keys are consistent between hosting platform preview and production deployments.

## RAG Service Team
- [ ] Upload `SUPABASE_JWT_SECRET`, `SUPABASE_JWT_AUDIENCE`, and `OPENAI_API_KEY` into Vault for the RAG service namespace.
- [ ] Schedule rotation of embedding webhooks and document the destination URLs referenced by `TELEMETRY_ALERT_WEBHOOK` and `EMBEDDING_ALERT_WEBHOOK`.
- [ ] Confirm embedding delta limits (`EMBEDDING_DELTA_*`) match current ingestion throughput targets.

## Platform / DevOps Team
- [ ] Run the export commands listed in `docs/env-gap-analysis.md` for hosting platform, Supabase, and Vault; attach normalized inventories to this repository.
- [ ] Automate nightly validation comparing live secret inventories against `.env.example` to catch regressions early.
- [ ] Coordinate with security to manage Vault token scopes required for local development.
