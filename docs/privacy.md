# Privacy & Consent

This app supports a cookie consent banner and opt-in tracking when `VITE_TRACKING_ENABLED=true`.

Behavior
- When tracking is enabled and the user has not made a choice, a consent banner appears at the bottom of the screen.
- Users can Accept or Reject non-essential cookies.
- The decision is stored in `localStorage` under `cookieConsent` (`accepted` or `rejected`).
- Analytics/telemetry integrations must check the consent value before emitting optional tracking.

Implementation
- Hook: `src/hooks/use-consent.ts`
- UI: `src/components/privacy/CookieConsent.tsx`
- Integration: rendered globally in `src/App.tsx`

Configuration
- `VITE_TRACKING_ENABLED` (default `true` in example files) controls whether the banner is shown.
- Set to `false` to disable the banner and any optional tracking for a given environment.

Validation
- See `GO-LIVE/artifacts/privacy-consent.md` for the checklist and evidence to capture before production.

