# Audit Changelog

## Date
2025-09-21

## Branch Hygiene
- Checked out `main`, fetched remotes, confirmed `origin/main` up to date.
- Did **not** merge any open PRs: 22 PRs (Dependabot + `codex/*`) remain open. They require manual triage/CI before merging; see Executive Summary.
- Created temporary stashes (`pre-audit-existing-work`, `pre-audit-untracked`) to ensure a clean tree; stashes remain for the owner to reapply as needed (`git stash list`).

## Commands Executed
| Command | Notes |
| --- | --- |
| `npm ci` | Completed with warnings about `multer@1.4.5-lts.2` deprecation; 2 moderate vulnerabilities remain (`esbuild`). |
| `npm run build` | Succeeded; Vite reports 920 kB main chunk (code-splitting recommended). |
| `npm run lint` | 12 warnings (React fast-refresh exports, missing hook dependencies). |
| `npm audit --production` | 2 moderate vulnerabilities (esbuild via Vite). |
| `npx tsc --noEmit` | Passed. |
| `pytest` | All 5 Python tests passed. |

## Files Added
- `AUDIT/EXECUTIVE_SUMMARY.md`
- `AUDIT/FULLSTACK_AUDIT_REPORT.md`
- `AUDIT/REFACTOR_PLAN.md`
- `AUDIT/CHANGELOG_AUDIT.md`

## Noteworthy Findings
- Supabase anon key exposed in `src/integrations/supabase/client.ts`.
- Backend services (`server/main.py`, `services/rag/index.ts`) unauthenticated.
- Document workflow UI is non-functional; storage bucket absent.

## Next Steps
- Triage open PR backlog before further feature work.
- Action Phase 1 tasks from refactor plan (issues filed separately).
