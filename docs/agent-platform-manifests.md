# Agent Platform Manifest Migration Plan

## Objectives
- Publish each domain agent (director, safety, audit execution, accounting close, etc.) as an OpenAI Agent manifest with consistent prompts, tools, and safety metadata.
- Automate manifest sync so CI/staging can validate updates before production rollout.

## CLI Workflow
1. `npm run agents:publish:dry`
   - Generates `dist/agent_manifests.json`.
   - Runs publish script in dry-run mode (no API calls).
   - Validates manifest shape; outputs intended payload.
2. `npm run agents:publish:staging`
   - Generate manifests → publish to OpenAI Agent Platform → update Supabase `agent_manifests` metadata with returned IDs.
   - Requires environment vars: `OPENAI_API_KEY`, `OPENAI_ORG_ID`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

## CI Integration
- `.github/workflows/ci.yml` runs `npm run agents:publish:dry` on PRs and `npm run agents:publish:staging` on `main` (requires secrets: `STAGING_OPENAI_API_KEY`, `STAGING_OPENAI_ORG_ID`, `STAGING_SUPABASE_URL`, `STAGING_SUPABASE_SERVICE_ROLE_KEY`).
- Staging publish writes `dist/published_agent_ids.json`, which `agents:update` consumes to persist OpenAI Agent IDs.

## Runtime Selection
- RAG service resolves Persona → `openaiAgentId` from Supabase `agent_manifests.metadata` (fallback to legacy env override).

## Outstanding
- Wire scripts into CI workflow with staging secrets.
- Populate staging data and run smoke tests before production rollout.
