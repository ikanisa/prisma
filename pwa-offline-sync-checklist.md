# PWA & Offline Sync Checklist

_Last updated: 2025-11-04_

## Service Worker
- [x] Precache manifest includes shell, icons, and manifest resources.
- [x] Background sync queue stores jobs in IndexedDB with bounded retries.
- [ ] Validate sync replay against staging API after simulated outage.
- [ ] Capture browser console trace (Chrome DevTools) showing successful sync replay.

## Client Queue
- [x] Offline queue normalises headers + payloads before persistence.
- [x] Exponential backoff configured for client retries with 12h cap.
- [ ] Document retention policy for queued payloads and purge cadence.

## User Experience
- [x] Install prompt available via PWA install hook.
- [ ] Provide support runbook for offline troubleshooting scenarios.

## Evidence to Attach
- `public/service-worker.js` snapshot with cache + background sync configuration.
- `src/utils/pwa.ts` snippet demonstrating retry/backoff behaviour.
- API smoke run log showing replayed queued actions.
