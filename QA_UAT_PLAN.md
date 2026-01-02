# QA/UAT Test Plan: Prisma Glow Autonomous Finance Suite

**Version:** 2.0.0  
**Date:** 2026-01-02  
**Status:** Pre-Production

---

## 1. Test Scope

### In Scope

| Domain | Components |
|--------|------------|
| **Authentication** | Login, logout, MFA, session management |
| **Authorization** | RBAC, RLS policies, autonomy levels |
| **Tax Modules** | CIT, VAT, DAC6, Pillar Two, NID, ILR, CFC |
| **Accounting** | Journal entries, reconciliations, trial balance, close process |
| **Audit** | Planning, risk register, KAM, TCWG pack |
| **AI Agents** | Orchestrator, specialist agents, tool execution |
| **Documents** | Upload, RAG ingestion, search, classification |
| **Desktop App** | Tauri build, offline mode, local storage |

### Out of Scope

- Third-party service reliability (OpenAI, Supabase uptime)
- Load testing beyond 100 concurrent users
- Accessibility compliance (WCAG) - separate test plan

---

## 2. Test Environments

| Environment | Purpose | URL |
|-------------|---------|-----|
| **Local** | Developer testing | `localhost:5173` |
| **Staging** | QA/UAT testing | `staging.prismaglow.com` |
| **Production** | Live system | `app.prismaglow.com` |

---

## 3. Test Categories

### 3.1 Unit Tests

**Framework:** Vitest  
**Coverage Targets:**

| Metric | Target | Current |
|--------|--------|---------|
| Statements | 85% | ~45% |
| Branches | 80% | ~80% |
| Functions | 85% | ~45% |
| Lines | 85% | ~85% |

**Run Command:**
```bash
pnpm run test
pnpm run coverage
```

### 3.2 Integration Tests

| Test Suite | Location | Command |
|------------|----------|---------|
| API Endpoints | `tests/test_*.py` | `pytest tests/` |
| Supabase Functions | `supabase/functions/` | `supabase functions serve` |
| Agent Workflows | `tests/agents/` | `pnpm test tests/agents/` |

### 3.3 E2E Tests

**Framework:** Playwright  
**Configuration:** `playwright.config.ts`

```bash
# Run all E2E tests
pnpm run test:e2e

# Desktop E2E
pnpm run test:desktop
```

### 3.4 Performance Tests

**Framework:** k6 / Artillery  
**Location:** `tests/load/`, `tests/performance/`

```bash
pnpm run test:performance:ci
```

---

## 4. Critical User Journeys

### 4.1 Authentication Flow

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to login page | Login form displayed |
| 2 | Enter valid credentials | Redirect to dashboard |
| 3 | Verify JWT token | Token contains user ID, org ID |
| 4 | Access protected route | Content displayed |
| 5 | Logout | Session cleared, redirect to login |

**Test File:** `tests/web/auth.test.ts`

### 4.2 Document Upload & RAG

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Upload PDF document | File stored in Supabase Storage |
| 2 | Document processed | Text extracted, chunks created |
| 3 | Embeddings generated | Vectors stored in pgvector |
| 4 | Search query | Relevant chunks returned |
| 5 | Citation in response | Source document linked |

**Test File:** `tests/rag/rag-readiness.test.ts`

### 4.3 CIT Computation (Malta)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Select tax entity | Entity loaded |
| 2 | Enter pre-tax profit | Amount validated |
| 3 | Add adjustments | Adjustments applied |
| 4 | Select refund profile | Rate calculated |
| 5 | Compute CIT | `chargeableIncome`, `citAmount`, `refundAmount` returned |
| 6 | Submit for approval | Approval workflow triggered |

**Test File:** `tests/tax/malta-cit.test.ts`

### 4.4 Journal Entry Workflow

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create journal batch | Batch ID returned |
| 2 | Add debit/credit lines | Lines inserted |
| 3 | Submit journal | Validation passed (DR = CR) |
| 4 | Approve journal | Manager approval recorded |
| 5 | Post journal | GL updated, status = POSTED |

**Test File:** `tests/accounting/journal-entry.test.ts`

### 4.5 Audit Planning

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Create audit engagement | Engagement created |
| 2 | Generate risk register | Risks populated |
| 3 | Define materiality | Thresholds set |
| 4 | Assign controls | Control mapping saved |
| 5 | Freeze audit plan | Status = FROZEN, Partner approval |

**Test File:** `tests/audit/audit-plan.test.ts`

### 4.6 AI Agent Execution

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Invoke orchestrator | Agent selected |
| 2 | Tool execution | Tool called with correct params |
| 3 | Response generation | Structured response with citations |
| 4 | Audit log | Execution recorded |
| 5 | Autonomy check | L2/L3 actions require approval |

**Test File:** `tests/agents/agent-execution.test.ts`

---

## 5. UAT Test Cases

### 5.1 Partner Role UAT

| ID | Scenario | Steps | Expected |
|----|----------|-------|----------|
| UAT-P01 | Lock accounting period | Navigate to Close → Select period → Lock | Period locked, no edits allowed |
| UAT-P02 | Release audit report | Navigate to Audit → Report → Release | Report marked as released |
| UAT-P03 | Approve CIT return | Review CIT → Approve | Status changes to APPROVED |

### 5.2 Manager Role UAT

