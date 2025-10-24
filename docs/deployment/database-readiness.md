# Database Readiness Checklist – Phase 3

Use this list to confirm the Supabase project is ready for Prisma migrations and pgvector workloads.

## 1. Extension & Version Checks
- [ ] Connect to the project (`psql "$DATABASE_URL"`).
- [ ] Verify pgvector: `SELECT extname FROM pg_extension WHERE extname = 'vector';`
- [ ] Confirm Postgres version ≥ 15 (`SHOW server_version;`).

## 2. Prisma Migration Workflow
- [ ] `pnpm --filter web prisma migrate deploy`
- [ ] `pnpm --filter web prisma db pull`
- [ ] `pnpm --filter web prisma generate`
- [ ] Record output hashes in the deployment ticket.

## 3. Supabase CLI Sync
- [ ] `supabase db push` (should apply migrations added in this repo).
- [ ] `supabase db pull` (regenerate remote schema snapshot).
- [ ] Store updated `supabase/migrations/*` artefacts under version control.

## 4. Connection Secrets
- [ ] Rotate `DATABASE_URL`/`DIRECT_URL` secrets in Vercel & GitHub Actions if credentials changed.
- [ ] Confirm Supabase pooler (if used) allows migrations (set `transactional` mode).

Attach logs/commands when each step completes; this file serves as audit evidence for Phase 3.
