# Prisma AI-First Refactoring Plan

## Target Product Definition

**One monorepo, one PWA, two user types, ChatGPT App Directory ready**

### Core Requirements
- ✅ One monorepo
- ✅ One PWA (AI-first UI)
- ✅ Two user types only:
  - **System Admin** (full control, user management, configuration)
  - **Staff** (role-limited access)
- ✅ ChatGPT App Directory deployment-ready
  - MCP server + (optional) ChatGPT UI components
  - Correct privacy/security posture
  - Submission metadata

### Technology Stack
- **Agents/Workflows**: Agent Builder and/or Agents SDK
- **Function/Tool Calling**: Business logic exposed as tools
- **ChatKit**: Widgets + actions for structured UI in chat
- **Apps SDK**: ChatGPT App Store deployment

## Target Architecture

### Monorepo Layout

```
apps/
  pwa/          # Staff/admin web app (Next.js - consolidate from apps/web)
  api/          # Business API (FastAPI or Node - standardize existing)
  mcp/          # ChatGPT App server exposing /mcp endpoint

packages/
  core/         # Domain models + validation schemas + shared types
  tools/        # Tool implementations (pure functions), imported by API and MCP
  ui/           # Shared UI components (PWA) and (optionally) ChatGPT UI components

supabase/
  migrations/   # Migrations, seed, RLS policies, edge functions
```

**Key Rule**: API and MCP must call the same "tools layer", not duplicate logic.

## AI-First PWA UX

### Navigation Model
- **Default landing after login**: Command Center (Chat-first)
  - Left: threads (cases, clients, audits)
  - Middle: chat
  - Right: "Context Panel" (case facts, timeline, docs, tasks)
- Secondary pages exist, but they are tool-powered views, not the primary workflow

### What "AI-first" Means
Every meaningful screen has:
- A chat surface
- Structured widgets rendering tool results
- Actions that write back to DB (create task, assign, request docs, generate report, etc.)

## Tool Contract

### Minimum Tool Set

**Identity & Access**
- `whoami()`
- `list_staff()`
- `set_staff_role_permissions(staff_id, permissions[])` (admin only)

**Case / Engagement Management**
- `create_engagement(client_id, type, period, scope)`
- `get_engagement(engagement_id)`
- `list_engagements(filters)`
- `add_engagement_note(engagement_id, note)`
- `assign_engagement(engagement_id, staff_id)`

**Documents**
- `upload_document(engagement_id, file_id, tags[])`
- `classify_document(file_id)` (agent-assisted)
- `extract_entities(file_id)` (invoice totals, dates, vendor, etc.)
- `generate_request_for_documents(engagement_id)` (produces a checklist)

**Workpapers / Reporting**
- `run_audit_procedure(engagement_id, procedure_id)`
- `generate_management_letter(engagement_id)`
- `generate_tax_summary(engagement_id)`

**Knowledge Retrieval**
- File search style retrieval over IFRS/ISA/tax rules knowledge base

### Function Calling Requirements
- Strictly schema-defined (JSON schema inputs)
- Idempotent where possible
- Permission-checked (staff vs admin)
- Audited (log tool calls + DB mutations)

## ChatKit Integration Plan

### Widget System (Standardized Primitives)
- **KPI / Summary Card**: engagement status, risk level, missing docs count
- **Table/List widget**: list engagements, staff workload, open tasks
- **Timeline widget**: chronological notes, tool runs, document events
- **Document viewer row**: file name + tags + "open" action + "extract entities" action
- **Approval widget**: approve/reject generated report drafts (admin-only option)
- **Form widgets**: create engagement, request documents, assign staff
- **Diff / Review widget**: show "suggested changes" to journal entries / notes
- **Alert widget**: RLS/permissions issue, missing config, failed ingestion

## Apps SDK / ChatGPT App Directory Readiness

### MCP Server Requirements
- Expose `/mcp` endpoint
- Tool catalog with strict JSON schemas
- Permission checks
- Audit logs

### ChatGPT UI Components (Optional)
- UI components run inside iframe
- Communicate via `window.openai`
- Render inline with conversation

### Hero Flow for App Directory
"Turn an engagement folder into an audit-ready plan: ingest docs → extract entities → generate missing-doc checklist → draft management letter."

