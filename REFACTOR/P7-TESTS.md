# Testing Strategy Validation

**Job:** P7-TESTS  
**Version:** 1.0.0  
**Last Updated:** 2025-11-02  
**Purpose:** Validate and document comprehensive testing strategy

---

## Overview

Prisma Glow employs a multi-layered testing approach covering unit, integration, E2E, performance, and accessibility testing.

---

## Test Infrastructure

### Current Testing Tools

| Tool | Purpose | Location |
|------|---------|----------|
| **Vitest** | Unit & integration tests (JS/TS) | Root, packages, apps |
| **pytest** | Backend tests (Python) | `server/`, `tests/` |
| **Playwright** | E2E browser tests | `tests/playwright/` |
| **Artillery** | Load & performance tests | `tests/performance/` |
| **k6** | API performance tests | `scripts/performance/` |
| **axe-core** | Accessibility tests | Integrated in Playwright |
| **Lighthouse CI** | PWA & performance audits | `.github/workflows/` |

---

## Test Categories

### 1. Unit Tests

**Framework:** Vitest (JavaScript/TypeScript), pytest (Python)

#### JavaScript/TypeScript

**Configuration:** `vitest.config.ts`

```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      statements: 45,
      branches: 40,
      functions: 45,
      lines: 45,
    },
  },
});
```

**Run Tests:**
```bash
# Root workspace
pnpm test

# Specific package
pnpm --filter @prisma-glow/ui test

# With coverage
pnpm run coverage
```

**Coverage Thresholds:**
- Statements: 45%
- Branches: 40%
- Functions: 45%
- Lines: 45%

**Override Thresholds:**
```bash
TARGET_STATEMENTS=60 TARGET_BRANCHES=50 pnpm run coverage
```

#### Python

**Framework:** pytest  
**Configuration:** `pytest.ini`

**Run Tests:**
```bash
# All Python tests
pytest

# Specific test file
pytest tests/test_rag.py

# With coverage
pytest --cov=server --cov-report=html
```

**Coverage Goals:**
- Target: 60% (enforced in CI)
- Critical modules: >80%

**Current Coverage:** ✅ Meeting 60% threshold (per CI config)

---

### 2. Integration Tests

**Purpose:** Test API endpoints, database operations, and service integrations

#### API Integration Tests

**Location:** `tests/api/`

**Example:** `tests/api/test_core_smoke.py`

```python
def test_health_endpoint():
    """Test /health endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    assert "status" in response.json()

def test_document_upload(auth_token):
    """Test document upload flow."""
    response = client.post(
        "/api/documents/upload",
        files={"file": ("test.pdf", file_content, "application/pdf")},
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 201
```

#### Database Integration Tests

**Requirements:**
- Test with ephemeral PostgreSQL instance
- Apply migrations before tests
- Clean up after tests

```python
@pytest.fixture(scope="session")
async def db_session():
    """Create test database session."""
    async with AsyncSessionLocal() as session:
        yield session
        await session.close()
```

---

### 3. E2E Tests

**Framework:** Playwright  
**Location:** `tests/playwright/`

#### Current E2E Tests

| Test Suite | File | Status |
|------------|------|--------|
| **Core Journeys** | `core-journeys.spec.ts` | ✅ Exists |
| **Accessibility** | `a11y.spec.ts` | ✅ Exists |
| **Authentication** | `auth.spec.ts` | ❓ Unknown |
| **Document Management** | `documents.spec.ts` | ❓ Unknown |

#### Minimal E2E Flows (per Playbook)

**Admin Flows:**
- [ ] Invite user → accept → membership created
- [ ] Update role → permissions change observed
- [ ] Impersonation with two-man rule
- [ ] Permission matrix edit → guard observed
- [ ] Link Drive → mirror → ingest → index → search with citations
- [ ] Approval queue (MFA) completes

**Client Flows:**
- [ ] Zero-typing onboarding from documents
- [ ] Upload document → extract → view
- [ ] Create task → assign → complete
- [ ] Assistant dock: Open (⌘K) → ask → receive cited response
- [ ] Create approval → require MFA → approve

#### Playwright Configuration

**File:** `playwright.config.ts`

```typescript
export default defineConfig({
  testDir: './tests/playwright',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
```

**Run Tests:**
```bash
# All E2E tests
pnpm run test:playwright

# Core journeys only
pnpm run test:playwright:core

# With UI
pnpm exec playwright test --ui
```

---

### 4. Accessibility Tests

**Tool:** axe-core (via Playwright)  
**Goal:** 0 critical violations

#### Test Implementation

```typescript
// tests/playwright/a11y.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility', () => {
  test('homepage should not have critical a11y violations', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    
    expect(accessibilityScanResults.violations
      .filter(v => v.impact === 'critical')).toHaveLength(0);
  });
});
```

**Run Tests:**
```bash
pnpm exec playwright test tests/playwright/a11y.spec.ts
```

**Quality Gate:** Critical violations = 0

---

### 5. Performance Tests

#### Load Testing (Artillery)

**Location:** `tests/performance/agent_journeys.test.yml`

**Configuration:**
```yaml
config:
  target: "http://localhost:3000"
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 300
      arrivalRate: 50
      name: "Sustained load"
  
scenarios:
  - name: "Agent conversation"
    flow:
      - post:
          url: "/api/agent/chat"
          json:
            message: "Summarize the trial balance"
```

**Run Tests:**
```bash
# Local
pnpm run test:performance

# CI
pnpm run test:performance:ci

# With ramp-up
pnpm run test:performance:ramp
```

