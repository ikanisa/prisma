# Prisma Core — Markets Cleanup Report

> **Date:** 2026-01-09  
> **Purpose:** List all non-RW/MT/CA market references for deletion

---

## 1. Scope Reminder

**Allowed jurisdictions:** `RW` (Rwanda), `MT` (Malta), `CA` (Canada)

**All other jurisdictions must be deleted:**
- `KE` (Kenya)
- `UG` (Uganda)
- `TZ` (Tanzania)
- `ZA` (South Africa)
- `US` (United States)
- `UK` (United Kingdom)
- `EU` (European Union — except MT-specific EU rules)
- `GLOBAL` (Generic fallback)
- Any other country codes

---

## 2. Files with Non-Scope Market References

### 2.1 Classification Heuristics

| File | Lines | Markets | Action |
|------|-------|---------|--------|
| `services/rag/knowledge/classification/heuristic.ts` | 355-388 | KE, UG, TZ, ZA | Remove non-RW/MT/CA patterns |
| `services/rag/knowledge/classification/heuristic.ts` | 476-485 | TLD mappings for .ke, .ug, .tz, .za | Remove |
| `services/rag/knowledge/classification/heuristic.test.ts` | 235-250 | KE, UG, TZ test cases | Remove tests |
| `apps/gateway/src/classification/llm.ts` | 44 | Lists KE, UG, TZ, ZA, US, UK | Restrict to RW, MT, CA |
| `apps/gateway/src/classification/heuristic.ts` | 111-120 | RW patterns | **KEEP** (already RW) |

### 2.2 Agent Tools

| File | Lines | Markets | Action |
|------|-------|---------|--------|
| `src/agents/tools/deepSearchTool.ts` | 63 | Lists RW, MT, EU, US, GLOBAL | Restrict to RW, MT, CA |
| `src/gemini/tools/deepSearch.ts` | 42 | Lists RW, MT, EU, US, GLOBAL | Restrict to RW, MT, CA |

### 2.3 Tax Pages

| File | Description | Action |
|------|-------------|--------|
| `src/pages/tax/us-overlays.tsx` | US tax overlays | **DELETE entire file** |
| `src/pages/tax/pillar-two.tsx` | OECD Pillar Two (global) | **EVALUATE** — May keep for compliance |
| `src/pages/tax/dac6.tsx` | EU DAC6 reporting | **EVALUATE** — MT needs EU compliance |

### 2.4 Agent Files

| File | Lines | Issue | Action |
|------|-------|-------|--------|
| `src/agents/corpMaltaAgent.ts` | All | Corporate services (out of scope) | **DELETE entire file** |
| `src/agents/index.ts` | 10, 29 | Exports corpMaltaAgent | Remove export |

### 2.5 Migration Files

| Migration | Lines | Markets | Action |
|-----------|-------|---------|--------|
| `20251201180000_accounting_kb_comprehensive.sql` | 11 | RW, EU, US, MT, GLOBAL | Restrict to RW, MT, CA |
| `20251201000000_accounting_kb_comprehensive.sql` | 11 | RW, EU, US, GLOBAL | Restrict to RW, MT, CA |
| `20251201210000_accounting_kb.sql` | 10 | RW, EU, US | Restrict to RW, MT, CA |
| `20251201220000_accounting_kb.sql` | 11 | RW, EU, US | Restrict to RW, MT, CA |
| `20251201220004_knowledge_web_sources_200_urls.sql` | 17 | GLOBAL, RW, MT | Keep RW, MT; add CA |
| `20260201150000_accounting_kb_comprehensive.sql` | 11 | RW, EU, US | Restrict to RW, MT, CA |

### 2.6 Webhooks

| File | Lines | Markets | Action |
|------|-------|---------|--------|
| `src/routes/webhooks/whatsapp.ts` | 20, 33 | handleTaxRwandaWebhook, handleTaxMaltaWebhook | **KEEP** — These are valid |

### 2.7 Deep Search Library

| File | Lines | Markets | Action |
|------|-------|---------|--------|
| `src/lib/deepSearch.ts` | 72-81 | taxRwanda, taxMalta, corpMalta | Remove corpMalta; add Canada variations |

### 2.8 Sidebar Navigation

| File | Lines | Issue | Action |
|------|-------|-------|--------|
| `src/components/layout/sidebar.tsx` | 84 | Malta CIT link | **KEEP** — Valid MT feature |

### 2.9 Audit Pages

| File | Lines | Issue | Action |
|------|-------|-------|--------|
| `src/pages/audit/plan.tsx` | 43 | GAPSME (Malta) | **KEEP** — Valid MT framework |
| `src/pages/audit/workspace/group.tsx` | 13 | "Local CPA Malta" | **KEEP** — Example data |

### 2.10 Knowledge Pages

| File | Lines | Issue | Action |
|------|-------|-------|--------|
| `src/pages/knowledge/repositories.tsx` | 430, 614, 653 | Malta resources | **KEEP** — Valid MT resources |

