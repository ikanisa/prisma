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
