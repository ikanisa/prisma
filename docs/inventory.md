# Prisma Core — Repository Inventory

> **Date:** 2026-01-09  
> **Purpose:** Evidence-based inventory before refactoring

---

## 1. Repository Overview

| Metric | Value |
|--------|-------|
| Monorepo tooling | pnpm 9.12.3 + Turborepo 2.6.1 |
| Node version | >=22.12.0 |
| Total root-level files | 336 |
| Total root-level directories | 40 |
| Supabase migrations | 163 files |
| Documentation files | 278 files |

---

## 2. Apps Directory (`apps/`)

| App | Path | Description | Status |
|-----|------|-------------|--------|
| `gateway` | `apps/gateway/` | API gateway with classification logic | **EVALUATE** — May merge into api |
| `web` | `apps/web/` | Main PWA application | **KEEP** — Primary web app |

**Files in apps/gateway:** 33  
**Files in apps/web:** 190

---

## 3. Packages Directory (`packages/`)

| Package | Path | Description | Status |
|---------|------|-------------|--------|
| `agents` | `packages/agents/` | Agent SDK with orchestrator and specialist agents | **KEEP** |
| `audit` | `packages/audit/` | Audit-specific logic and schemas | **KEEP** |
| `core` | `packages/core/` | Core utilities and types | **KEEP** |
| `corporate-services` | `packages/corporate-services/` | Company formation/corporate services | **DELETE** — Out of scope |
| `database` | `packages/database/` | Database seed and connection | **REFACTOR** → packages/db |
| `lib` | `packages/lib/` | Shared libraries | **KEEP** |
| `logger` | `packages/logger/` | Logging utilities | **KEEP** |
| `security` | `packages/security/` | Security utilities | **KEEP** |
| `supabase-client` | `packages/supabase-client/` | Supabase client wrapper | **KEEP** |
| `tax` | `packages/tax/` | Tax-specific logic and schemas | **KEEP** |
| `tools` | `packages/tools/` | Agent tools | **KEEP** |
| `types` | `packages/types/` | Shared TypeScript types | **KEEP** |
| `ui` | `packages/ui/` | Shared UI components | **KEEP** |

---

## 4. Source Directory (`src/`)

### 4.1 Pages (`src/pages/`)

| Page | File | Description | Status |
|------|------|-------------|--------|
| Index | `Index.tsx` | Landing/redirect page | **KEEP** |
| Not Found | `NotFound.tsx` | 404 page | **KEEP** |
| Unauthorized | `Unauthorized.tsx` | 401 page | **KEEP** |
| Acceptance | `acceptance.tsx` | Engagement acceptance | **KEEP** |
| Activity | `activity.tsx` | Activity log | **KEEP** |
| Clients | `clients.tsx` | Client management | **KEEP** |
| Dashboard | `dashboard.tsx` | Dashboard (stub) | **EVALUATE** |
| Documents | `documents.tsx` | Document management | **KEEP** |
| Engagements | `engagements.tsx` | Engagement list/create | **KEEP** |
| Independence | `independence.tsx` | Independence confirmation | **KEEP** for audit |
| Notifications | `notifications.tsx` | Notification center | **KEEP** |
| Privacy | `privacy.tsx` | Privacy policy | **KEEP** |
| Settings | `settings.tsx` | Settings page | **KEEP** |
| Tasks | `tasks.tsx` | Task management | **KEEP** |

### 4.2 Tax Pages (`src/pages/tax/`)

| Page | File | Description | Status |
|------|------|-------------|--------|
| Malta CIT | `malta-cit.tsx` | Malta corporate income tax | **KEEP** — MT jurisdiction |
| VAT/OSS | `vat-oss.tsx` | VAT and OSS returns | **KEEP** |
| DAC6 | `dac6.tsx` | EU DAC6 reporting | **EVALUATE** — EU-specific |
| Pillar Two | `pillar-two.tsx` | OECD Pillar Two | **EVALUATE** — Global scope |
| Treaty WHT | `treaty-wht.tsx` | Tax treaty withholding | **KEEP** |
| US Overlays | `us-overlays.tsx` | US tax overlays | **DELETE** — US out of scope |

