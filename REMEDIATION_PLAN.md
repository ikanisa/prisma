# Remediation Plan: Prisma Glow Pre-Production Fixes

**Date:** 2026-01-02  
**Owner:** Engineering Lead  
**Target Completion:** Before Production Release

---

## Overview

This plan sequences the remediation of all P0 and P1 issues identified in the comprehensive audit. Items are ordered by dependency and priority.

---

## Phase 1: Critical Blockers (Week 1)

### Day 1-2: Security Fixes

#### 1.1 Complete RBAC Implementation (P0)

**Issue:** `RISK-001` / `SEC-003`  
**Owner:** Backend Team  
**Effort:** 2-3 days

**Current State:**
```python
# server/agents/security.py:41
# TODO: Implement actual RBAC checks against database
return {"allowed": True, "reason": "authenticated"}
```

**Required Changes:**

1. **Update `check_access()` function:**
```python
# server/agents/security.py
async def check_access(
    self,
    agent_id: str,
    required_capability: Optional[str] = None
) -> Dict[str, Any]:
    """
    Check if user has access to execute agent
    """
    # Query organization membership
    membership = await get_user_membership(self.user_id, self.org_id)
    if not membership:
        return {"allowed": False, "reason": "not_a_member"}
    
    # Check role permissions
    role = membership.get("role")
    if not has_permission(role, f"agents.execute.{agent_id}"):
        return {"allowed": False, "reason": "insufficient_role"}
    
    # Check autonomy level
    if required_capability:
        user_autonomy = membership.get("autonomy_level", "L0")
        if not meets_autonomy_requirement(user_autonomy, required_capability):
            return {"allowed": False, "reason": "autonomy_level_insufficient"}
    
    return {"allowed": True, "reason": "authorized"}
```

2. **Add tests:**
   - `tests/test_rbac_security.py`
   - Cover all role combinations
   - Test cross-org isolation

**Verification:**
```bash
pytest tests/test_rbac_security.py -v
```

---

#### 1.2 Remove Mock API Keys from Tests (P1)

**Issue:** `RISK-004` / `SEC-001`  
**Owner:** QA Team  
**Effort:** 1 day

**Files to Update:**
- `tests/openai-*.test.ts`
- `services/rag/tests/setup.ts`

**Current:**
```typescript
const result = await createRealtimeSession({ openAiApiKey: 'sk-test', ... });
```

**Fix:**
```typescript
// tests/fixtures/test-config.ts
export const TEST_OPENAI_KEY = process.env.TEST_OPENAI_API_KEY ?? 'test-key-placeholder';

// In test files
import { TEST_OPENAI_KEY } from './fixtures/test-config';
const result = await createRealtimeSession({ openAiApiKey: TEST_OPENAI_KEY, ... });
```

**Verification:**
```bash
grep -r "sk-" tests/ --include="*.ts" # Should return 0 results
```

---

### Day 2-3: Test Coverage Alignment

#### 1.3 Fix Coverage Threshold Mismatch (P0)

**Issue:** `RISK-003` / `TEST-001`  
**Owner:** DevOps  
**Effort:** 1 hour

**File:** `vitest.config.ts`

**Change:**
```typescript
coverage: {
  thresholds: {
    statements: Number(process.env.VITEST_COVERAGE_STATEMENTS ?? '80'),
    branches: Number(process.env.VITEST_COVERAGE_BRANCHES ?? '75'),
    functions: Number(process.env.VITEST_COVERAGE_FUNCTIONS ?? '80'),
    lines: Number(process.env.VITEST_COVERAGE_LINES ?? '80'),
  },
}
```

**Verification:**
```bash
pnpm run coverage
# Should fail if below thresholds
```

---

#### 1.4 Add Tax Formula Unit Tests (P0)

**Issue:** `RISK-002` / `DATA-001`  
**Owner:** QA Team + Tax Domain Expert  
**Effort:** 3-5 days

**New Test Files:**
- `tests/tax/cit-computation.test.ts`
- `tests/tax/vat-return.test.ts`
- `tests/tax/nid-adjustment.test.ts`
- `tests/tax/pillar-two.test.ts`
- `tests/tax/interest-limitation.test.ts`

**Example Test:**
```typescript
// tests/tax/cit-computation.test.ts
describe('CIT Computation', () => {
  it('should compute Malta CIT with 6/7 refund', () => {
    const result = computeCit({
      preTaxProfit: 100000,
      adjustments: [{ label: 'Depreciation', amount: 5000 }],
      participationExempt: false,
      refundProfile: '6_7',
    });
    
    expect(result.chargeableIncome).toBe(105000);
    expect(result.citAmount).toBe(36750); // 35%
    expect(result.refundAmount).toBe(31500); // 6/7 of 36750
  });
  
  it('should handle zero profit', () => { ... });
  it('should handle negative adjustments', () => { ... });
  it('should enforce minimum tax', () => { ... });
});
```

**Verification:**
```bash
pnpm test tests/tax/
```

---

### Day 3-4: Code Quality

#### 1.5 Fix ESLint Configuration (P1)

**Issue:** `RISK-006` / `CICD-001`  
**Owner:** DevOps  
**Effort:** 1 day

**Files to Update:**
- `packages/agents/package.json`
- `packages/tax/package.json`

**Change lint scripts:**
```json
{
  "scripts": {
    "lint": "eslint src"  // Remove --ext flag
  }
}
```

