Accessibility Audit Report (axe + keyboard)

Scope
- Tasks page (`/tasks`)
- Documents page (`/documents`)
- Onboarding (`/onboarding`)
- Autopilot & assistant dock (`/autopilot`)

Automated checklist
- [ ] Run `npx playwright test tests/playwright/a11y.spec.ts`
- [ ] Verify `GO-LIVE/artifacts/a11y-axe-report.json` contains zero serious/critical violations

Manual checklist
- [ ] Tab/Shift+Tab reaches all critical controls
- [ ] No keyboard traps; dialogs close with <kbd>ESC</kbd>
- [ ] Color contrast acceptable on key flows
- [ ] Form inputs have accessible labels

Findings
- Summary: _(fill after run)_

Notes
- Attach axe report, screenshots, and manual notes here.
