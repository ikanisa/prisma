# OpenAI Finance Workload Scaffolding

## Objectives
- Separate finance workloads (audit/tax/close autonomy agents) from general experimentation keys to enforce billing, compliance, and data residency controls.
- Standardise tagging, quota management, and alerting across services consuming the shared OpenAI client.
- Provide runbook guidance for onboarding new orgs or rotating credentials without impacting non-finance environments.

## Project & Account Structure
| Layer | Purpose | Configuration |
| --- | --- | --- |
| OpenAI Enterprise Org | Master tenant housing all prisma-glow projects. | Finance admins only; SSO enforced. |
| Project: `Finance-Autonomy-Prod` | Production finance workloads (agents, embeddings, realtime). | Dedicated API keys, budgets, usage alerts, audit logging. |
| Project: `Finance-Autonomy-Staging` | Staging mirror for agent/e2e testing. | Separate budgets, lower RPM, sandbox data only. |
| Project: `Finance-DocAI` | OCR/Vision experiments feeding onboarding pipelines. | Key scoped to doc ingestion services. |

### API Keys & Secrets
- Generate project-specific keys from the OpenAI console; label by environment (`FIN_AUTONOMY_PROD`, `FIN_AUTONOMY_STAGING`).
- Store secrets in Vault / `OPENAI_API_KEY_FINANCE_*` entries; inject via deployment manifests per environment.
- Mirror organisation/user agent overrides with dedicated variables:
  - `OPENAI_ORG_ID_FINANCE_PROD` / `_STAGING`
  - `OPENAI_USER_AGENT_TAG_FINANCE`
  - `OPENAI_FINANCE_WORKLOAD` (optional override, otherwise inferred from `NODE_ENV`).
- Rotate quarterly; follow `docs/SECURITY/KEY_ROTATION.md` with finance-specific checklist additions (notify compliance, update budgets).

### Tagging & Metadata
- Set `OPENAI_USER_AGENT_TAG=finance-autonomy` for production workloads to differentiate metrics.
- Include request metadata: `finance_org_id`, `autonomy_session_id`, `compliance_tag` via `metadata` payloads where API supports it (Responses, Agents, Assistants).
- Ensure debug logger persists `org_id` for Supabase cross-reference (`openai_debug_events`).
- Configure finance-specific tagging and quota variables so dashboards align:
  - `OPENAI_REQUEST_TAGS_FINANCE_PROD` / `_STAGING`
  - `OPENAI_REQUEST_QUOTA_TAG_FINANCE_PROD` / `_STAGING`
  - Base tags continue to inherit from `OPENAI_REQUEST_TAGS`.
- `lib/openai/workloads.ts` reads these variables and exposes helpers so services can request the appropriate workload config (default vs finance) without duplicating env parsing logic.

## Compliance Guardrails
- Budget alerts: configure 70%/85%/95% thresholds emailing finance-ops + Slack pager.
- RPM/RPD caps: use OpenAI project settings to enforce lower limits on staging keys; add per-service rate limiters for production.
- Allowed models: restrict project access to approved tiers (gpt-5, gpt-5-mini, text-embedding-3-small; realtime preview disabled until cleared).
- Data handling: disable log retention if accessible; rely on explicit `mode=default` usage; document downstream storage (Supabase `openai_debug_events`).

## Deployment Steps
1. Create/Open projects in OpenAI console; apply quotas, allowed models, and SCIM group access.
2. Generate keys, stash in secrets manager, update environment variables:
   - `OPENAI_API_KEY` → general default.
   - `OPENAI_API_KEY_FINANCE_PROD` / `_STAGING` for finance tasks.
   - `OPENAI_ORG_ID_FINANCE_*`, `OPENAI_REQUEST_TAGS_FINANCE_*`, `OPENAI_REQUEST_QUOTA_TAG_FINANCE_*`, and `OPENAI_USER_AGENT_TAG_FINANCE` to align observability + billing.
   - Update `OPENAI_ORG_ID` if finance project resides in separate org.
3. Update infra manifests (Docker, k8s, hosting provider) to reference new secret names; update CI pipelines as needed.
4. Services can now call `getOpenAIClientForWorkload('finance-prod' | 'finance-staging')` or `readOpenAiWorkloadEnv()` from `lib/openai/workloads.ts` to route requests to the correct credentials; multi-key routing by org remains a future enhancement.
5. Validate connectivity via staging smoke tests (embeddings + response calls) and confirm `openai_debug_events` receives entries tagged with finance org ID.
6. Document in release runbook (`docs/observability.md`, `docs/backup-restore.md`).

## Future Enhancements
- Implement dynamic key selection based on org metadata (finance vs. non-finance) using shared client helper.
- Integrate OpenAI usage metrics into Datadog dashboards with finance-specific filters.
- Automate key rotation via OpenAI API once available.
