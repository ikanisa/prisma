# Security & Privacy Checklist

_Last updated: 2025-11-04_

## Security Controls
- [x] Content Security Policy and CORS origin allow-list enforced in FastAPI middleware.
- [x] Trusted host middleware prevents host header injection.
- [x] JWT auth flow validated with structured role hierarchy checks.
- [ ] Complete Sentry release drill and attach alert transcript.
- [ ] Rotate Supabase service role key and record rotation evidence.

## Privacy Controls
- [x] Cookie consent component surfaced on initial load with explicit opt-in tracking.
- [x] Privacy notice linked from footer and onboarding surfaces.
- [x] Document signing flow enforces least-privilege via Supabase policies.
- [ ] Finalise data retention schedule for offline queue payloads.

## Evidence to Attach
- FastAPI security configuration snapshot (`server/main.py`).
- Cookie consent capture (`src/components/privacy/CookieConsent.tsx`).
- Supabase storage policy migration hash + negative test log.
- Sentry drill output (release tag + PagerDuty notification screenshot).
