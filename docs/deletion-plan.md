# Prisma Core — Deletion Plan

> **Date:** 2026-01-09  
> **Purpose:** Comprehensive deletion plan for out-of-scope code, tables, and features  
> **Principle:** If not in scope, delete it

---

## 1. Deletion Summary

| Category | Items to Delete | Reason |
|----------|-----------------|--------|
| Packages | 1 package | Corporate services out of scope |
| Pages | 1-2 pages | US/non-scope jurisdictions |
| Agents | 1 agent | Corporate services |
| Migrations | 2-3 migrations | US overlays |
| Documentation | 1+ docs | US overlays |
| Market references | 50+ occurrences | KE, UG, TZ, ZA, US, UK |

---

## 2. Packages to Delete

### 2.1 packages/corporate-services/

| Item | Path | Why Delete | Replacement |
|------|------|------------|-------------|
| Entire package | `packages/corporate-services/` | Corporate services, company formation out of scope | None — feature removed |

**Files affected:** 9 files

**Deletion command:**
```bash
rm -rf packages/corporate-services/
```

**Post-deletion:** Update `pnpm-workspace.yaml` if explicitly listed.

---

## 3. Source Files to Delete

### 3.1 Tax Pages

| File | Path | Why Delete | Replacement |
|------|------|------------|-------------|
| US Overlays | `src/pages/tax/us-overlays.tsx` | US jurisdiction out of scope | None |

**Deletion command:**
```bash
rm src/pages/tax/us-overlays.tsx
```

**Post-deletion:** Remove route from `src/App.tsx`.

### 3.2 Agent Files

| File | Path | Why Delete | Replacement |
|------|------|------------|-------------|
| Corporate Malta Agent | `src/agents/corpMaltaAgent.ts` | Corporate services out of scope | None |

**Deletion command:**
```bash
rm src/agents/corpMaltaAgent.ts
```

**Post-deletion:**
1. Remove export from `src/agents/index.ts`
2. Remove from `src/lib/deepSearch.ts` (`corpMalta` function)

### 3.3 Backup Files

| File | Path | Why Delete | Replacement |
|------|------|------------|-------------|
| Documents backup | `src/pages/documents.tsx.backup` | Unnecessary backup file | None |

---

## 4. Supabase Migrations to Delete

### 4.1 US Overlays Migrations

| Migration | Why Delete | Replacement |
|-----------|------------|-------------|
| `20250924213000_tax_us_overlays.sql` | US jurisdiction out of scope | None |
| `20250924213001_tax_us_overlays_rls.sql` | US jurisdiction out of scope | None |

> [!CAUTION]
> Migration deletion requires careful handling:
> 1. Create a new DOWN migration that reverses the tables
> 2. Or mark migrations as "deprecated" and create cleanup migration

**Recommended approach:** Create new migration to drop US overlay tables:

```sql
-- 20260110000000_drop_us_overlays.sql
DROP TABLE IF EXISTS tax_us_overlays CASCADE;
-- Drop any related functions/triggers
```

---

## 5. Documentation to Delete

| Document | Path | Why Delete | Replacement |
|----------|------|------------|-------------|
| Tax US Overlays | `docs/tax-us-overlays.md` | US jurisdiction out of scope | None |

---

## 6. Configuration to Modify

### 6.1 Agent Registry

| File | Change | Details |
|------|--------|---------|
| `config/agent_registry.yaml` | Remove corporate services references | Any corpMalta entries |
| `agents.registry.yaml` | Remove corporate services references | Any corpMalta entries |

### 6.2 Knowledge Sources

| File | Change | Details |
|------|--------|---------|
| `config/knowledge_web_sources.yaml` | Remove non-RW/MT/CA sources | Filter by jurisdiction |

---

## 7. Code to Modify (Not Delete)

### 7.1 Classification Heuristics

| File | Lines to Modify | Change |
|------|-----------------|--------|
| `services/rag/knowledge/classification/heuristic.ts` | 355-388 | Remove KE, UG, TZ, ZA patterns |
| `services/rag/knowledge/classification/heuristic.ts` | 476-485 | Remove .ke, .ug, .tz, .za TLD mappings |
| `services/rag/knowledge/classification/heuristic.test.ts` | 235-250 | Remove KE, UG, TZ test cases |
| `apps/gateway/src/classification/llm.ts` | 44 | Restrict list to RW, MT, CA |

### 7.2 Deep Search Tools

| File | Lines to Modify | Change |
|------|-----------------|--------|
| `src/agents/tools/deepSearchTool.ts` | 63 | Restrict to RW, MT, CA |
| `src/gemini/tools/deepSearch.ts` | 42 | Restrict to RW, MT, CA |
| `src/lib/deepSearch.ts` | 81 | Remove corpMalta function |

### 7.3 Agent Index

| File | Lines to Modify | Change |
|------|-----------------|--------|
| `src/agents/index.ts` | 10, 29 | Remove corpMaltaAgent export |

### 7.4 App Routes

| File | Lines to Modify | Change |
|------|-----------------|--------|
| `src/App.tsx` | ~56, ~253 | Remove us-overlays route (if present) |
| `src/components/layout/sidebar.tsx` | If present | Remove us-overlays nav link |

---

## 8. Keep List — Surviving Modules

### 8.1 Core Packages (KEEP)

