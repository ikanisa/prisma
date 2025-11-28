# Agent Tooling Overview

This document summarizes the tool integration surface area available in the `@openai/agents` SDK and explains how to combine hosted capabilities, custom functions, other agents, and Model Context Protocol (MCP) servers.

## 1. Hosted Tools

Hosted tools are executed alongside the model on OpenAI infrastructure. They can be registered when instantiating an agent:

```ts
import { Agent, webSearchTool, fileSearchTool } from '@openai/agents';

const agent = new Agent({
  name: 'Travel assistant',
  tools: [webSearchTool(), fileSearchTool('VS_ID')],
});
```

Available hosted tools include:

| Tool | Type string | Purpose |
| --- | --- | --- |
| Web search | `web_search` | Perform internet search queries. |
| File / retrieval search | `file_search` | Query vector stores hosted on OpenAI. |
| Computer use | `computer` | Automate GUI interactions. |
| Code Interpreter | `code_interpreter` | Execute Python code in a sandboxed environment. |
| Image generation | `image_generation` | Generate images from text prompts. |

The options map directly to the OpenAI Responses API. Use it for advanced features such as ranking options or semantic filters.

## 2. Function Tools

Use the `tool()` helper to turn local business logic into callable tools. Parameters can be defined with Zod for strict validation or with raw JSON schema for more lenient parsing.

### Strict mode with Zod

```ts
import { tool } from '@openai/agents';
import { z } from 'zod';

const getWeatherTool = tool({
  name: 'get_weather',
  description: 'Get the weather for a given city',
  parameters: z.object({ city: z.string() }),
  async execute({ city }) {
    return `The weather in ${city} is sunny.`;
  },
});
```

### Non-strict JSON schema

Disable strict mode when you want the model to attempt best-effort argument inference. Validation becomes the tool's responsibility in this case.

```ts
import { tool } from '@openai/agents';

interface LooseToolInput {
  text: string;
}

const looseTool = tool({
  description: 'Echo input; be forgiving about typos',
  strict: false,
  parameters: {
    type: 'object',
    properties: { text: { type: 'string' } },
    required: ['text'],
    additionalProperties: true,
  },
  execute: async (input) => {
    if (typeof input !== 'object' || input === null || !('text' in input)) {
      return 'Invalid input. Please try again';
    }
    return (input as LooseToolInput).text;
  },
});
```

### Additional options

- `strict`: defaults to `true`. When enabled, the SDK throws on invalid arguments.
- `errorFunction`: customize error handling output by returning a human-readable message.
- `execute`: receives `(args, context)` where `context` is the optional `RunContext`.

## 3. Agents as Tools

Agents can be composed by exposing an existing agent as a callable tool via `agent.asTool()`.

```ts
import { Agent } from '@openai/agents';

const summarizer = new Agent({
  name: 'Summarizer',
  instructions: 'Generate a concise summary of the supplied text.',
});

const summarizerTool = summarizer.asTool({
  toolName: 'summarize_text',
  toolDescription: 'Generate a concise summary of the supplied text.',
});

const mainAgent = new Agent({
  name: 'Research assistant',
  tools: [summarizerTool],
});
```

Under the hood, the SDK wraps the sub-agent in a function tool with a single input parameter. When invoked, it creates a runner using default settings, executes the sub-agent, and returns either the last message or a custom-extracted output. Pass `runConfig` or `runOptions` into `asTool()` to customize the runner.

## 4. MCP Servers

Agents can consume Model Context Protocol servers as tool sources. The SDK provides helpers like `MCPServerStdio` to connect to local MCP servers.

```ts
import { Agent, MCPServerStdio } from '@openai/agents';

const server = new MCPServerStdio({
  fullCommand: 'npx -y @modelcontextprotocol/server-filesystem ./sample_files',
});

await server.connect();

const agent = new Agent({
  name: 'Assistant',
  mcpServers: [server],
});
```

Refer to the `filesystem-example.ts` reference for a complete integration walkthrough. See the MCP guide for details on registering tools and managing sessions.

## Tool Use Behavior

Consult the Agents guide for configuration knobs such as `tool_choice` and `toolUseBehavior` if you need to control when the model must call tools.

## Repository Integration Map

This codebase already wires tool catalogues, manifests, and governance into multiple layers. Use the following references when adding or updating tools:

### Tool catalogue sources

