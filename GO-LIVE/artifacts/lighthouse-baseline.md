# Lighthouse baseline (desktop)

- **Command**
  ```bash
  pnpm run build
  pnpm dlx http-server dist --port 4173
  CHROME_PATH=/root/.cache/ms-playwright/chromium-1194/chrome-linux/chrome \
    pnpm dlx lighthouse http://127.0.0.1:4173 \
      --preset=desktop \
      --chrome-flags="--headless --no-sandbox" \
      --output=json --output=html \
      --output-path=GO-LIVE/artifacts/lighthouse-baseline
  ```
- **Artifacts**: `lighthouse-baseline.report.json`, `lighthouse-baseline.report.html`
- **Chrome binary**: Playwright Chromium build 1194
- **Run warning**: `NO_FCP` – the page did not produce a first contentful paint under headless Chromium. The JSON + HTML reports were still captured for traceability and require follow-up to diagnose the blank paint.

The generated reports live alongside this note for go-live documentation. Investigate the missing FCP prior to release to ensure Lighthouse scoring is meaningful.
