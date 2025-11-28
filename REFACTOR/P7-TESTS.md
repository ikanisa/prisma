# P7: Testing Strategy Validation

## Overview
Complete testing infrastructure guide covering 6 test types with quality gates.

**Test Types:** Unit (Vitest, pytest), Integration, E2E (Playwright), Performance (Artillery, k6), Accessibility (axe-core), PWA (Lighthouse)

**Quality Gates:**
- JS Coverage: 45/40/45/45 (statements/branches/functions/lines)
- Python Coverage: 60%
- Lighthouse: ≥90 all categories
- axe-core: 0 critical violations

## Unit Tests

**JavaScript (Vitest):**
```bash
pnpm run test
pnpm run coverage
```

**Python (pytest):**
```bash
pytest
pytest --cov=server --cov-report=html
```

## E2E Tests (Playwright)
```bash
pnpm exec playwright test
pnpm exec playwright test tests/playwright/core-journeys.spec.ts
```

## Performance Tests
```bash
pnpm run test:performance
pnpm exec artillery run tests/performance/agent_journeys.test.yml
```

## Accessibility Tests
```typescript
import { axe, toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);

test('no accessibility violations', async () => {
  const { container } = render(<Component />);
  expect(await axe(container)).toHaveNoViolations();
});
```

## PWA Tests
```bash
pnpm exec lighthouse https://app.prismaglow.com --view
```

**Version:** 1.0.0 (2025-11-02)
