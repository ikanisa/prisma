# Test Plan

## Table of Contents
- [Testing Pyramid](#testing-pyramid)
- [Fixtures and Mocks](#fixtures-and-mocks)
- [Running Tests](#running-tests)
- [CI Matrix](#ci-matrix)

## Testing Pyramid
1. **Unit Tests**: Components, hooks, util functions using Vitest and Testing Library.
2. **Integration Tests**: Supabase edge functions, n8n workflows with mocked external services.
3. **End-to-End Tests**: User flows via Playwright hitting staging n8n & Supabase.

## Fixtures and Mocks
- **OpenAI**: Mock with `nock` or custom fetch wrapper returning deterministic responses.
- **Google Sheets**: Use `googleapis` mock or local JSON to emulate sheet operations.
- **Supabase**: Use `@supabase/supabase-js` with local test instance or mocking.

## Running Tests
```bash
# install dependencies
npm ci

# run unit tests
npm test

# run integration tests
npm run test:integration

# run e2e
npm run test:e2e
```

## CI Matrix
| Node Version | OS |
|---|---|
| 20.x | ubuntu-latest |

Include steps: `npm ci`, `npm run lint`, `npm test`, integration tests behind flag, `npm audit --omit=dev`, and artifact test reports.