- **MCP bootstrap** – `services/rag/mcp/bootstrap.ts` defines canonical `McpToolDefinition` entries (`TOOL_DEFINITIONS`) alongside agent manifest metadata. Updating this file keeps the Supabase registry, manifest generator, and policy tooling in sync.
- **Domain agent metadata** – `services/agents/domain-agents.ts` maps each finance persona to its expected `toolCatalog`, datasets, and knowledge bases. Keep `toolCatalog` aligned with the MCP definitions so orchestrated tasks expose the correct tool references.
- **Notification tooling** – `services/rag/index.ts` persists `notify.user` tool calls into the Supabase `notifications` table using the schema maintained in `supabase/seed/002_tool_registry_metadata.sql` and fans urgent messages into the asynchronous dispatcher in `services/rag/notifications/fanout.ts`. The worker reads from `notification_dispatch_queue`, honours `user_notification_preferences`, and delivers through the email/SMS webhooks configured via `NOTIFY_USER_EMAIL_WEBHOOK` and `NOTIFY_USER_SMS_WEBHOOK`. End users can now manage overrides at `/client-portal/notifications`, which drives the `/api/notifications/preferences` endpoint to update Supabase in real time.

### Supabase + Next.js registry

- **Tables** – `agent_mcp_tools` stores MCP definitions and IDs, while `tool_registry` tracks tenant overrides (enabled, min role, sensitivity, standards references).
- **API proxy** – `apps/web/app/api/agent/tool-registry/route.ts` exposes `GET`/`PATCH` endpoints that surface `tool_registry` data to the Agent HITL UI. The React dashboard at `apps/web/app/agent/approvals/page.tsx` lets managers toggle availability and attach policy references.
- **Service client** – `getSupabaseServiceClient()` in `@/lib/supabase/server` injects the service role key so tool updates persist from the Next.js layer.

### Agent manifest workflow

- **Generate** – `npm run agents:generate` executes `scripts/generate_agent_manifests.ts` to compile definitions from `services/rag/mcp/bootstrap.ts` into `dist/agent_manifests.json`.
- **Dry publish** – `npm run agents:publish:dry` validates manifests against OpenAI without persisting IDs. Use this on feature branches.
- **Staging publish** – `npm run agents:publish:staging` pushes manifests, then `npm run agents:update` writes the returned Agent IDs into Supabase (`scripts/update_agent_manifest_ids.ts`).
- **Evaluations** – `npm run agents:evaluate` runs JSON scenario suites in `tests/agents/scenarios` to confirm new tools behave as expected.

### Event logging

The MCP bootstrap helpers emit structured logs (`mcp.tool_upserted`, `mcp.agent_manifest_upserted`) via the provided `logInfo` callback. Make sure new tools use descriptive keys so analytics dashboards can group adoption and error metrics.

## Best Practices

- Provide short, explicit descriptions for every tool.
- Validate inputs eagerly—prefer Zod schemas for strict JSON validation.
- Avoid side effects inside `errorFunction`; it should only format error messages.
- Ensure each tool has a single responsibility to aid model reasoning.
- Keep Supabase tables, manifest definitions, and domain metadata in sync to avoid runtime mismatches.
- Record policy references (`standards_refs`) for sensitive tools so HITL reviewers understand why gating exists.

## Implementation Checklist

1. Model the tool schema and metadata in `services/rag/mcp/bootstrap.ts`.
2. Run `npm run agents:generate` and commit the updated `dist/agent_manifests.json` when manifests change.
3. Execute `npm run agents:publish:dry` to ensure OpenAI accepts the manifest structure.
4. Update `services/agents/domain-agents.ts` (and any orchestrator prompts) to reference the new `toolKey`.
5. Create or update executor services in `services/rag` (e.g., `document-vision-ocr`) and register Supabase RPC endpoints if data access is required.
6. Wire notification fan-out: populate `user_notification_preferences`, configure `NOTIFY_USER_EMAIL_WEBHOOK`/`NOTIFY_USER_SMS_WEBHOOK`, and confirm the dispatcher in `services/rag/notifications/fanout.ts` drains the queue.
7. Expose tenant-level toggles via `/api/agent/tool-registry` when sensitive controls are needed.
8. Document behaviour and testing notes in the relevant `docs/agents/*.md` files.

## Outstanding Items

- Embed the new notification preference UI into the primary client navigation and gate access via production auth rather than demo headers.
- Expand MCP coverage to include reconciliation drilldowns (`accounting.reconciliation_detail`) and analytics pipelines planned in `IMPLEMENTATION_PLAN.md`.
- Add streaming tool execution support to align with the Phase 4 roadmap in `docs/openai-phase3.md`.
- Introduce automated regression checks that call `/api/agent/tool-registry` and `agents:publish:dry` on CI for each tool update.
- Finish wiring the Safety agent policy evaluations referenced in `services/rag/mcp/bootstrap.ts` before enabling high-autonomy modes.
- Add observability around `notification_dispatch_queue` (metrics, dead-letter surfacing) to ensure webhook failures surface before SLA breaches.

## Next Steps

- Learn how to force tool usage when required.
- Add guardrails for tool input/output validation.
- Review the TypeDoc reference for `tool()` and other hosted tool helpers.
- Prioritise the outstanding items above, starting with productionising the notification preferences experience (navigation, auth, and rollout comms).
