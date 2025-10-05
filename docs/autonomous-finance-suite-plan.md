# Autonomous Finance Suite – Phased Implementation Plan

## 1. Current System Snapshot

### Configuration consumption
- The system configuration already exposes the detailed YAML with UI shell, autonomy, RBAC, data, and policy metadata, and the runtime parser currently surfaces entry-point chips for the assistant dock and checks for key policy style rules.【F:config/system.yaml†L1-L168】【F:src/lib/system-config.ts†L5-L74】【F:tests/config/system-config.test.ts†L1-L21】
- Aside from the chips helper, no runtime code reads `ui.shell.style`, `ui.empty_states`, `autonomy`, or `client_portal_scope`, so the new metadata is not yet applied to the UI, autonomy defaults, or client portal gating.【F:src/lib/system-config.ts†L11-L74】

### Assistant dock & UX shell
- The assistant dock component implements chat, task drafting, action surfaces, and autopilot telemetry but still relies on hard-coded positioning/styling; configuration-driven placement, theming, and motion settings are not wired in yet.【F:src/components/assistant/assistant-dock.tsx†L1-L200】
- Core empty states (tasks, documents, notifications) use inline strings rather than the configurable copy introduced in the YAML.【F:src/pages/tasks.tsx†L300-L336】【F:src/pages/notifications.tsx†L194-L204】【F:src/components/file-upload.tsx†L95-L112】

### RBAC & client portal scope
- Backend permission enforcement derives from `POLICY/permissions.json`, which predates the new permission keys and omits `documents.view_internal`, `documents.view_client`, `policy.pack.edit`, and the client portal denial list introduced in the spec.【F:POLICY/permissions.json†L1-L29】
- Client document access relies on a static `CLIENT_ALLOWED_DOCUMENT_REPOS` constant that still includes `04_Audit/PBC`, diverging from the spec’s restricted PBC folders.【F:server/main.py†L31-L63】【F:config/system.yaml†L74-L76】

### Autonomy level handling
- Organization creation and membership APIs continue to treat autonomy as a numeric field spanning 0–5 with no mapping to the named L0–L3 levels or enforcement of the new default; the front-end does not expose the configured default either.【F:server/main.py†L1760-L2088】【F:config/system.yaml†L40-L46】

### Knowledge & retrieval services
- The retrieval stack persists vector chunks through a single pgvector-backed table and embeds content, but there is no orchestration for the dual index strategy, reranker choice, or citation policy described in the spec.【F:server/rag.py†L1-L63】【F:config/system.yaml†L115-L168】
- Knowledge-source ingestion endpoints still return static Google Drive previews and do not enforce the new fetch policy ordering before asking users.【F:server/main.py†L4034-L4095】【F:config/system.yaml†L133-L139】

### Document AI pipeline
- Autopilot extraction jobs currently mark documents as done with placeholder provenance updates and do not perform OCR/classification/extraction or use extractor definitions for supported document types.【F:server/autopilot_handlers.py†L1-L88】【F:config/system.yaml†L169-L236】

### Integrations, telemetry, and release controls
- WhatsApp MFA helpers exist with unit tests but are not yet invoked by the privileged actions listed in the configuration’s `mfa_required_actions`.【F:server/main.py†L1-L90】【F:tests/test_mfa_enforcement.py†L1-L40】【F:config/system.yaml†L237-L284】
- Notification templates/digests and telemetry dashboards from the spec are not yet reflected in the runtime notification service or deployment scripts, while the release control metadata now powers the readiness API and analytics dashboard card.【F:config/system.yaml†L379-L720】【F:server/main.py†L1-L120】【F:src/pages/analytics/overview.tsx†L1-L320】

## 2. Outstanding Capability Summary

| Spec Area | Current Coverage | Gaps |
| --- | --- | --- |
| UI shell & assistant | Assistant dock, autopilot UI, entry-point chips | Configurable theming/positioning, empty-state copy, motion presets, style-rule enforcement |
| Autonomy & workflows | Autopilot scheduling/run surfaces | No mapping to L0–L3 defaults, autonomy-aware safeguards, workflow activation tied to config |
| RBAC & client portal | Permission guardrails, role hierarchy utilities | Permission map alignment, client portal deny list, policy pack edit guard |
| Data sources | Supabase + stubbed Drive preview | OAuth scope management, folder mirroring, URL fetch policy, email ingest toggle |
| Knowledge & retrieval | Basic chunking/embedding | Dual index orchestration, reranker integration, citation guardrails, before-asking-user order |
| Document AI | Extraction queue + autopilot handler stub | OCR/classify/extract/index stages, extractor field mapping, provenance enforcement |
| Integrations & telemetry | WhatsApp MFA helper, telemetry dashboards, notification screens | MFA gating for listed actions, config-driven notification templates/digests, telemetry dashboards per spec, release control manifest automation |

