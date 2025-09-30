# Bundle Performance Budgets

Budgets are enforced in CI to keep bundles lean and predictable.

Checks
- Post-build script gzips each JS asset in `dist/assets/` and enforces:
  - Main entry (`index-*.js`) ≤ 300 kB gz
  - All other chunks ≤ 250 kB gz

Configuration
- Script: `scripts/check_bundlesize.mjs`
- CI step: `.github/workflows/ci.yml` → "Enforce bundle budgets"
- Override thresholds via env:
  - `BUNDLE_MAX_MAIN_GZ_KB`
  - `BUNDLE_MAX_CHUNK_GZ_KB`

Usage
```bash
npm run build
npm run check:bundle
```

Adjust thresholds sparingly and document rationale in PRs to avoid regressions.

