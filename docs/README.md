# Documentation Overview

This directory houses the reference material, runbooks, and decision records for the prisma-glow-15 project. Content is grouped by domain so engineering, audit, and compliance teams can quickly locate the relevant guidance.

- `DECISIONS.md` tracks the log of architectural decisions with links to individual ADRs.
- `ADR_TEMPLATE.md` is the starting point for new decision records; copy it into `docs/` (or a subfolder) when drafting an ADR.
- `LEARNING_OVERVIEW.md`, `LEARNING_POLICY_GUARDRAILS.md`, and `LEARNING_RUNBOOK_ROLLBACK.md` document the Reinforced RAG learning loop, guardrails, and rollback procedure.
- `GDRIVE_INGESTION_RUNBOOK.md` captures the operational steps for the Google Drive ingestion pipeline.
- `openai-retrieval.md` outlines semantic search concepts, vector store management, and grounding responses with the Retrieval API.
- `iam/USER_MANAGEMENT.md` outlines the IAM-1 organization directory, API surfaces, and admin UI workflows.
- `iam/PERMISSION_ENFORCEMENT_NOTES.md` summarises how the IAM-2 permission matrix is enforced across backend and UI layers.
- Topical guides (for example security, telemetry, and tax) live in subdirectories to keep operational runbooks and regulatory evidence organized.

Follow the guardrails in `agent/policies/GUARDRAILS.md` when contributing new documentation.
