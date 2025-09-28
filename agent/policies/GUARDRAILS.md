# Agent Guardrails (prisma-glow-15)

## Core Principles
- Additive-only changes unless explicitly authorized.
- Respect agent/policies/ALLOWLIST.json.
- Never touch or log secrets (.env*, tokens, keys).
- DB changes go only via supabase/migrations/.
- Always open a PR; never push to main.
- If something fails, try the next safe option and note what you tried.

## Safe Operating Rules
- Git: feature branches feat/<short-slug>.
- CI must pass before merge.
- Add/update ADRs in docs/ for notable changes.
- Prefer `supabase db diff` for migration files.

## Review Gates
- Schema changes need a human reviewer.
- No auto-merge if CI fails.

## Communication
- PR must include plan, file list, test notes, and rollback idea.