---

## 3. Summary by Market

### 3.1 Kenya (KE)

| Location | Action |
|----------|--------|
| `services/rag/knowledge/classification/heuristic.ts:355` | Remove pattern |
| `services/rag/knowledge/classification/heuristic.ts:482` | Remove TLD mapping |
| `services/rag/knowledge/classification/heuristic.test.ts:235` | Remove test |
| `apps/gateway/src/classification/llm.ts:44` | Remove from list |

### 3.2 Uganda (UG)

| Location | Action |
|----------|--------|
| `services/rag/knowledge/classification/heuristic.ts:366` | Remove pattern |
| `services/rag/knowledge/classification/heuristic.ts:483` | Remove TLD mapping |
| `services/rag/knowledge/classification/heuristic.test.ts:243` | Remove test |
| `apps/gateway/src/classification/llm.ts:44` | Remove from list |

### 3.3 Tanzania (TZ)

| Location | Action |
|----------|--------|
| `services/rag/knowledge/classification/heuristic.ts:377` | Remove pattern |
| `services/rag/knowledge/classification/heuristic.ts:484` | Remove TLD mapping |
| `services/rag/knowledge/classification/heuristic.test.ts:250` | Remove test |
| `apps/gateway/src/classification/llm.ts:44` | Remove from list |

### 3.4 South Africa (ZA)

| Location | Action |
|----------|--------|
| `services/rag/knowledge/classification/heuristic.ts:388` | Remove pattern |
| `services/rag/knowledge/classification/heuristic.ts:485` | Remove TLD mapping |
| `apps/gateway/src/classification/llm.ts:44` | Remove from list |

### 3.5 United States (US)

| Location | Action |
|----------|--------|
| `src/pages/tax/us-overlays.tsx` | **DELETE entire file** |
| Multiple migration files | Remove from comments/examples |
| `src/agents/tools/deepSearchTool.ts:63` | Remove from list |
| `src/gemini/tools/deepSearch.ts:42` | Remove from list |
| `apps/gateway/src/classification/llm.ts:44` | Remove from list |

### 3.6 United Kingdom (UK)

| Location | Action |
|----------|--------|
| `apps/gateway/src/classification/llm.ts:44` | Remove from list |

### 3.7 European Union (EU)

| Location | Action |
|----------|--------|
| Multiple files | **EVALUATE** — MT requires some EU compliance |
| DAC6 page | Keep if required for MT compliance |
| Migration comments | Clean up generic EU references |

### 3.8 GLOBAL (Generic)

| Location | Action |
|----------|--------|
| All files | Remove fallback code; require explicit jurisdiction |

---

## 4. Files to Delete Entirely

| File | Reason |
|------|--------|
| `src/pages/tax/us-overlays.tsx` | US jurisdiction out of scope |
| `supabase/migrations/20250924213000_tax_us_overlays.sql` | US jurisdiction out of scope |
| `supabase/migrations/20250924213001_tax_us_overlays_rls.sql` | US jurisdiction out of scope |
| `src/agents/corpMaltaAgent.ts` | Corporate services out of scope |
| `packages/corporate-services/` | Corporate services out of scope |
| `docs/tax-us-overlays.md` | US jurisdiction out of scope |

---

## 5. Missing Canada (CA) References

> [!IMPORTANT]
> Canada is a new in-scope jurisdiction that needs to be ADDED:

| Needed | Location |
|--------|----------|
| TLD mapping `.ca` | `services/rag/knowledge/classification/heuristic.ts` |
| Canada patterns | Classification heuristics |
| CRA (Canada Revenue Agency) references | Agent system |
| Canadian tax agent | `src/agents/` (new file needed) |
| Canada playbooks | `packages/config/CA/` (new directory) |

---

## 6. Verification Commands

After cleanup, run these commands to verify no non-scope markets remain:

```bash
# Should return 0 results after cleanup
grep -rn "KE\|UG\|TZ\|ZA" src/ packages/ services/ --include="*.ts" --include="*.tsx" | grep -v "KEEP\|node_modules"

# Should return 0 results
grep -rn "jurisdictionCode.*US\|jurisdictionCode.*UK" src/ packages/ services/

# Should only show RW, MT, CA
grep -rn "jurisdictionCode" src/ packages/ services/ --include="*.ts" | head -20
```

---

## 7. Action Items

1. **Immediate deletions:**
   - Delete `src/pages/tax/us-overlays.tsx`
   - Delete `src/agents/corpMaltaAgent.ts`
   - Delete `packages/corporate-services/`
   - Delete US overlay migrations

2. **Code modifications:**
   - Update classification heuristics to remove KE/UG/TZ/ZA
   - Update deep search tools to only allow RW/MT/CA
   - Add Canada (CA) support throughout

3. **New files needed:**
   - Canadian tax agent
   - Canada playbooks
   - CRA knowledge sources

4. **Migrations:**
   - Create new migration to add CA jurisdiction
   - Create new migration to drop unsupported jurisdictions
