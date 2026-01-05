# Phase 0: Ground Truth & Deletion Budget

## Frontend Inventory

### Current State
- **Legacy Vite SPA**: `src/` - Old React/Vite application (port 8080)
- **Next.js PWA**: `apps/web/` - Current production app (Next.js 14)
- **Desktop App**: `src-tauri/` - Tauri desktop wrapper

### Decision: Keep Next.js, Remove Legacy Vite
- ✅ **KEEP**: `apps/web/` (Next.js) - This is the canonical PWA
- ❌ **DELETE**: `src/` (Legacy Vite SPA) - Migrate useful components to `apps/web/`
- ✅ **KEEP**: `src-tauri/` (Desktop app wrapper - optional, not core PWA)

### Action Items
- [ ] Audit `src/` for reusable components/hooks
- [ ] Migrate useful code to `apps/web/`
- [ ] Remove `src/` directory
- [ ] Remove root `vite.config.ts` (keep only if needed for desktop)
- [ ] Update build scripts to only build Next.js app

## Role System Inventory

### Current State
**Old System (8 roles)** - Defined in:
- `POLICY/roles.md`
- `config/agents.yaml` (rbac section)
- `src/lib/config/constants.ts` (ORG_ROLES)
- `supabase/sql/iam_IAM1_schema.sql` (org_role enum)

Roles: SYSTEM_ADMIN, PARTNER, MANAGER, EMPLOYEE, CLIENT, READONLY, SERVICE_ACCOUNT, EQR

**New System (2 roles)** - Defined in:
- `supabase/migrations/20260103010000_user_management_roles.sql` (app_role enum)

Roles: SYSTEM_ADMIN, STAFF

### Decision: Migrate to 2-Role System
- ✅ **KEEP**: `20260103010000_user_management_roles.sql` (2-role migration)
- ❌ **DELETE/REFACTOR**: All references to 8-role system
- ✅ **MIGRATE**: Map old roles to new:
  - SYSTEM_ADMIN → SYSTEM_ADMIN
  - PARTNER, MANAGER, EMPLOYEE → STAFF
  - CLIENT, READONLY, SERVICE_ACCOUNT, EQR → Remove or handle separately

### Action Items
- [ ] Create migration script to convert existing users to 2-role system
- [ ] Update all RLS policies to use `app_role` instead of `org_role`
- [ ] Update API middleware to check `app_role`
- [ ] Update frontend components to use 2-role system
- [ ] Remove old role enums and constants
- [ ] Update `POLICY/roles.md` to reflect 2-role system
- [ ] Update `config/agents.yaml` to use 2-role system

## Database Tables Inventory

### Core Tables (KEEP)
- `user_profiles` - User management (already updated for 2-role)
- `user_invitations` - Invitation system
- `organizations` - Multi-tenancy
- `engagements` - Core business entity
- `documents` - Document management
- `tasks` - Task management
- `activity_logs` - Audit trail

### Tables to Audit
- [ ] Check for role-related columns that reference old 8-role system
- [ ] Check for unused tables
- [ ] Check for duplicate functionality

## API Endpoints Inventory

### Current Structure
- **FastAPI**: `server/main.py` - Python backend
- **Express Gateway**: `apps/gateway/` - Node.js API gateway
- **Next.js API Routes**: `apps/web/app/api/` - Next.js API routes

### Decision: Standardize
- ✅ **KEEP**: FastAPI for business logic
- ✅ **KEEP**: Express gateway for routing/auth
- ✅ **KEEP**: Next.js API routes for ChatKit/MCP endpoints
- ⚠️ **CONSOLIDATE**: Ensure no duplicate endpoints

## Tools/Agents Inventory

### Current State
- `packages/agents/` - Agent system
- `packages/audit/` - Audit agents
- `packages/tax/` - Tax agents
- `packages/lib/src/openai/` - OpenAI integrations
- `services/rag/` - RAG service
- `server/agents/` - Python agents

### Decision: Extract Tools Layer
- ✅ **CREATE**: `packages/tools/` - Pure tool functions
- ✅ **REFACTOR**: Move business logic from API endpoints to tools
- ✅ **ENSURE**: Both API and MCP call same tools layer

## ChatKit/MCP Inventory

### Current State
- ✅ MCP server skeleton: `apps/web/app/api/mcp/route.ts`
- ✅ ChatKit components: `apps/web/components/features/chatkit/`
- ✅ ChatKit API routes: `apps/web/app/api/chatkit/`
- ✅ OpenAI app config: `apps/web/public/.well-known/openai-app-config.json`
- ✅ MCP server types: `packages/lib/src/openai/mcp-server/`

### Status: Needs Enhancement
- [ ] Complete MCP server with full tool catalog
- [ ] Ensure ChatKit is primary UX (not just a page)
- [ ] Create widget system
- [ ] Integrate agents with ChatKit

## Directory Structure Target

### Current → Target
```
apps/
  web/          → apps/pwa/     (rename for clarity)
  gateway/      → apps/api/     (or keep as gateway)
  
packages/
  (existing)     → packages/core/ (domain models)
  (new)          → packages/tools/ (tool implementations)
  ui/            → packages/ui/ (keep as is)
  
services/
  rag/          → services/rag/ (keep as is)
  
(new)           → apps/mcp/     (MCP server)
```

## Deletion Budget

### Safe to Delete
- [ ] `src/` - Legacy Vite SPA (after migration)
- [ ] `desktop-app.backup/` - Backup directory
- [ ] `src-tauri-legacy/` - Legacy Tauri code
- [ ] Old role-related code (after migration)

### Keep but Refactor
- [ ] `apps/web/` → `apps/pwa/` (rename)
- [ ] Role system code (migrate to 2-role)
- [ ] API endpoints (consolidate duplicates)

### Keep As-Is
- [ ] `supabase/migrations/` - All migrations
- [ ] `packages/` - Shared packages
- [ ] `services/` - Backend services

## Next Steps

1. **Complete this inventory** - Mark all items as audited
2. **Create migration scripts** - Role migration, data migration
3. **Start Phase 1** - RBAC foundation with 2-role system
4. **Phase 2** - Extract tools layer

---

**Status**: In Progress
**Last Updated**: 2025-01-XX

