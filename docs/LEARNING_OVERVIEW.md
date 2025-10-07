# Reinforced RAG Learning Loop Overview

This document summarizes the Reinforced RAG system for Avocat-AI Francophone. It covers the
end-to-end data flow, the learning targets, and the interfaces required for operators and
stakeholders.

## Architecture Stages

1. **collect_signals** – capture telemetry from agent runs, citation checks, tool failures, HITL
   decisions, ingestion issues, and user feedback.
2. **diagnose_gaps** – aggregate metrics per jurisdiction/topic and detect SLO regressions.
3. **generate_tickets** – create `agent_learning_jobs` with actionable intents (synonyms, guardrails,
   canonicalizer updates, denylist adjustments).
4. **apply_changes** – act on approved jobs, version policies (`agent_policy_versions`), and publish
   diffs.
5. **evaluate_and_gate** – execute golden-set evaluations and rollback if any gating metric falls
   below thresholds.

Signal sources include `agent_runs`, `run_citations`, `tool_telemetry`, `hitl_queue`, `case_scores`
+ overrides, ingestion manifests/quarantine, and `/api/learning/feedback` submissions.

## Learning Targets

- Retrieval relevance: synonyms, query hints, semantic expansions per jurisdiction/topic.
- Jurisdiction routing: OHADA priority, Maghreb binding-language banners, bilingual handling.
- Guardrails: allowlist hints, sensitive-topic HITL escalation, refusal thresholds.
- Citation quality: canonical links (ELI/ECLI), link-health, consolidation state.
- Case scoring: bounded weight adjustments with audit trail.
- Calculators: bounded rule-table updates with reviewer approval.

## Data Schema

New tables introduced for learning:

- `learning_signals`: raw signal payloads with org scope and metadata.
- `learning_metrics`: aggregated metrics (window, metric, dims).
- `query_hints`: jurisdiction/topic-specific hints with weights and policy versions.
- `citation_canonicalizer`: pattern replacements for citations.
- `denylist_deboost`: patterns for deny/deboost actions with policy versioning.

Existing tables such as `agent_synonyms`, `agent_policy_versions`, and `agent_learning_jobs`
complete the loop. All org-scoped data uses RLS with `public.is_member_of` and `public.has_min_role`.

## Jobs & Schedulers

| Job | Cadence | Purpose |
| --- | --- | --- |
| `learning-collector` | `*/10 * * * *` | Normalize signals → `learning_signals` (Supabase Edge function). |
| `learning-diagnoser` | `*/30 * * * *` | Compute metrics → `learning_metrics`, emit jobs (status `PENDING`). |
| `learning-applier` | `0 * * * *` | Apply READY jobs, version policies, insert hints. |
| `evaluate-and-gate` | `30 2 * * *` | Check SLOs, roll back latest policy on regression. |
| `citator-recompute` | `15 1 * * *` | Refresh case graph and scores. |

## Evaluation & Gates

Golden sets cover FR, BE/LU, CH-FR, CA-QC, OHADA, Maghreb, and Rwanda. Thresholds include:

- `citations_allowlisted_p95` ≥ 0.95
- `temporal_validity_p95` ≥ 0.95
- `maghreb_banner_coverage` = 1.00
- `hitl_recall_high_risk` ≥ 0.98
- `case_score_regret_delta` ≤ 0.02 over 14 days

If any metric fails post-apply, the last policy version is rolled back automatically and operators
are alerted.

## Interfaces

### APIs

- `POST /api/learning/feedback` – user thumbs-up/down with reason codes.
- `GET /api/learning/metrics` – query aggregated metrics (window, metric filters).
- `GET /api/learning/policies` – active policy versions and pending changes.
- `POST /api/learning/approve` – reviewer approval with change summary.
- `POST /api/learning/rollback` – admin rollback to a specified policy version.

### CLI Tools

- `ops/run-learning-cycle.ts` – local end-to-end collector→diagnoser→applier→evaluate run.
- `ops/seed-eval-cases.ts` – seed golden sets per jurisdiction/topic.
- `ops/report-learning.ts` – dump synonyms, hints, canonicalizer patterns, and metrics.

## Admin Learning Console (Phase Timeline)

- **P0 (72h)**: Overview dashboard (SLO gauges) + Signals feed (jurisdiction/topic/risk filters).
- **P1 (7–10d)**: Proposed changes diff viewer with approve/reject, policy history with rollback,
  integration of nightly eval results and case score badges.
- **P2 (≤30d)**: Topic modeling diagnostics, tool-specific hint weights, per-org opt-in private
  learning, dashboards + alerting, DR drills for policy rollback.

Permissions: reviewer/admin/owner can approve changes; auditor/compliance has read-only access.

## Privacy & Compliance

- No base-model fine-tuning on client data; learning confined to retrieval/policy layers.
- Per-org opt-in toggles for private corpora contributions; defaults to off.
- All changes recorded in `agent_policy_versions` with author, diff, approver, timestamp.
- France-mode blocks judge analytics and re-identification attempts.

## Acceptance Criteria Snapshot

- Nightly cycle updates synonyms/hints/canonicalizer when signals justify it.
- Policy version increments with admin approval/rollback controls.
- Citator recompute adjusts case scores and surfaces UI badges.
- SLOs remain above thresholds for 7 consecutive days.
- No cross-tenant leakage; RLS verified.
- Dashboards + alerts in place; rollback runbook allows revert within 5 minutes.

Refer to `docs/LEARNING_POLICY_GUARDRAILS.md` for guardrail specifics and `docs/LEARNING_RUNBOOK_ROLLBACK.md`
for operational recovery procedures.