### 4.3 Audit Pages (`src/pages/audit/`)

| Page | File | Description | Status |
|------|------|-------------|--------|
| Fraud Plan | `fraud-plan.tsx` | Fraud risk assessment | **KEEP** |
| Plan | `plan.tsx` | Audit planning | **KEEP** |
| Responses | `responses.tsx` | Management responses | **KEEP** |
| Risk Register | `risk-register.tsx` | Risk register | **KEEP** |
| Workspace | `workspace/` (9 files) | Audit workspace components | **KEEP** |

### 4.4 Admin Pages (`src/pages/admin/`)

| Page | Path | Description | Status |
|------|------|-------------|--------|
| Index | `index.tsx` | Admin dashboard | **KEEP** |
| Teams | `teams.tsx` | Team management | **KEEP** |
| Users | `users.tsx` | User management | **KEEP** |
| Learning Dashboard | `LearningDashboard.tsx` | Agent learning | **KEEP** |
| Agents | `agents/` (4 files) | Agent configuration | **KEEP** |
| Knowledge | `knowledge/` (1 file) | Knowledge base admin | **KEEP** |
| Learning | `learning/` (2 files) | Learning management | **KEEP** |
| Tools | `tools/` (1 file) | Tool admin | **KEEP** |

---

## 5. Agents (`src/agents/`)

| Agent | File | Description | Status |
|-------|------|-------------|--------|
| Agent Registry | `agentRegistry.ts` | Agent registration | **KEEP** |
| Accountant IFRS | `accountantIfrsAgent.ts` | IFRS accounting agent | **KEEP** |
| Audit ISA | `auditIsaAgent.ts` | ISA audit agent | **KEEP** |
| Tax Rwanda | `taxRwandaAgent.ts` | Rwanda tax specialist | **KEEP** — RW jurisdiction |
| Tax Malta | `taxMaltaAgent.ts` | Malta tax specialist | **KEEP** — MT jurisdiction |
| Corporate Malta | `corpMaltaAgent.ts` | Malta corporate services | **DELETE** — Corporate services out of scope |

---

## 6. Services (`services/`)

| Service | Path | Description | Status |
|---------|------|-------------|--------|
| Agents | `services/agents/` | Agent execution | **KEEP** |
| Analytics | `services/analytics/` | Analytics service | **KEEP** |
| Cache | `services/cache/` | Caching layer | **KEEP** |
| Ledger | `services/ledger/` | General ledger service | **KEEP** |
| OTEL | `services/otel/` | OpenTelemetry | **KEEP** |
| RAG | `services/rag/` | RAG/Knowledge system | **KEEP** |
| Tax | `services/tax/` | Tax calculation service | **KEEP** |

---

## 7. Supabase (`supabase/`)

### 7.1 Migration Statistics

| Category | Count |
|----------|-------|
| Total migrations | 163 |
| Core schema | ~20 |
| Accounting KB | ~15 |
| Agent system | ~12 |
| Tax modules | ~15 |
| Audit modules | ~10 |
| Security/RLS | ~20 |
| Misc/cleanup | ~71 |

### 7.2 Key Tables (from migrations)

| Domain | Tables |
|--------|--------|
| Core | `firms`, `users`, `firm_memberships` |
| Clients | `clients`, `engagements` |
| Tasks | `tasks`, `documents`, `notifications` |
| Audit | `audit_plan_*`, `audit_risk_*`, `audit_responses_*`, `audit_kam_*` |
| Tax | `tax_mt_*`, `tax_vat_*`, `tax_dac6_*`, `tax_pillar_two_*`, `tax_treaty_*`, `tax_us_*` |
| Knowledge | `kb_documents`, `knowledge_web_sources`, `knowledge_chunks` |
| Agent | `agent_runs`, `agent_events`, `agent_learning_*`, `chatkit_sessions` |

### 7.3 Edge Functions

