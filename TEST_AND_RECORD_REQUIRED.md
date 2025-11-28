# Test & Record Required

Playwright smoke tests are already scaffolded and runnable in CI. To tailor coverage to your environment, configure the base URL and paths.

Quick start

1. Set the base URL and desired paths (comma‑separated):
   ```bash
   export PLAYWRIGHT_BASE_URL="https://staging.example.com"
   export PLAYWRIGHT_SMOKE_PATHS="/, /login, /telemetry/dashboard"
   npm run test:playwright
   ```
2. To extend flows, you can still record snippets locally and paste them into `tests/playwright/smoke.spec.ts`:
   ```bash
   npx playwright codegen "$PLAYWRIGHT_BASE_URL"
   ```
3. CI picks up `PLAYWRIGHT_BASE_URL` and `PLAYWRIGHT_SMOKE_PATHS` from repository secrets; see `.github/workflows/ci.yml`.

Thanks,
XO
