# Job: Bootstrap Repo Blueprint & Sanity (prisma-glow-15)

## Goal
Ensure the repo follows the standard blueprint so agent workflows (planning, PRs, CI) run smoothly.

## Constraints
- Additive-only; do not delete or rewrite existing working code.
- Allowed paths only (see agent/policies/ALLOWLIST.json).

## Steps (Agent)
1) Verify required folders exist:
   - app/, packages/, supabase/{migrations,seed}/, agent/{tools,policies}/, .github/workflows/, docs/, .changeset/
2) Ensure policy files exist:
   - agent/policies/ALLOWLIST.json
   - agent/policies/GUARDRAILS.md
3) Ensure CI & housekeeping exist:
   - .github/workflows/ci.yml
   - .github/dependabot.yml
   - .gitignore
4) Supabase (if used):
   - Check supabase/config.toml exists (do not start services).
   - Note chosen ports in PR body if created/updated.
5) Documentation:
   - If missing, create docs/README.md & docs/ADR_TEMPLATE.md; update docs/DECISIONS.md with:
     “Initialized repo blueprint and agent guardrails (prisma-glow-15).”
6) PR:
   - Title: "chore(prisma-glow-15): ensure repo blueprint + agent guardrails"
   - Include checklist and “What changed / Why”.
   - Add rollback suggestion (revert commit).

## Acceptance
- CI green.
- Reviewer verifies files present and no destructive edits.