| ID | Scenario | Steps | Expected |
|----|----------|-------|----------|
| UAT-M01 | Post journal entry | Create journal → Submit → Post | GL updated |
| UAT-M02 | Assign task | Create task → Assign to employee | Employee notified |
| UAT-M03 | Submit VAT return | Prepare VAT → Submit | Return filed |

### 5.3 Employee Role UAT

| ID | Scenario | Steps | Expected |
|----|----------|-------|----------|
| UAT-E01 | Upload PBC document | Documents → Upload → Select file | File uploaded to PBC folder |
| UAT-E02 | Create task | Tasks → New → Fill form → Save | Task created |
| UAT-E03 | Query AI assistant | Ask "What's next?" | Contextual actions returned |

### 5.4 Client Role UAT

| ID | Scenario | Steps | Expected |
|----|----------|-------|----------|
| UAT-C01 | View PBC folder | Navigate to Documents → PBC | Only PBC folders visible |
| UAT-C02 | Upload document | Upload to PBC folder | File accepted |
| UAT-C03 | Access denied test | Try to view internal docs | 403 Forbidden |

---

## 6. Regression Test Suite

### Nightly Regression

```yaml
# .github/workflows/ci.yml:301-360
schedule:
  - cron: '30 2 * * *'  # 2:30 AM daily
```

| Suite | Duration | Priority |
|-------|----------|----------|
| Unit tests | 5 min | High |
| Integration tests | 15 min | High |
| E2E smoke tests | 10 min | High |
| Performance baseline | 20 min | Medium |

### Pre-Release Regression

| Checkpoint | Tests | Pass Criteria |
|------------|-------|---------------|
| Build | `pnpm run build` | No errors |
| Lint | `pnpm run lint` | No errors |
| Unit | `pnpm run test` | 100% pass |
| Integration | `pytest tests/` | 100% pass |
| E2E | `pnpm run test:e2e` | 100% pass |
| Security | CodeQL + Gitleaks | No findings |

---

## 7. Test Data Requirements

### Seed Data

| Entity | Count | Location |
|--------|-------|----------|
| Organizations | 3 | `supabase/seed/` |
| Users | 10 | `supabase/seed/` |
| Tax Entities | 5 | `supabase/seed/` |
| Documents | 20 | `tests/fixtures/` |
| Engagements | 2 | `supabase/seed/` |

### Test Credentials

| Role | Email | Note |
|------|-------|------|
| Partner | `partner@test.prismaglow.com` | Full access |
| Manager | `manager@test.prismaglow.com` | Posting access |
| Employee | `employee@test.prismaglow.com` | Standard access |
| Client | `client@test.prismaglow.com` | Limited access |

---

## 8. Defect Management

### Severity Levels

| Level | Definition | SLA |
|-------|------------|-----|
| Critical | System unusable | 4 hours |
| High | Major feature broken | 24 hours |
| Medium | Feature impaired | 3 days |
| Low | Minor issue | Next sprint |

### Bug Report Template

```markdown
## Bug Report

**Title:** [Concise description]

**Severity:** [Critical/High/Medium/Low]

**Steps to Reproduce:**
1. 
2. 
3. 

**Expected Result:**

**Actual Result:**

**Environment:** [Staging/Production]

**Screenshots/Logs:**

**Test Case ID:** [If applicable]
```

---

## 9. Exit Criteria

### Go/No-Go Checklist

| Criteria | Required | Status |
|----------|----------|--------|
| Unit test pass rate | 100% | ⬜ |
| Integration test pass rate | 100% | ⬜ |
| E2E test pass rate | 100% | ⬜ |
| Critical bugs | 0 | ⬜ |
| High bugs | 0 | ⬜ |
| Medium bugs | ≤5 | ⬜ |
| Performance baseline met | Yes | ⬜ |
| Security scan clean | Yes | ⬜ |
| UAT sign-off | All roles | ⬜ |

---

## 10. Test Schedule

| Phase | Duration | Activities |
|-------|----------|------------|
| **Week 1** | 5 days | Unit test completion, integration test setup |
| **Week 2** | 5 days | E2E test execution, performance baseline |
| **Week 3** | 5 days | UAT execution with real users |
| **Week 4** | 3 days | Bug fixes, regression, sign-off |

---

## 11. Automation Scripts

### Run Full Test Suite

```bash
#!/bin/bash
set -e

echo "🧪 Running unit tests..."
pnpm run test

echo "🔗 Running integration tests..."
cd server && pytest tests/

echo "🌐 Running E2E tests..."
pnpm run test:e2e

echo "🔒 Running security checks..."
pnpm run lint
gitleaks detect --source .

echo "✅ All tests passed!"
```

### CI Test Commands

```yaml
# pnpm scripts from package.json
test: turbo test
test:e2e: turbo test:e2e
test:desktop: playwright test --project=desktop-e2e
test:desktop:unit: vitest run tests/desktop/unit
test:tauri: cd src-tauri && cargo test
```

---

## 12. Contacts

| Role | Name | Responsibility |
|------|------|----------------|
| QA Lead | TBD | Test strategy, UAT coordination |
| Dev Lead | TBD | Bug triage, fix prioritization |
| Product Owner | TBD | UAT sign-off |
| Security | TBD | Security test validation |

---

*QA/UAT Plan maintained as living document. Update after each release cycle.*