**Verification:**
```bash
pnpm run lint
# Should complete without deprecation warnings
```

---

#### 1.6 Add Journal Balance Validation (P1)

**Issue:** `RISK-007` / `DATA-002`  
**Owner:** Backend Team  
**Effort:** 1 day

**File:** Supabase Edge Function for `/journal/submit`

**Add validation:**
```typescript
// supabase/functions/accounting-close/index.ts
async function submitJournal(batchId: string) {
  const { data: lines } = await supabase
    .from('journal_lines')
    .select('amount, type')
    .eq('batch_id', batchId);
  
  const totalDebit = lines
    .filter(l => l.type === 'DEBIT')
    .reduce((sum, l) => sum + l.amount, 0);
  
  const totalCredit = lines
    .filter(l => l.type === 'CREDIT')
    .reduce((sum, l) => sum + l.amount, 0);
  
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error(`Journal out of balance: DR=${totalDebit}, CR=${totalCredit}`);
  }
  
  // Proceed with submission
}
```

**Verification:**
```bash
# Test with imbalanced journal
curl -X POST /journal/submit -d '{"batchId": "test-imbalanced"}'
# Should return 400 Bad Request
```

---

## Phase 2: High Priority Improvements (Week 2)

### Day 5-7: Backend Refactoring

#### 2.1 Decompose main.py (P1)

**Issue:** `RISK-005` / `PERF-001`  
**Owner:** Backend Team  
**Effort:** 3-5 days

**Target Structure:**
```
server/
├── main.py              # App initialization, middleware (< 500 lines)
├── routers/
│   ├── auth.py          # Authentication endpoints
│   ├── documents.py     # Document management
│   ├── tasks.py         # Task management
│   ├── agents.py        # Agent endpoints
│   ├── knowledge.py     # RAG/knowledge endpoints
│   ├── tax.py           # Tax computation endpoints
│   ├── accounting.py    # Accounting endpoints
│   └── audit.py         # Audit endpoints
├── services/
│   ├── rate_limiter.py  # (existing)
│   ├── cache.py         # (existing)
│   └── supabase.py      # Supabase client wrapper
└── schemas/
    ├── requests.py      # Pydantic request models
    └── responses.py     # Pydantic response models
```

**Migration Steps:**
1. Create router modules
2. Move endpoint definitions
3. Extract shared utilities
4. Update imports in main.py
5. Add router registrations

**Verification:**
```bash
pytest tests/
pnpm run test:e2e
```

---

### Day 8-9: Security Hardening

#### 2.2 Enforce MFA for Sensitive Roles (P2)

**Issue:** `RISK-008` / `AUTH-001`  
**Owner:** Platform Team  
**Effort:** 2 days

**Implementation:**
1. Add MFA requirement to Supabase Auth config
2. Create middleware to check MFA status
3. Block sensitive operations without MFA

---

#### 2.3 Review gitleaks Allowlist (P2)

**Issue:** `RISK-010` / `SEC-002`  
**Owner:** Security  
**Effort:** 2 hours

**Action:**
1. Audit `server/main.py` for any actual secrets
2. Narrow allowlist to specific line ranges if needed
3. Document reason for each allowlist entry

---

## Phase 3: Documentation & Monitoring (Week 3)

### Day 10-11: Documentation

#### 3.1 Update API Documentation (P2)

**Issue:** `RISK-012` / `DOC-001`  
**Owner:** Backend Team  
**Effort:** 2 days

**Action:**
1. Export OpenAPI spec from FastAPI
2. Generate markdown documentation
3. Add endpoint examples
4. Update `API_DOCUMENTATION.md`

---

#### 3.2 Update RUNBOOK.md (P2)

**Issue:** `DOC-002`  
**Owner:** Ops Team  
**Effort:** 1 day

**Add sections:**
- Incident response procedures
- On-call escalation paths
- Common failure scenarios
- Recovery procedures

---

### Day 12: Monitoring Setup

#### 3.3 Define Alerting Rules (P2)

**Issue:** `RISK-011` / `OBS-001`  
**Owner:** DevOps  
**Effort:** 1 day

**Alerts to Configure:**
- Error rate > 1% → Warning
- Error rate > 5% → Critical
- P95 latency > 2s → Warning
- P95 latency > 5s → Critical
- Agent execution failures > 10/hour → Warning

---

## Verification Matrix

| Phase | Items | Tests | Sign-off Required |
|-------|-------|-------|-------------------|
| 1 | 1.1-1.6 | Unit, Integration | Security, QA |
| 2 | 2.1-2.3 | Unit, E2E | Backend Lead |
| 3 | 3.1-3.3 | Manual review | Ops |

---

## Timeline Summary

| Week | Days | Focus | Deliverables |
|------|------|-------|--------------|
| 1 | 1-4 | P0 blockers | RBAC, Tests, Coverage |
| 2 | 5-9 | P1 improvements | Refactoring, Security |
| 3 | 10-12 | Documentation | Docs, Monitoring |

**Total Estimated Effort:** 12 working days

---

## Success Criteria

- [ ] All P0 issues closed
- [ ] All P1 issues closed or documented workarounds
- [ ] Test coverage ≥ 80%
- [ ] Security scans clean
- [ ] Documentation updated
- [ ] Release readiness sign-off obtained

---

*Remediation plan to be reviewed daily during execution. Escalate blockers immediately.*