## Refactor Plan (Phased, Production-Safe)

### Phase 0 — Ground Truth & Deletion Budget (1–2 days)
- [ ] Inventory routes/pages/components: mark keep / refactor / delete
- [ ] Inventory DB tables/functions: mark used / unknown / unused
- [ ] Confirm only 2 user types remain (admin, staff) and delete dead role logic

### Phase 1 — Security & RBAC Foundation (2–4 days)
- [ ] Supabase auth baseline
- [ ] `profiles + roles + permissions` tables (already exists: `20260103010000_user_management_roles.sql`)
- [ ] RLS policies that enforce:
  - staff: only assigned engagements
  - admin: everything
- [ ] Add "policy tests" (even lightweight) so RLS regressions don't ship

### Phase 2 — Tool Layer Extraction (3–6 days)
- [ ] Create `packages/tools/*`
- [ ] Move business logic out of UI handlers and random API endpoints into tools
- [ ] Add:
  - permission checks
  - tool-call audit logs
  - consistent error types

### Phase 3 — Agent Orchestration (3–6 days)
- [ ] Decide orchestration:
  - Agent Builder for workflow prototyping
  - Agents SDK for production flows
- [ ] Implement core workflows:
  - "Engagement setup"
  - "Document ingestion + extraction"
  - "Draft reporting + review"

### Phase 4 — AI-First UX Rebuild (4–10 days)
- [ ] Rebuild PWA shell:
  - Chat-first Command Center
  - Context Panel
  - Tool-powered pages (Engagements, Docs, Tasks, Admin)
- [ ] Replace "text blobs" with widgets + actions (ChatKit)

### Phase 5 — ChatGPT App Packaging (2–5 days)
- [ ] Implement `apps/mcp` with `/mcp` endpoint
- [ ] Expose the same tool catalog as the PWA uses
- [ ] Add UI components where it materially improves UX
- [ ] Write privacy policy + data retention notes (submission requirement)

### Phase 6 — Production Hardening (ongoing, but gate before launch)
- [ ] Observability: tool-call tracing, error budgets
- [ ] Rate limits / abuse controls
- [ ] Secret management
- [ ] CI checks for: migrations, typecheck, lint, unit tests for tools

## Current State Analysis

### What Exists
- ✅ 2-role migration (`20260103010000_user_management_roles.sql`)
- ✅ MCP server skeleton (`apps/web/app/api/mcp/route.ts`)
- ✅ ChatKit components (`apps/web/components/features/chatkit/`)
- ✅ Agent infrastructure (`packages/agents/`, `packages/lib/src/openai/`)
- ✅ OpenAI app config (`apps/web/public/.well-known/openai-app-config.json`)

### What Needs Work
- ⚠️ Multiple frontends (Next.js in `apps/web`, possibly Vite shell)
- ⚠️ Complex role system (8 roles in config vs 2 required)
- ⚠️ Tools scattered across packages
- ⚠️ No unified tool layer
- ⚠️ ChatKit not fully integrated as primary UX
- ⚠️ MCP server needs proper tool catalog

## Implementation Strategy

### Decision 1: Choose Self-hosted ChatKit
Because Prisma deals with sensitive business data + audit/tax workflows:
- Your DB + RLS to be the source of truth
- Auditable tool runs
- Full control over retention and access

### Decision 2: Single PWA Surface
- Keep Next.js app (`apps/web`) as canonical UI
- Remove/retire other frontends from production builds
- Ensure one routing/auth/layout system

### Decision 3: Tool Quality First
Treat "tool quality" as the product. The UI is just a nice suit your tools wear.

If your tools are deterministic, permission-safe, and well-logged, then:
- ChatKit becomes easy
- Agents become reliable
- MCP becomes trivial
- App Directory review becomes dramatically less painful

## Next Steps

1. **Start with Phase 0**: Complete inventory and deletion budget
2. **Phase 1**: Ensure 2-role RBAC is fully enforced
3. **Phase 2**: Extract tools layer (this is the foundation)
4. **Phase 3-6**: Build on the tools layer

---

**Last Updated**: 2025-01-XX
**Status**: In Progress

