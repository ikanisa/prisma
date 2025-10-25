# PWA Verification Notes

Commands to reproduce:

```bash
npm run build
npx http-server dist --port 4173
# In another terminal (Chrome required)
npx --yes lighthouse http://localhost:4173 --preset=pwa --output=json --output-path=./GO-LIVE/artifacts/lighthouse-report.json
npx --yes @axe-core/cli http://localhost:4173 --timeout 60000 --exit
```

Record the Lighthouse JSON/HTML artifacts and screenshots in this directory
before the production deployment sign-off. The current environment does not
ship Chrome, so the commands above must be executed locally or in CI.

## Baseline captured

- Desktop preset executed headless via Playwright Chromium (`build 1194`).
- Artifacts live in `GO-LIVE/artifacts/lighthouse-baseline.report.json` and
  `.report.html`; see `lighthouse-baseline.md` for run context.
- Current run emitted a `NO_FCP` warning (page failed to paint); follow-up is
  required to restore measurable scores before release.
