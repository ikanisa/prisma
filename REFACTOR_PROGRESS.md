# Refactoring Progress

## ✅ Completed

### Phase 0: Ground Truth & Deletion Budget
- [x] Created `PHASE_0_INVENTORY.md` with comprehensive inventory
- [x] Identified frontend consolidation strategy (keep Next.js, remove legacy Vite)
- [x] Identified role system migration (8 roles → 2 roles)
- [x] Created `REFRACTOR_PLAN.md` master plan document

### Phase 2: Tool Layer Extraction (In Progress)
- [x] Created `packages/tools/` package structure
- [x] Implemented tool types and registry system
- [x] Created core tool implementations:
  - **Identity & Access**: `whoami`, `list_staff`, `set_staff_role_permissions`
  - **Engagements**: `create_engagement`, `get_engagement`, `list_engagements`, `add_engagement_note`, `assign_engagement`
  - **Documents**: `upload_document`, `classify_document`, `extract_entities`, `generate_request_for_documents`
  - **Workpapers**: `run_audit_procedure`, `generate_management_letter`, `generate_tax_summary`
  - **Knowledge**: `search_knowledge_base`
- [x] Integrated tools registry with MCP server
- [x] Updated MCP route to use centralized tools registry

## 📋 Next Steps

### Phase 1: Security & RBAC Foundation
- [ ] Complete role migration from 8-role to 2-role system
- [ ] Update all RLS policies to use `app_role` instead of `org_role`
- [ ] Update API middleware to check `app_role`
- [ ] Update frontend components to use 2-role system
- [ ] Remove old role enums and constants

### Phase 2: Tool Layer Extraction (Continue)
- [ ] Connect tools to actual database operations
- [ ] Implement audit logging to database
- [ ] Add proper authentication/authorization extraction
- [ ] Add input validation using schemas
- [ ] Write unit tests for tools

### Phase 3: Agent Orchestration
- [ ] Integrate Agent Builder workflows
- [ ] Implement Agents SDK workflows
- [ ] Create core workflows:
  - "Engagement setup"
  - "Document ingestion + extraction"
  - "Draft reporting + review"

### Phase 4: AI-First UX Rebuild
- [ ] Rebuild PWA shell with Chat-first Command Center
- [ ] Implement Context Panel
- [ ] Create tool-powered pages (Engagements, Docs, Tasks, Admin)
- [ ] Replace "text blobs" with widgets + actions (ChatKit)

### Phase 5: ChatGPT App Packaging
- [ ] Complete MCP server implementation
- [ ] Add UI components where it improves UX
- [ ] Write privacy policy + data retention notes
- [ ] Prepare submission checklist

## 📁 New Files Created

### Tools Package
- `packages/tools/package.json`
- `packages/tools/tsconfig.json`
- `packages/tools/src/index.ts`
- `packages/tools/src/types.ts`
- `packages/tools/src/registry.ts`
- `packages/tools/src/identity.ts`
- `packages/tools/src/engagements.ts`
- `packages/tools/src/documents.ts`
- `packages/tools/src/workpapers.ts`
- `packages/tools/src/knowledge.ts`

### MCP Integration
- `packages/lib/src/openai/mcp-server/create-server.ts` (updated)
- `apps/web/app/api/mcp/route.ts` (updated to use tools registry)

### Documentation
- `REFRACTOR_PLAN.md` - Master refactoring plan
- `PHASE_0_INVENTORY.md` - Phase 0 inventory and deletion budget
- `REFACTOR_PROGRESS.md` - This file

## 🏗️ Architecture Decisions

### Tools Layer
- **Decision**: Centralized tools registry that both API and MCP use
- **Rationale**: Prevents code duplication, ensures consistent behavior
- **Implementation**: `packages/tools` with registry pattern

### Role System
- **Decision**: Migrate from 8-role to 2-role system (SYSTEM_ADMIN, STAFF)
- **Rationale**: Simplifies permissions, aligns with requirements
- **Status**: Migration exists (`20260103010000_user_management_roles.sql`), needs enforcement

### Frontend Consolidation
- **Decision**: Keep Next.js (`apps/web`), remove legacy Vite (`src/`)
- **Rationale**: Next.js is production-ready, Vite is legacy
- **Status**: Inventory complete, migration pending

## 🔧 Technical Notes

### Tool Registry Pattern
The tool registry provides:
- Centralized tool definitions
- Permission checking
- Audit logging
- Consistent error handling
- Idempotency support

### MCP Integration
The MCP server now:
- Uses the tools registry for all tool definitions
- Executes tools through the registry (includes permission checks)
- Returns structured responses in MCP format

### Next Steps for Tools
1. Connect to actual Supabase database
2. Implement proper auth extraction from JWT
3. Add audit log persistence
4. Add input validation
5. Write comprehensive tests

---

**Last Updated**: 2025-01-XX
**Status**: Phase 2 In Progress

