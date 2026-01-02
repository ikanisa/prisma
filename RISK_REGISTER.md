# Risk Register: Prisma Glow Autonomous Finance Suite

**Version:** 2.0.0  
**Date:** 2026-01-02  
**Owner:** Risk Committee

---

## Risk Summary

| Priority | Count | Status |
|----------|-------|--------|
| Critical (P0) | 3 | Open |
| High (P1) | 4 | Open |
| Medium (P2) | 8 | Open |
| Low (P3) | 5 | Open |

---

## Critical Risks (P0)

### RISK-001: Incomplete RBAC Implementation

| Attribute | Value |
|-----------|-------|
| **Category** | Security |
| **Likelihood** | High |
| **Impact** | Critical |
| **Status** | Open |
| **Owner** | Backend Team |
| **Due Date** | Before production |

**Description:**  
The `check_access()` function in `server/agents/security.py:30-51` contains a TODO comment indicating RBAC checks are not fully implemented. Currently returns `True` for all authenticated users.

**Evidence:**
```python
# server/agents/security.py:41
# TODO: Implement actual RBAC checks against database
# For now, allow all authenticated users
return {"allowed": True, "reason": "authenticated"}
```

**Impact:**  
Unauthorized users may access or execute agent operations beyond their permission level.

**Mitigation:**
1. Implement database-backed RBAC lookup
2. Add role checking against `organization_members` table
3. Add unit tests for permission boundaries
4. Add integration tests for multi-tenant isolation

---

### RISK-002: Missing Tax Calculation Unit Tests

| Attribute | Value |
|-----------|-------|
| **Category** | Data Integrity |
| **Likelihood** | Medium |
| **Impact** | Critical |
| **Status** | Open |
| **Owner** | QA Team |
| **Due Date** | Before production |

**Description:**  
Tax calculation formulas (CIT, VAT, NID, ILR, Pillar Two) lack comprehensive unit tests to verify mathematical correctness.

**Evidence:**  
`tests/tax/` directory exists but formula validation tests not confirmed.

**Impact:**  
Incorrect tax calculations could result in regulatory non-compliance, financial penalties, and reputational damage.

**Mitigation:**
1. Create test cases with known inputs/outputs for each tax calculator
2. Include edge cases (zero values, maximum limits, negative scenarios)
3. Add golden file tests with approved calculation examples
4. Implement property-based testing for formula verification

---

### RISK-003: Test Coverage Configuration Mismatch

| Attribute | Value |
|-----------|-------|
| **Category** | Quality |
| **Likelihood** | High |
| **Impact** | Medium |
| **Status** | Open |
| **Owner** | DevOps |
| **Due Date** | Immediate |

**Description:**  
`vitest.config.ts` has coverage thresholds set to 45% for statements/functions, but CI targets are 85%. This discrepancy could mask inadequate test coverage.

**Evidence:**
```typescript
// vitest.config.ts
thresholds: {
  statements: Number(process.env.VITEST_COVERAGE_STATEMENTS ?? '45'),
  branches: Number(process.env.VITEST_COVERAGE_BRANCHES ?? '80'),
  functions: Number(process.env.VITEST_COVERAGE_FUNCTIONS ?? '45'),
  lines: Number(process.env.VITEST_COVERAGE_LINES ?? '85'),
}
```

**Impact:**  
Low test coverage may not be caught during local development.

**Mitigation:**
1. Align default thresholds with CI requirements
2. Add pre-commit hook to enforce minimum coverage
3. Document coverage requirements in CONTRIBUTING.md

---

## High Risks (P1)

### RISK-004: Mock API Keys in Test Files

| Attribute | Value |
|-----------|-------|
| **Category** | Security |
| **Likelihood** | Low |
| **Impact** | Medium |
| **Status** | Open |
| **Owner** | QA Team |

**Description:**  
Test files contain placeholder API keys like `sk-test` that could be confused with real keys.

**Files Affected:**
- `tests/openai-*.test.ts`
- `services/rag/tests/setup.ts`

**Mitigation:**
1. Use environment variables for test keys
2. Add test fixture generator
3. Update .gitleaks.toml to catch test patterns

---

### RISK-005: Monolithic Backend Main Module

| Attribute | Value |
|-----------|-------|
| **Category** | Maintainability |
| **Likelihood** | High |
| **Impact** | Medium |
| **Status** | Open |
| **Owner** | Backend Team |

**Description:**  
`server/main.py` is 6,470 lines, making it difficult to maintain, test, and review.

**Impact:**  
- Increased bug surface area
- Slower code reviews
- Higher risk of merge conflicts
- Difficulty in onboarding new developers

**Mitigation:**
1. Extract route handlers to `server/routers/` modules
2. Move utility functions to `server/utils/`
3. Create domain-specific service modules
4. Add architecture documentation

---

### RISK-006: ESLint Configuration Incompatibility

| Attribute | Value |
|-----------|-------|
| **Category** | Build |
| **Likelihood** | High |
| **Impact** | Low |
| **Status** | Open |
| **Owner** | DevOps |

**Description:**  
ESLint v9 flat config not compatible with all packages, causing lint failures.

**Evidence:**
```
Invalid option '--ext' - perhaps you meant '-c'?
You're using eslint.config.js, some command line flags are no longer available.
```

**Mitigation:**
1. Update all packages to flat config format
2. Remove deprecated `--ext` flags
3. Test lint command in CI before merge

---

