# Model Context Protocol (MCP) Orchestration Blueprint

## Goals
- Provide a common protocol for registering tools, agents, and shared context across the RAG service and future domain agents.
- Persist orchestration state in Supabase so Director/Safety agents can coordinate long-running workflows, enforce policy, and resume tasks.
- Enable multi-agent collaboration without breaking existing single-agent flows; Phase A focuses on scaffolding and backwards-compatible proxies.

## Terminology
| Term | Description |
| --- | --- |
| **Tool Manifest** | Declarative description of a callable capability (function, workflow, external API). Maps to existing `tool_registry` entries or new MCP tools. |
| **Agent Manifest** | Capabilities, prompts, and safety requirements for a specific agent persona registered with the MCP broker. |
| **Session Board** | Shared state for an orchestration run (tasks, status, inputs/outputs) backed by Supabase tables. |
| **Director Agent** | Orchestrator that assigns tasks to domain agents, sequences tool calls, and records completion. |
| **Safety Agent** | Policy enforcement layer applying guardrails, HITL requirements, and telemetry logging. |

## Data Model Extensions
The following tables will be introduced via Supabase migrations:

### `agent_mcp_tools`
| Column | Type | Notes |
| --- | --- | --- |
| `id` | UUID (PK) | Unique tool id. |
| `tool_key` | text | References `tool_registry.key` when available (nullable). |
| `name` | text | Human-readable label. |
| `description` | text | Summary for tool selection. |
| `schema_json` | jsonb | JSON Schema for parameters/returns. |
| `provider` | text | e.g. `supabase`, `erp`, `tax`, `openai`. |
| `metadata` | jsonb | Arbitrary MCP metadata (auth scopes, timeouts, cost). |
| `created_at` / `updated_at` | timestamptz | Touch trigger. |

### `agent_manifests`
| Column | Type | Notes |
| --- | --- | --- |
| `id` | UUID (PK) | Unique agent manifest id. |
| `agent_key` | text | e.g. `director`, `safety`, `audit.execution`. |
| `version` | text | Semantic version of prompt/tool config. |
| `persona` | text | Persona identifier (AUDIT/FINANCE/etc). |
| `prompt_template` | text | System prompt / instructions. |
| `tool_ids` | uuid[] | References `agent_mcp_tools.id`. |
| `default_role` | text | Minimum role required to activate. |
| `safety_level` | text | e.g. `LOW`, `MEDIUM`, `HIGH`. |
| `metadata` | jsonb | Additional info (OpenAI agent id, streaming support). |
| `created_at` / `updated_at` | timestamptz | Touch trigger. |

### `agent_orchestration_sessions`
Tracks each orchestrated run.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | UUID (PK) | Orchestration session id. |
| `org_id` | UUID | References `organizations`. |
| `created_by_user_id` | UUID | User initiating session. |
| `status` | text | `PENDING`, `RUNNING`, `WAITING_APPROVAL`, `COMPLETED`, `FAILED`. |
| `objective` | text | User goal. |
| `director_agent_id` | uuid | Link to `agent_manifests`. |
| `safety_agent_id` | uuid | Link to `agent_manifests`. |
| `metadata` | jsonb | Additional context (autonomy thresholds, risk score). |
| `created_at` / `updated_at` | timestamptz | Touch trigger. |

### `agent_orchestration_tasks`
| Column | Type | Notes |
| --- | --- | --- |
| `id` | UUID (PK) | Task id. |
| `session_id` | UUID | References `agent_orchestration_sessions`. |
| `agent_manifest_id` | UUID | Target domain agent. |
| `title` | text | Task summary. |
| `input` | jsonb | Structured inputs. |
| `output` | jsonb | Structured outputs. |
| `status` | text | `PENDING`, `ASSIGNED`, `IN_PROGRESS`, `AWAITING_APPROVAL`, `COMPLETED`, `FAILED`. |
| `depends_on` | uuid[] | Task dependencies. |
| `metadata` | jsonb | Execution metadata (tool calls, cost). |
| `started_at` / `completed_at` | timestamptz | Timestamps. |

### `agent_safety_events`
| Column | Type | Notes |
| --- | --- | --- |
| `id` | UUID (PK) | Event id. |
| `session_id` | UUID | References `agent_orchestration_sessions`. |
| `task_id` | UUID | Optional, references `agent_orchestration_tasks`. |
| `severity` | text | `INFO`, `WARN`, `BLOCKED`. |
| `rule_code` | text | Policy identifier (e.g., `AUTONOMY:LOW_RISK`). |
| `details` | jsonb | Structured reason payload. |
| `created_at` | timestamptz | Event timestamp. |

