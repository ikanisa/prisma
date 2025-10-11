# Tool Manifest Schema (Agent Platform)

## Source of Truth
- Supabase table `tool_registry` remains the canonical registry. Records now support `metadata` JSON with typed parameter schemas.
- Seed script: `supabase/seed/002_tool_registry_metadata.sql` enriches existing tools with parameter definitions and required fields.

## Metadata Structure
```json5
{
  "parameters": {
    "type": "object",
    "properties": {
      "query": { "type": "string", "description": "Search query" },
      "topK": { "type": "integer", "minimum": 1, "maximum": 20 }
    },
    "required": ["query"]
  },
  "sensitive": true,
  "standardsRefs": ["ISA 230"]
}
```

- `parameters`: JSON Schema snippet passed directly to OpenAI tool manifest.
- `sensitive`: mirrors existing column, surfaced for governance.
- `standardsRefs`: helper for UI/reference; not currently forwarded to OpenAI but retained for audits.

## RAG Service Behaviour
- `services/rag/openai-agent-service.ts` reads `metadata` and builds OpenAI tool definitions with structured parameters.
- If schema missing, it falls back to permissive `{ additionalProperties: true }` to avoid breaking existing tools.

## Synchronisation Flow
- Startup: `syncAgentToolsFromRegistry` syncs definitions to `OPENAI_AGENT_ID`; retries with backoff.
- Manual trigger: `POST /api/agent/tools/sync` (requires auth).
- Future: set `OPENAI_AGENT_TOOL_SYNC_CRON` to a cron expression when background scheduling is wired up.

## Adding a New Tool
1. Insert/update `tool_registry` with metadata JSON describing parameters.
2. Run the sync endpoint (or restart service) to push the tool to OpenAI Agent.
3. Validate via OpenAI dashboard or API (`GET /v1/agents/:id`).
4. Update docs/tests if tool introduces new schema patterns.

## Testing
- `vitest` suite (`tests/openai-agent-service.test.ts`) covers metadata-driven parameter mapping and no-op sync behaviour.
- Add integration smoke tests once Agents SDK flows are hooked into CI.