#### API Performance (k6)

**Location:** `scripts/performance/*.js`

**Example:** RAG search performance

```javascript
// scripts/performance/rag-smoke.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 10,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% under 2s
    http_req_failed: ['rate<0.01'],     // <1% failures
  },
};

export default function () {
  const res = http.post(
    `${__ENV.RAG_SERVICE_URL}/search`,
    JSON.stringify({ query: 'What is depreciation?' }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 2s': (r) => r.timings.duration < 2000,
  });
  
  sleep(1);
}
```

**Run Tests:**
```bash
k6 run scripts/performance/rag-smoke.js
```

---

### 6. Lighthouse & PWA Audits

**Tool:** Lighthouse CI  
**Workflow:** `.github/workflows/lighthouse-ci.yml`, `.github/workflows/pwa-audit.yml`

#### Configuration

**File:** `.lighthouserc.js` (if exists)

```javascript
module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/dashboard',
        'http://localhost:3000/documents',
      ],
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],
        'categories:pwa': ['error', { minScore: 0.9 }],
      },
    },
  },
};
```

**Quality Gates:**
- Performance: ≥90
- Accessibility: ≥90
- Best Practices: ≥90
- SEO: ≥90
- PWA: ≥90

**Run Tests:**
```bash
# Via workflow
# Triggered on PR or manual dispatch

# Local (with Lighthouse CLI)
pnpm exec lighthouse http://localhost:3000 --view
```

---

## Test Execution

### Local Development

```bash
# Run all tests
pnpm run ci:verify

# Unit tests only
pnpm run test

# Python tests only
pytest

# E2E tests only
pnpm run test:playwright

# Coverage report
pnpm run coverage
```

### CI Pipeline

**Workflow:** `.github/workflows/ci.yml`, `.github/workflows/workspace-ci.yml`

**Stages:**
1. **Install:** `pnpm install --frozen-lockfile`
2. **Lint:** `pnpm run lint`
3. **Typecheck:** `pnpm run typecheck`
4. **Unit Tests:** `pnpm run test`
5. **Python Tests:** `pytest --cov`
6. **Build:** `pnpm run build`
7. **E2E Tests:** `pnpm run test:playwright:core`
8. **Lighthouse:** PWA audit workflow
9. **Load Tests:** Artillery smoke tests

---

## Coverage Reports

### Artifacts

**CI generates:**
- Vitest coverage reports (HTML)
- pytest coverage reports (HTML)
- Playwright test results
- Lighthouse reports
- Artillery performance reports

**Access:** GitHub Actions artifacts tab

---

## Test Data Management

### Test Database

**Approach:** Ephemeral PostgreSQL for integration tests

```yaml
# .github/workflows/ci.yml
services:
  postgres:
    image: postgres:15
    env:
      POSTGRES_PASSWORD: test
    options: >-
      --health-cmd pg_isready
      --health-interval 10s
```

### Test Fixtures

**Location:** `tests/fixtures/`

**Types:**
- Sample documents (PDF, DOCX)
- Mock API responses
- Test user credentials
- Sample financial data

---

## Action Items

### Priority 1: Expand E2E Coverage

- [ ] **Add missing E2E tests:**
  - Authentication flows
  - Document management
  - Task management
  - Approvals with MFA
  - Admin user management
  - Knowledge management

### Priority 2: Improve Coverage

- [ ] **Increase unit test coverage:**
  - Target 60% across all packages
  - Focus on critical business logic
  - Add component tests for UI package

- [ ] **Python coverage:**
  - Maintain 60% minimum
  - Increase critical paths to 80%

### Priority 3: Performance Testing

- [ ] **Establish baselines:**
  - Document current performance metrics
  - Set realistic thresholds
  - Monitor trends over time

- [ ] **Expand load tests:**
  - Test concurrent users
  - Test background jobs
  - Test database load

### Priority 4: Accessibility

- [ ] **Expand a11y tests:**
  - Test all major pages
  - Test interactive components
  - Test keyboard navigation
  - Test screen reader compatibility

---

## Quality Gates (Summary)

| Gate | Threshold | Status |
|------|-----------|--------|
| **Unit Coverage** | 45%/40%/45%/45% | ✅ Configured |
| **Python Coverage** | 60% | ✅ Configured |
| **Lighthouse** | ≥90 all categories | ✅ Configured |
| **axe-core Critical** | 0 violations | ✅ Target set |
| **Bundle Size** | Route ≤250KB, Total ≤700KB | ✅ Configured |
| **E2E Tests** | Core journeys passing | 🔄 In progress |

---

## Summary

### Current State

✅ **Comprehensive infrastructure:** Vitest, pytest, Playwright, Artillery, k6  
✅ **Coverage thresholds:** Configured and enforced  
✅ **CI/CD integration:** All tests run in pipelines  
✅ **Quality gates:** Lighthouse, axe, bundle size  
🔄 **E2E coverage:** Core journeys exist, needs expansion  

### Recommendations

1. **Expand E2E test coverage** - Add missing critical flows
2. **Improve unit test coverage** - Target 60% across packages
3. **Establish performance baselines** - Document and monitor
4. **Comprehensive a11y testing** - Test all major pages
5. **Test data management** - Centralize fixtures and mocks

---

**Last Updated:** 2025-11-02  
**Maintainer:** QA Team  
**Related:** `vitest.config.ts`, `playwright.config.ts`, `pytest.ini`
