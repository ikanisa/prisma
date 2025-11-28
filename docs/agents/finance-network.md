# Finance Agent Network (Phase 3)

## Overview
Phase 3 introduces a finance-oriented agent mesh that complements the director/safety orchestrators. Each domain agent now advertises its tool catalog, datasets, and knowledge bases so MCP manifests and Agents Platform registrations stay aligned.

## Domain Agents
| Agent | Key (`services/agents/types.ts`) | Tool Catalog | Primary Datasets | Knowledge Bases | Status |
| --- | --- | --- | --- | --- | --- |
| Audit Execution | `auditExecution` | `rag.search`, `policy_check`, `audit.risk_summary` | `audit_risks`, `audit_responses` | `ifrs`, `isa` | in_progress |
| Tax Compliance | `taxCompliance` | `rag.search`, `policy_check`, `document.vision_ocr` | `tax_filings`, `transfer_pricing` | `tax_guidance` | in_progress |
| Controller (CFO) | `accountingClose` | `accounting.reconciliation_summary`, `accounting.journal_summary`, `accounting.close_summary`, `trial_balance.get` | `reconciliations`, `journal_entries`, `trial_balance` | `close_checklists`, `ifrs` | in_progress |
| Accounts Payable | `accountsPayable` | `accounting.reconciliation_summary`, `accounting.journal_summary`, `document.vision_ocr` | `ap_invoices`, `ap_payments` | `procure_to_pay` | planned |
| Corporate Finance | `corporateFinance` | `rag.search`, `policy_check`, `document.vision_ocr`, `db.read` | `board_minutes`, `corporate_actions`, `treasury_positions` | `corporate_policy`, `treasury_playbooks` | planned |
| Risk & Compliance | `riskAndCompliance` | `policy_check`, `rag.search`, `document.vision_ocr` | `risk_register` | `compliance_guides` | in_progress |

The director orchestrator (`services/agents/director.ts`) now prioritises these agents based on intent and generates task inputs referencing their datasets/knowledge stores.

## Agent Platform Manifests
- `services/rag/mcp/bootstrap.ts` registers OpenAI manifests for:
  - `finance.tax`
  - `finance.accounts_payable`
  - `finance.cfo`
  - `finance.corporate`
  - `finance.risk`
- `scripts/generate_agent_manifests.ts` pulls these definitions into `dist/agent_manifests.json` so CI and staging publish jobs mirror production configurations.

## Tooling & Datasets
- New MCP tool `document.vision_ocr` exposes OpenAI Vision OCR for invoice ingestion and board-pack digitisation.
- `trial_balance.get` tool is surfaced for controller workflows and CFO reporting.

## Remaining Work
1. Hydrate dataset placeholders with concrete Supabase views (e.g., `ap_invoices`, `treasury_positions`).
2. Build dashboards that correlate finance agent actions with reconciliation/close KPIs.
3. Extend orchestrator policies to enforce escalation chains between Accounts Payable → Controller → Risk.
4. Integrate Phase 4 autonomy guardrails once low-touch HITL flows are in place.