## 3. Phased Delivery Plan

### Phase 0 – Configuration Wiring & UX Alignment (Week 0–1)
**Goals:** Honour UI shell settings, empty states, and policy styling from the new system configuration.
- Extend the `SystemConfig` typings/hooks to expose helper selectors for theme, motion, dock placement, and empty-state text; add regression tests covering fallback behaviour.【F:src/lib/system-config.ts†L5-L74】【F:tests/config/system-config.test.ts†L1-L21】
- Update assistant dock, layout shell, and empty-state components to consume configuration values (position class, motion variants, copy) and fail closed when settings are absent.【F:src/components/assistant/assistant-dock.tsx†L1-L200】【F:src/pages/tasks.tsx†L300-L336】【F:src/pages/notifications.tsx†L194-L204】
- Introduce an assistant style-rule validator so responses always include two suggested actions and concise explanations, surfacing errors to telemetry when the orchestration layer violates policy.
- Acceptance: automated tests assert config-driven rendering; Storybook/visual smoke confirms theming and copy updates.

### Phase 1 – RBAC Harmonisation & Client Portal Guardrails (Week 1–2)
**Goals:** Align permission maps and client portal scope with the spec.
- Replace the static permission JSON with entries that match `rbac.permissions`, migrating backend guards to the new keys and adding coverage for `policy.pack.edit` and onboarding actions.【F:config/system.yaml†L48-L76】【F:POLICY/permissions.json†L1-L29】
- Refactor document endpoints to read allowed repositories and denied actions from configuration, removing the hard-coded audit folder and enforcing deny-list overrides for CLIENT roles.【F:server/main.py†L31-L63】【F:config/system.yaml†L74-L76】
- Add Supabase RLS/unit tests to confirm CLIENT users cannot invoke denied actions or access restricted repositories.
- Acceptance: integration tests cover CLIENT vs EMPLOYEE document access and policy-pack edit gating; security review signs off on the new map.

### Phase 2 – Autonomy Levels & Workflow Activation (Week 2–3)
**Goals:** Map system autonomy defaults to organisational settings and autopilot behaviour.
- Persist autonomy as the string level (L0–L3) with migrations/backfill, enforcing `autonomy.default_level` on organisation creation and surfacing it in the UI onboarding flows.【F:server/main.py†L1760-L2088】【F:config/system.yaml†L40-L46】
- Gate autopilot job types and workflow triggers based on configured autonomy level, ensuring human-in-the-loop requirements for irreversible actions remain intact.
- Instrument policy packs so approvals escalate when autonomy exceeds L1, logging deviations for audit.
- Acceptance: unit tests cover level mapping; autopilot job scheduling respects autonomy thresholds in integration scenarios.
- ✅ Workflow suggestions, assistant quick actions, and the `workflows.run_step` tool now enforce each workflow’s minimum autonomy level, returning guardrail messaging and filtering actions when organisations fall below the required threshold.【F:server/config_loader.py†L253-L305】【F:server/workflow_orchestrator.py†L8-L121】【F:server/main.py†L1766-L1906】【F:tests/test_workflows.py†L73-L146】

### Phase 3 – Data Source Connectors & Fetch Policy (Week 3–4)
**Goals:** Implement the data-source integrations and pre-fetch policy order.
- Build a Google Drive ingestion service using the configured OAuth scopes and folder mapping, mirroring approved documents into Supabase storage with provenance metadata.【F:config/system.yaml†L78-L108】
- Implement URL fetchers respecting robots.txt, max depth, and cache TTL; persist fetched content for reuse.
- Surface email ingest toggles in admin settings, defaulting to disabled per spec.
- Update orchestration to honour `before_asking_user` ordering, logging when data sources are exhausted before prompting.【F:config/system.yaml†L133-L139】
- Acceptance: connectors verified via integration tests/mocks; telemetry confirms ordered fetch attempts.