### RISK-007: Journal Entry Balance Validation

| Attribute | Value |
|-----------|-------|
| **Category** | Data Integrity |
| **Likelihood** | Low |
| **Impact** | High |
| **Status** | Open |
| **Owner** | Backend Team |

**Description:**  
Journal posting lacks explicit debit=credit validation at the API layer.

**Evidence:**  
`src/lib/accounting-close-service.ts:76-80` - `postJournal()` does not show balance validation.

**Mitigation:**
1. Add server-side validation before posting
2. Return detailed error on imbalance
3. Add database constraint as last line of defense
4. Write integration tests for balance validation

---

## Medium Risks (P2)

### RISK-008: MFA Enforcement Conditional

| Attribute | Value |
|-----------|-------|
| **Category** | Security |
| **Status** | Open |

**Description:** MFA enforcement appears conditional rather than mandatory for sensitive roles.

**Mitigation:** Configure MFA requirement for PARTNER, MANAGER, SYSTEM_ADMIN roles.

---

### RISK-009: No Automated Key Rotation

| Attribute | Value |
|-----------|-------|
| **Category** | Security |
| **Status** | Open |

**Description:** Encryption key rotation configured (90 days) but not automated.

**Mitigation:** Implement automated key rotation via cloud KMS.

---

### RISK-010: gitleaks Allowlist Too Broad

| Attribute | Value |
|-----------|-------|
| **Category** | Security |
| **Status** | Open |

**Description:** `server/main.py` allowlisted in `.gitleaks.toml:35`.

**Mitigation:** Review allowlist, narrow scope if possible.

---

### RISK-011: Missing Alerting Rules

| Attribute | Value |
|-----------|-------|
| **Category** | Observability |
| **Status** | Open |

**Description:** Dashboard names defined but alerting rules not configured.

**Mitigation:** Define alerts for error rate, latency, and critical failures.

---

### RISK-012: API Documentation Incomplete

| Attribute | Value |
|-----------|-------|
| **Category** | Documentation |
| **Status** | Open |

**Description:** `API_DOCUMENTATION.md` is only 2.5KB.

**Mitigation:** Generate OpenAPI documentation from FastAPI.

---

### RISK-013: Node Version Mismatch

| Attribute | Value |
|-----------|-------|
| **Category** | Build |
| **Status** | Open |

**Description:** package.json requires Node 22.12.0, CI uses 20.19.4.

**Mitigation:** Align versions or test compatibility.

---

### RISK-014: SQL Injection Protection Unverified

| Attribute | Value |
|-----------|-------|
| **Category** | Security |
| **Status** | Open |

**Description:** No explicit parameterized query verification visible.

**Mitigation:** Audit all database calls for parameterization.

---

### RISK-015: File Upload Validation Incomplete

| Attribute | Value |
|-----------|-------|
| **Category** | Security |
| **Status** | Open |

**Description:** MIME type checking exists but magic byte verification not confirmed.

**Mitigation:** Add file signature validation.

---

## Low Risks (P3)

### RISK-016: Trace Sampling 100%

| Attribute | Value |
|-----------|-------|
| **Category** | Cost |
| **Status** | Open |

**Description:** `traces_sample_rate=1.0` may cause high observability costs.

**Mitigation:** Reduce to 0.1-0.25 in production.

---

### RISK-017: Token Lifecycle Undocumented

| Attribute | Value |
|-----------|-------|
| **Category** | Documentation |
| **Status** | Open |

**Description:** JWT token rotation policy not documented.

**Mitigation:** Document in SECURITY.md.

---

### RISK-018: ZAP Scan Timeout Risk

| Attribute | Value |
|-----------|-------|
| **Category** | CI/CD |
| **Status** | Open |

**Description:** ZAP baseline scan may timeout on large applications.

**Mitigation:** Configure timeout or use targeted scans.

---

### RISK-019: Docs Navigation Missing

| Attribute | Value |
|-----------|-------|
| **Category** | Documentation |
| **Status** | Open |

**Description:** 175 files in `docs/` without navigation index.

**Mitigation:** Create documentation index/sitemap.

---

### RISK-020: Vector Search Performance Unverified

| Attribute | Value |
|-----------|-------|
| **Category** | Performance |
| **Status** | Open |

**Description:** pgvector performance under load not tested.

**Mitigation:** Add load tests for RAG search endpoint.

---

## Risk Matrix

```
         │ Low Impact │ Medium Impact │ High Impact │ Critical Impact │
─────────┼────────────┼───────────────┼─────────────┼─────────────────│
High     │ RISK-006   │ RISK-004,005  │             │ RISK-001,003    │
Likelihood│            │               │             │                 │
─────────┼────────────┼───────────────┼─────────────┼─────────────────│
Medium   │ RISK-013   │ RISK-008,017  │ RISK-007    │ RISK-002        │
Likelihood│            │               │             │                 │
─────────┼────────────┼───────────────┼─────────────┼─────────────────│
Low      │ RISK-016   │ RISK-009-012  │ RISK-014,15 │                 │
Likelihood│ RISK-18-20 │               │             │                 │
```

---

## Review Schedule

| Review | Frequency | Participants |
|--------|-----------|--------------|
| Risk Triage | Weekly | Engineering Lead, QA Lead |
| Risk Review | Bi-weekly | Full team |
| Audit | Quarterly | Security, Compliance |

---

*Risk Register updated during each sprint. All P0/P1 risks must be addressed before production release.*