| Package | Path | Why Keep |
|---------|------|----------|
| agents | `packages/agents/` | Core agent SDK |
| audit | `packages/audit/` | Audit engagement support |
| core | `packages/core/` | Core utilities |
| database | `packages/database/` | Database seed (refactor to packages/db) |
| lib | `packages/lib/` | Shared libraries |
| logger | `packages/logger/` | Logging |
| security | `packages/security/` | Security utilities |
| supabase-client | `packages/supabase-client/` | Supabase wrapper |
| tax | `packages/tax/` | Tax calculations |
| tools | `packages/tools/` | Agent tools |
| types | `packages/types/` | Type definitions |
| ui | `packages/ui/` | UI components |

### 8.2 Core Pages (KEEP)

| Page | Path | Why Keep |
|------|------|----------|
| Engagements | `src/pages/engagements.tsx` | Core feature |
| Documents | `src/pages/documents.tsx` | Core feature |
| Tasks | `src/pages/tasks.tsx` | Core feature |
| Clients | `src/pages/clients.tsx` | Core feature |
| Settings | `src/pages/settings.tsx` | Core feature |
| Audit Plan | `src/pages/audit/plan.tsx` | Audit workflow |
| Audit Responses | `src/pages/audit/responses.tsx` | Audit workflow |
| Audit Risk Register | `src/pages/audit/risk-register.tsx` | Audit workflow |
| Audit Fraud Plan | `src/pages/audit/fraud-plan.tsx` | Audit workflow |
| Audit Workspace | `src/pages/audit/workspace/` | Audit workspace |
| Malta CIT | `src/pages/tax/malta-cit.tsx` | MT tax |
| VAT OSS | `src/pages/tax/vat-oss.tsx` | VAT calculations |
| Treaty WHT | `src/pages/tax/treaty-wht.tsx` | Tax treaty |
| Admin | `src/pages/admin/` | Administration |

### 8.3 Core Agents (KEEP)

| Agent | Path | Why Keep |
|-------|------|----------|
| Registry | `src/agents/agentRegistry.ts` | Agent orchestration |
| Accountant IFRS | `src/agents/accountantIfrsAgent.ts` | Accounting support |
| Audit ISA | `src/agents/auditIsaAgent.ts` | Audit support |
| Tax Rwanda | `src/agents/taxRwandaAgent.ts` | RW jurisdiction |
| Tax Malta | `src/agents/taxMaltaAgent.ts` | MT jurisdiction |

### 8.4 Core Services (KEEP)

| Service | Path | Why Keep |
|---------|------|----------|
| agents | `services/agents/` | Agent execution |
| analytics | `services/analytics/` | Analytics |
| cache | `services/cache/` | Performance |
| ledger | `services/ledger/` | Accounting |
| otel | `services/otel/` | Observability |
| rag | `services/rag/` | Knowledge retrieval |
| tax | `services/tax/` | Tax calculations |

### 8.5 Core Migrations (KEEP)

| Pattern | Why Keep |
|---------|----------|
| `*_core_*` | Core schema |
| `*_agent_*` | Agent system |
| `*_audit_*` | Audit features |
| `*_tax_mt_*` | Malta tax |
| `*_tax_vat_*` | VAT calculations |
| `*_rls_*` | Security policies |
| `*_accounting_*` | Accounting features |

---

## 9. Deletion Execution Order

> [!IMPORTANT]
> Execute deletions in this order to avoid breaking dependencies:

### Phase 1: Documentation and Configs

```bash
# 1. Delete out-of-scope documentation
rm docs/tax-us-overlays.md

# 2. Note: Config modifications happen in code phase
```

### Phase 2: Source Code

```bash
# 3. Delete backup files
rm src/pages/documents.tsx.backup

# 4. Delete out-of-scope pages
rm src/pages/tax/us-overlays.tsx

# 5. Delete out-of-scope agents
rm src/agents/corpMaltaAgent.ts

# 6. Update imports (manual edits required)
# - src/agents/index.ts
# - src/lib/deepSearch.ts
# - src/App.tsx
```

### Phase 3: Packages

```bash
# 7. Delete out-of-scope packages
rm -rf packages/corporate-services/
```

### Phase 4: Database

```bash
# 8. Create cleanup migration
# See Section 4 for migration content

# 9. Run migration
pnpm db:migrate
```

### Phase 5: Verification

```bash
# 10. Verify no references remain
grep -rn "corpMalta\|us-overlays\|corporate-services" src/ packages/ services/

# 11. Verify build
pnpm build

# 12. Verify tests
pnpm test
```

---

## 10. Rollback Plan

If issues arise during deletion:

1. **Source files:** Restore from git
   ```bash
   git checkout HEAD~1 -- <deleted-file>
   ```

2. **Packages:** Restore from git
   ```bash
   git checkout HEAD~1 -- packages/corporate-services/
   ```

3. **Migrations:** Create reverse migration
   ```sql
   -- Recreate dropped tables from backup
   ```

---

## 11. Post-Deletion Checklist

| Check | Command | Expected |
|-------|---------|----------|
| Build succeeds | `pnpm build` | No errors |
| Tests pass | `pnpm test` | All green |
| No corpMalta refs | `grep -r corpMalta src/` | 0 results |
| No US overlay refs | `grep -r us-overlays src/` | 0 results |
| No KE/UG/TZ/ZA refs | `grep -rE "KE\|UG\|TZ\|ZA" src/ packages/` | 0 results |
| TypeScript clean | `pnpm typecheck` | No errors |

---

## 12. Sign-Off

| Role | Name | Date | Approved |
|------|------|------|----------|
| Technical Lead | | | ☐ |
| QA Lead | | | ☐ |
| Partner | | | ☐ |
