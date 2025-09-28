# Test & Record Required

Playwright smoke tests must be recorded before CI can run them unattended.

1. On a workstation with Playwright installed and internet access, run:
   ```bash
   npx playwright codegen https://staging.example.com
   ```
2. Capture the desired smoke flows and save the generated actions into
   `tests/playwright/smoke.spec.ts` (or extend the existing file).
3. Verify locally with `npm run test:playwright`.
4. Remove this file once recording is complete.

Thanks,
XO
