# OpenAI Integration – Phase 3 (Finance Agent Network)

## Objectives
- Stand up finance-specialised Agents Platform manifests (Tax, Audit, Accounts Payable, Corporate Finance, CFO, Risk).
- Publish consistent tool schemas and dataset references so orchestrated tasks stay deterministic across environments.
- Extend MCP tooling with finance-focused capabilities (Vision OCR, trial balance snapshots).

## Key Changes
| Area | Description |
| --- | --- |
| MCP Tooling | Added `document.vision_ocr` (OpenAI Vision) and `trial_balance.get` entries with schema definitions. |
| Agent Manifests | New manifests registered in `services/rag/mcp/bootstrap.ts` for `finance.tax`, `finance.accounts_payable`, `finance.cfo`, `finance.corporate`, and `finance.risk`. |
| Domain Metadata | `services/agents/domain-agents.ts` enumerates tool catalogues, datasets, and knowledge bases for each finance agent. |
| Orchestrator | Director agent prioritises the new finance personas based on objective intent and enriches tasks with dataset/knowledge hints. |

## Configuration
- `tool_registry` seeds (`supabase/seed/001_tool_registry.sql`) now include metadata for `document.vision_ocr` and `trial_balance.get`.
- Agents sync pipeline (`npm run agents:publish:*`) pushes the finance manifests to OpenAI when Phase 3 flags are enabled.

## Validation Checklist
1. Run `npm run agents:generate` and verify `dist/agent_manifests.json` includes the new finance entries.
2. Execute `npm run agents:publish:dry` (or staging publish) and confirm OpenAI Agent IDs resolve without missing tool references.
3. Inspect the director plan endpoint (`/api/agent/orchestrator/plan`) with objectives such as “Process AP invoices” or “Prepare board liquidity update” – ensure the relevant agent keys (`accountsPayable`, `corporateFinance`, `accountingClose`) appear.
4. Trigger the new OCR tool via MCP (tool key `document.vision_ocr`) and confirm the response logs under `openai_debug_events`.
5. Update `docs/agents/finance-network.md` with the resulting datasets and knowledge bases, recording any gaps for ingestion.

## Next Steps (Phase 4)
- Hydrate dataset references with live Supabase views (`ap_invoices`, `treasury_positions`, etc.).
- Implement multi-agent escalation policies (AP → Controller → Risk) inside the orchestrator service.
- Feed Phase 3 outputs into telemetry dashboards so finance leadership can monitor automation readiness.
