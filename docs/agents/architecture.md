# Autonomous Agent Architecture Roadmap

## Overview
The platform is evolving from a single RAG-oriented agent into a multi-agent system that coordinates specialist personas across audit, tax, accounting, reporting, and advisory. Agents collaborate through the Director (orchestrator) agent, policy/safety guardrails, and shared tool/knowledge catalogs.

## Agent Categories
1. **Director & Safety**
   - **Director Agent**: Plans/assigns tasks across domain agents, tracks progress, routes outputs to humans for approval when necessary.
   - **Safety Agent** (future): Governs autonomy thresholds, policy enforcement, refusal handling, and fallback to human in the loop (HITL).

2. **Domain Experts**
   - **Audit Execution** – ISA-compliant engagement workflows (risk, analytics, sampling, KAMs).
   - **Accounting Close** – Reconciliations, journals, variance analysis, close sign-off.
   - **Financial Reporting** – IFRS statements, notes, XBRL, performance packs.
   - **Tax Compliance** – CIT/VAT/TP workflows with jurisdiction checks.
   - **Advisory** – Valuation, scenarios, transaction support.
   - **Governance** – Independence, SOC, board oversight, autonomy gating.
   - **Client Collaboration** – Portal communications, deliverable packaging.

3. **Support Agents**
   - **Knowledge Curator** – Harvests/documents knowledge, maintains embeddings, freshness.
   - **Data Preparation** – ERP connectors, bank feeds, OCR, dataset normalization.
   - **Risk & Compliance** – Policy engine, regulatory watchlists, approval trails.
   - **Ops Monitoring** – Usage, cost, alerting, telemetry summarization.

## Implementation Status
Refer to `/api/agent/orchestrator/agents` (and `services/agents/domain-agents.ts`) for live metadata. Current pipeline has partial support for audit/tax personas; other agents are planned.

## Collaboration Flow
1. **Initiation**: Human (or client automation) sends an objective to `/api/agent/orchestrator/plan`.
2. **Planning**: Director Agent generates tasks with dependencies and risk-based human review requirements.
3. **Execution**: Domain agents consume tasks, leveraging MCP tools (future) and OpenAI streaming to provide incremental outputs.
4. **Safety & Governance**: Safety agent evaluates results, orchestrates HITL approvals where required, logs audit trail.
5. **Delivery**: Client Collaboration agent packages responses, Sora media, or filings; Ops agent monitors health/cost.

> The agent HITL UI (`/agent/approvals`) fronts the Supabase approval queue via Next.js proxies
> (`/api/agent/approvals`, `/api/agent/tool-registry`, `/api/agent/approvals/:id/decision`) so managers
> can triage blocked tool actions without calling the Express service directly.

## MCP & Tooling Roadmap
- Register Supabase queries, analytics runners, tax engines, ERP connectors as MCP tools so all agents can call them uniformly.
- Synchronize `tool_registry` with OpenAI agent manifests (Phase 1 done) and extend with domain-specific tools.
- Implement context-sharing (memory, state boards) via Supabase tables keyed by `openai_thread_id`.

## Human Interaction Model
- Chat-first UI with quick action buttons (approve, rerun, escalate) replaces traditional forms.
- HITL reduced to gating high-risk tasks; approvals stored via orchestrator traces and Supabase `approval_queue`.

## Next Milestones
1. **Tooling** – formalize MCP tool catalog, extend domain agent capabilities, integrate structured outputs.
2. **Execution Engine** – streaming tool execution (Phase 4), Realtime collaboration, Sora outputs.
3. **Safety** – develop autonomy scoring, alerting, and override flows.
4. **Testing** – agent-level integration suites, sandbox data packs, regression automation.

Maintain this doc alongside phase notes as new agents and workflows come online.
