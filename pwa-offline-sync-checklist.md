# PWA Offline & Sync Checklist

## Manifest & Installability
- [ ] `manifest.json` includes name, icons, theme, background color, and start URL
- [ ] Display mode set to `standalone` with orientation preferences captured
- [ ] Maskable icons provided for Android/Chrome install surfaces

## Service Worker
- [ ] Generated via Workbox with cache-first for static assets, network-first for APIs
- [ ] Stale-while-revalidate strategy for user-generated content
- [ ] Versioned cache names with cleanup of obsolete caches
- [ ] Background sync queue configured for draft journal entries and approvals

## Offline Data Strategy
- [ ] IndexedDB schema defined with migration plan
- [ ] Conflict resolution policy documented (deterministic merge rules)
- [ ] Sync telemetry emitted for success/failure with trace IDs

## Testing
- [ ] Playwright/Lighthouse offline tests pass for Staff and Admin flows
- [ ] Snapshot tests cover service worker routing and cache manifests
- [ ] Manual QA scenarios: cold install, soft reload, offline submission, recovery

## User Experience
- [ ] Offline banners and retry UX localized across supported languages
- [ ] Push notification consent surfaces comply with privacy policy
- [ ] Sync status indicators accessible (WCAG 2.1 AA)
