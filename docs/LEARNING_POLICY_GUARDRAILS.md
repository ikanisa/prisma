# Learning Policy Guardrails

This guide defines the non-negotiable guardrails that govern Reinforced RAG updates.

## Safety Rules

- **Statute-first**: Answers prioritize statutes/regulations/gazettes. Secondary sources are only
  used when no primary source is available.
- **Cite-or-refuse**: Every answer must cite an allowlisted authority. If none exists, the agent must
  refuse.
- **HITL for high-risk**: Topics flagged as high risk require human approval before delivery.

## Privacy & Data Isolation

- No base-model fine-tuning on tenant data.
- Learning occurs at retrieval/policy layers only.
- Per-org opt-in is required before private corpora influence hints or synonyms; data remains isolated
  per tenant.
- France-mode prohibits judge analytics and magistrate re-identification.

## Jurisdictional Fidelity

- OHADA rules supersede national law for covered contexts (CCJA priority).
- Maghreb jurisdictions must display language binding banners when translations are used.
- Canada (QC) responses must respect bilingual equality; Rwanda tri-language triage enforced.

## Guardrail Actions

- Allowlist precision < 0.95 (last 200 runs) → tighten prompts, add `site:` hints, increase refusal
  thresholds for T4-only content.
- Temporal validity < 0.95 or stale link rate > 1% → auto-add temporal filters, escalate link checks.
- HITL recall < 0.98 → enforce stricter gating for sensitive topics.

Diagnoser jobs land in `agent_learning_jobs` with status `PENDING`; reviewers must approve via
`POST /api/learning/approve` or the Admin UI before the applier runs them. Rollbacks are available through
`POST /api/learning/rollback` and the nightly evaluate-and-gate job.

Actions map to `agent_learning_jobs` types (`guardrail_tune`, `query_hint_add`, `denylist_update`,
`canonicalizer_update`).

## Policy Versioning

Every change must:

1. Create a new row in `agent_policy_versions` with author + rationale.
2. Attach structured diffs (synonym deltas, hint weights, canonicalizer patterns).
3. Capture approvals (`/api/learning/approve`) with reviewer identity and timestamp.
4. Surface in the UI diff viewer for compliance audit.

## Rollback Protocol

- If gating evaluations fail, the nightly `evaluate-and-gate` job triggers an automatic rollback to
  the previous approved policy version and emits alerts (pager + Slack).
- Manual rollback requires `/api/learning/rollback` with policy_version_id and admin role.
- After rollback, the system pauses new applications until metrics recover.

## Audit Trail

- All learning changes are logged in `agent_policy_versions` + `learning_metrics` snapshots.
- `learning_signals` retains raw inputs for at least 30 days (configurable retention).
- `ops/report-learning.ts` can export current synonyms/hints/denylist/canonicalizer for review.

## Non-allowable Changes

- Any update that expands scope beyond allowlisted sources without explicit approval from Security.
- Adjusting case-score axis weights beyond ±0.03 per policy version (OHADA SA axis ≥ 0.30 floor).
- Introducing new external endpoints without verifying allowlist coverage and temporal validity.
