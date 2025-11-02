# PWA Offline & Sync Checklist

Use this checklist to validate the offline experience for the staff and admin apps before each release.

## Build & Registration
- [ ] Build each app and confirm `service-worker.ts` compiles without type errors.
- [ ] Verify the Workbox service worker registers successfully and precaches the offline fallback page.
- [ ] Confirm `SKIP_WAITING` messages trigger immediate activation during smoke tests.

## Runtime Caching
- [ ] Validate navigation requests fall back to the network-first cache strategy when offline.
- [ ] Ensure static assets (scripts/styles) use a stale-while-revalidate policy and update on refresh.
- [ ] Confirm media assets honor cache eviction rules (30 days for staff, 14 days for admin).

## Offline Draft Storage
- [ ] Run `pnpm exec playwright test --project staff-offline` to validate staff IndexedDB draft flows.
- [ ] Run `pnpm exec playwright test --project admin-offline` to validate admin IndexedDB draft flows.
- [ ] Manually queue a draft change, reload offline, and confirm the draft persists.

## Sync & Conflict Resolution
- [ ] Trigger a remote update and verify deterministic merges prefer the most recent metadata.
- [ ] Inspect conflict logs to ensure `winner` fields surface for product analytics.
- [ ] After a successful sync, confirm clean drafts are removed from pending queues.

## Regression Tests
- [ ] Execute `pnpm exec playwright test --project web-ui` to cover the baseline UI journeys.
- [ ] Capture a Lighthouse PWA audit for each app to track installability and offline readiness.