Indices & RLS policies will mirror existing agent tables (`is_member_of`, `has_min_role`).

## Service Architecture
```
+------------------+
| Next.js Frontend |
|  /api/agent/*    |⇄ Proxy
+------------------+
           |
           v
+------------------+
| Express MCP Hub  |  services/rag/mcp/
| - DirectorAgent  |
| - SafetyAgent    |
| - Task Scheduler |
+------------------+
   | Supabase client
   v
+----------------------------+
| agent_mcp_tools            |
| agent_manifests            |
| agent_orchestration_*      |
+----------------------------+
```

### Director Agent Responsibilities
- Resolve active manifests for objective, produce orchestration plan (task DAG).
- Submit tasks to domain agents via MCP tool invocations (initially local function calls; future phases use streaming/responses).
- Update task state based on agent responses, escalate to Safety agent when risk threshold exceeded.

### Safety Agent Responsibilities
- Evaluate autonomy score per task using policy rules (role requirements, sensitive tools, financial thresholds).
- Inject HITL approvals by queuing `approval_queue` entries or auto-approving low-risk tasks based on configuration.
- Emit `agent_safety_events` and trigger alerts (`openai.agent_*`, telemetry) for monitoring.

## API Extensions
The following routes will be introduced (Next.js proxies to Express MCP hub):

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/agent/orchestrator/session` | Create orchestration session, returning session board pointer. |
| `POST` | `/api/agent/orchestrator/tasks/:id/complete` | Callback for domain agents to report completion / status updates. |
| `GET` | `/api/agent/orchestrator/session/:id` | Poll session/task state (used by UI). |

Express service additions:
- `POST /api/agent/orchestrator/session` – validate org/user, instantiate session with Director/Safety manifests, record metadata.
- `POST /api/agent/orchestrator/tasks/:id/complete` – update task status, persist outputs, schedule dependents, emit safety events when supplied.
- `GET /api/agent/orchestrator/session/:id` – return orchestration board (session + tasks) for polling UIs.
- Background scheduler (`processPendingOrchestrationTasks`) advances PENDING tasks to ASSIGNED at an interval controlled by `ORCHESTRATION_POLL_INTERVAL_MS` (defaults to 15s).
- Scheduler also invokes configured executors (`services/rag/mcp/executors.ts`). When no tasks are supplied for an audit objective, default `audit.execution` tasks run `audit-risk-summary` and `audit-evidence-summary` executors using the provided `engagementId`.

## Tool & Agent Registration Flow
Current seeded tools (Phase A):
- `rag.search` – hybrid knowledge retrieval.
- `policy_check` – ISA/IFRS compliance check.
- `db.read` – placeholder dataset snapshot tool.
- `audit.risk_summary` – pulls risk register + response summary for audit engagements (`executor=audit-risk-summary`).
  - Requires `orgId` and `engagementId` inputs so the executor can query Supabase audit tables.

Tool & manifest lifecycle:
1. MCP tool definitions live in `services/rag/mcp/bootstrap.ts` (future phases can split into `services/rag/mcp/tools/*`).
2. Startup bootstrap ensures `agent_mcp_tools` entries exist (upsert by `provider,tool_key`).
3. Agent manifests defined in the same bootstrap file referencing tool IDs and prompts.
4. Director fetches manifests on boot; Safety agent reads policy config from `agent_manifests` metadata.

## Compatibility Notes
- Existing `/api/agent/start|plan|execute` endpoints remain for single-agent workflows.
- Orchestration sessions may spawn subordinate agent sessions (`agent_sessions`) for backwards compatibility; tasks store `legacy_session_id` when applicable.
- HITL gating still depends on `approval_queue`; Safety agent will raise approvals on behalf of Director.

## Open Questions
- Should tool execution be delegated via OpenAI MCP directly or mediated through local services? (Phase A: local; Phase B+: remote).
- How to prioritize tasks when multiple orgs run orchestrations concurrently? Consider queue priority by risk/SLAs.
- Safety agent scoring model: start rule-based, later integrate heuristic/ML.

## Next Steps
1. Implement migrations for new tables with RLS + indexes (`20251115110000_agent_mcp_schema.sql`).
2. Build MCP bootstrap script in `services/rag/mcp/bootstrap.ts` to sync tool + agent manifests.
3. Add Director/Safety service modules with Supabase persistence.
4. Extend Express APIs and Next.js proxies per table above.
5. Update documentation (`ENDPOINTS_AND_WORKFLOWS.md`, `DATA_MODEL.md`, release notes) once endpoints and tables are live.