- ✅ Google Drive ingestion now loads OAuth scopes and folder mapping from the shared configuration across the Node orchestrator and FastAPI services, enforces the URL fetch policy (robots.txt, depth, TTL), caches harvested web content in Supabase, and surfaces the policy order plus allowed domains in the knowledge UI and assistant guardrails.【F:services/rag/system-config.ts†L1-L116】【F:services/rag/index.ts†L40-L247】【F:supabase/sql/data_sources_phase3_migration.sql†L1-L33】【F:server/main.py†L872-L920】【F:src/pages/knowledge/repositories.tsx†L33-L204】

### Phase 4 – Document AI Pipeline (Week 4–6)
**Goals:** Deliver the OCR → classify → extract → index pipeline with per-document extractors.
- Implement classifier and extractor registries that map configured document types to field sets, persisting provenance (docId, page/span) with every extraction.【F:config/system.yaml†L169-L236】
- Integrate OCR (Document AI / fallback) and classification services, generating structured payloads for Supabase `document_extractions` rows.【F:server/autopilot_handlers.py†L1-L88】
- Extend the autopilot handler to run the full pipeline, update document statuses, and queue indexing tasks for knowledge ingestion.
- Acceptance: end-to-end tests cover INCORP_CERT and BANK_STMT samples; provenance recorded; failure quarantines trigger notifications.

### Phase 5 – Knowledge Retrieval & Search Experience (Week 6–8)
**Goals:** Operationalise dual indexes, reranker, and citation enforcement.
- Provision `finance_docs_v1` and `standards_v1` pgvector collections with chunking parameters and retention policies drawn from configuration.【F:config/system.yaml†L115-L168】
- Integrate the reranker (`mini-lm-re-ranker-v2`) into the retrieval flow, enforcing `top_k` and minimum citation confidence before surfacing answers.
- Update assistant orchestration to require citations, linking to document IDs/pages and preventing responses when confidence is below threshold.
- Acceptance: regression tests confirm retrieval falls back to keyword search; assistant replies include mandated citations.

### Phase 6 – Agents, Workflows, and Tooling (Week 8–10)
**Goals:** Model agents, tool permissions, and workflow automation per spec.
- Codify agent registry from configuration, aligning each tool invocation with permission checks and rate limits.【F:config/system.yaml†L237-L520】
- Implement workflow orchestrators for onboarding, monthly close, external audit, and tax cycle using the configured steps and approvals, storing playbook state for audit.
- Extend autopilot/assistant UI to surface suggested “next two actions” derived from workflow context, satisfying policy style rules.
- Acceptance: scenario tests walk through onboarding zero-typing and monthly close flows end to end; audit trails capture tool usage.

### Phase 7 – Integrations, Notifications, Telemetry, Release Controls (Week 10–12)
**Goals:** Close integration gaps and enforce release governance.
- Wire WhatsApp MFA checks into `close.lock`, audit plan/report approvals, and EQR sign-off endpoints, aligning with `mfa_required_actions` and recording telemetry for attempts.【F:config/system.yaml†L237-L284】
- Update notification service to use templated copy/digest schedules from config, and ensure Supabase jobs deliver daily/weekly digests.【F:config/system.yaml†L379-L404】
- Build telemetry dashboards per spec (assistant adoption, doc pipeline, compliance, security) and expose them in the analytics UI.【F:config/system.yaml†L405-L432】
- Automate release control checks: manifest hashing (sha256), approvals (`plan_freeze`, `filings_submit`, `report_release`, `period_lock`), and archive content packaging.【F:config/system.yaml†L433-L720】
- Acceptance: end-to-end tests confirm MFA gating; telemetry dashboards populated; release checklist automation passes in staging.

## 4. Cross-Cutting Tasks
- **Documentation:** Update `/docs` playbooks after each phase, mirroring configuration-driven behaviours and governance requirements.
- **Testing & Observability:** Expand unit/integration coverage for new connectors and pipelines; emit structured telemetry events for policy and workflow decisions.
- **Change Management:** Introduce feature toggles where appropriate to roll out high-impact modules (Document AI, new workflows) safely and allow staged validation with human-in-the-loop checkpoints.

## 5. Risk & Mitigation Highlights
- **Third-party API limits (OpenAI, Google Drive):** Implement exponential backoff and caching; add monitoring to telemetry dashboards to watch quota consumption.
- **Config drift:** Add validation schema tests ensuring `config/system.yaml` matches runtime expectations, preventing deploys with missing keys.
- **MFA usability friction:** Provide fallback OTP channels and in-app reminders ahead of privileged actions to minimise lockouts while maintaining security posture.

This phased plan sequences the remaining work so that configuration-driven behaviours land first, followed by compliance-critical RBAC/autonomy, data intelligence pipelines, and finally integrations and release governance.
