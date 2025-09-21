# Go-Live Gate Checklist

## Blocking Items (must be green)
- [ ] Keys rotated within last 7 days (Supabase, OpenAI, storage).
- [ ] Supabase RLS verified and tested (see `supabase/rls/agents_001.sql`).
- [ ] Storage buckets set to private; signed URL TTL validated.
- [ ] Rate limits enforced on write endpoints (`services/rag/index.ts` throttle).
- [ ] Standards traceability matrix ≥ 30 rows with live evidence (`STANDARDS/TRACEABILITY/matrix.md`).
- [ ] Acceptance scripts executed with evidence archived (`/ACCEPTANCE/*.md`).
- [ ] Red-team suite executed with all refusals/approvals as expected (`STANDARDS/SAFETY/red_team_cases.md`).
- [ ] Performance SLI targets met (see `/PERF/targets.md`).
- [ ] Telemetry dashboard green (sessions, approvals age, groundedness within targets).
- [ ] Runbooks and learning docs updated (Perf, Learning pipeline).

## Non-Blocking (track, but not launch blockers)
- [ ] Outstanding feature requests triaged.
- [ ] UI polish items documented.
- [ ] Future roadmap items logged post-launch.

## Sign-Off
- **Operations Director:** __________________ Date ______
- **QMS Lead:** __________________ Date ______
- **AI Safety Lead:** __________________ Date ______

