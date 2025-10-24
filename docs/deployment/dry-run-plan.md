# Deployment Dry Run & Postgres Upgrade Plan

## Vercel Dry Run
1. Create a release branch (`release/<date>`).
2. Run CI (`pnpm lint`, `pnpm test`, `pnpm --filter web prisma migrate deploy` against staging DB).
3. Trigger Vercel preview deployment; run smoke suite:
   - Frontend Playwright smoke
   - API smoke (`OPENAI_API_KEY=dummy pytest tests/api/test_core_smoke.py`)
   - CAPTCHA + invite flow (test Turnstile + SMTP in staging).
4. Record Lighthouse/PWA artefacts under `GO-LIVE/artifacts/`.
5. Capture `/api/release-controls/check` output and attach to ticket.

## Postgres Upgrade Window
- Target window: Week 3, Saturday 08:00–10:00 UTC.
- Steps:
  1. Enable maintenance mode banner in app.
  2. Snapshot database (Supabase PITR bookmark).
  3. Perform version upgrade via Supabase dashboard.
  4. Run `supabase db push` + `supabase db pull` to re-sync.
  5. Validate migrations, RLS policies, and edge functions.
  6. Smoke test APIs/UI before restoring full traffic.
- Notify stakeholders 48 hours in advance; include rollback plan referencing `docs/backup-restore.md`.