| Function | Path | Status |
|----------|------|--------|
| Functions directory | `supabase/functions/` | 1 function found |

---

## 8. Authentication & Roles

### 8.1 Auth Implementation

| File | Purpose |
|------|---------|
| `src/hooks/use-auth.ts` | Primary auth hook |
| `src/lib/iam.ts` | IAM utilities |
| `packages/security/` | Security utilities |

### 8.2 Role Types

Found in codebase:

| Role | Context | Files |
|------|---------|-------|
| `ADMIN` | Organization admin | sidebar.tsx, iam.ts |
| `MANAGER` | Manager role | kam-service.ts, acceptance-service.ts |
| `PARTNER` | Partner approval | kam-service.ts, acceptance-service.ts |
| `STAFF` | Staff role | implicit in approval gates |
| `EMPLOYEE` | Employee role | kam-service.ts |
| `SYSTEM_ADMIN` | System admin | kam-service.ts |
| `LEAD` | Team lead | iam.ts |
| `MEMBER` | Team member | iam.ts |
| `VIEWER` | Viewer role | iam.ts |

### 8.3 Approval Gates

| Stage | Approver | Files |
|-------|----------|-------|
| `MANAGER` | Manager review | kam-service.ts, acceptance-service.ts |
| `PARTNER` | Partner approval | kam-service.ts, acceptance-service.ts |
| `EQR` | Quality reviewer | kam-service.ts, acceptance-service.ts |

---

## 9. Configuration (`config/`)

| File | Description | Status |
|------|-------------|--------|
| `agent_registry.yaml` | Agent definitions | **KEEP** |
| `agents.yaml` | Agent configs | **KEEP** |
| `knowledge_web_sources.yaml` | Web knowledge sources | **EVALUATE** |
| `retrieval-rules.yaml` | RAG retrieval rules | **KEEP** |
| `system.yaml` | System settings | **KEEP** |
| `ui_ux.yaml` | UI/UX config | **KEEP** |

---

## 10. Key Findings

### 10.1 Duplicates Identified

| Issue | Files | Resolution |
|-------|-------|------------|
| Multiple accounting KB migrations | 6+ migrations for same tables | Consolidate |
| Duplicate agent registry | `config/agent_registry.yaml` vs `agents.registry.yaml` | Merge |
| Multiple database packages | `packages/database/` vs `supabase/` | Consolidate into packages/db |

### 10.2 Dead Code / Mock Pages

| Item | Location | Evidence |
|------|----------|----------|
| Dashboard stub | `src/pages/dashboard.tsx` (133 bytes) | Minimal content |
| US overlays page | `src/pages/tax/us-overlays.tsx` | US jurisdiction |
| Corporate Malta agent | `src/agents/corpMaltaAgent.ts` | Corporate services |
| Documents backup | `src/pages/documents.tsx.backup` | Backup file |

### 10.3 Unused Features

| Feature | Location | Status |
|---------|----------|--------|
| Corporate services package | `packages/corporate-services/` | **DELETE** |
| US tax overlays | `src/pages/tax/us-overlays.tsx` | **DELETE** |
| Desktop app (Tauri) | `src-tauri/`, `src-tauri-legacy/` | **EVALUATE** |

---

## 11. Supabase Function Inventory

### 11.1 Functions in Migrations

Based on migration analysis:

| Function | Migration | Purpose |
|----------|-----------|---------|
| `is_member_of` | Various | RLS policy helper |
| `match_knowledge_chunks` | `20251201213700` | Vector search |
| Core functions | `20250103000000` | Consolidation |

---

## 12. Summary Statistics

| Category | Total | Keep | Delete | Evaluate |
|----------|-------|------|--------|----------|
| Apps | 2 | 1 | 0 | 1 |
| Packages | 13 | 10 | 1 | 2 |
| Pages | 28+ | 22+ | 1 | 5 |
| Agents | 6 | 5 | 1 | 0 |
| Services | 7 | 7 | 0 | 0 |
| Migrations | 163 | TBD | TBD | TBD |
