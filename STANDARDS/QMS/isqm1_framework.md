# ISQM 1 Quality Management Framework

**Purpose:** Define the firm’s system of quality management in accordance with ISQM 1 (paragraphs 13–54).

## Quality objectives
1. **Governance & leadership** – tone at the top, accountability, independence.
2. **Relevant ethical requirements** – adherence to IESBA Code; independence monitoring.
3. **Acceptance & continuance** – risk screening for new clients/engagements.
4. **Engagement performance** – competent staff, methodology, review structure.
5. **Resources** – HR, technology (Supabase, AI agents), intellectual resources.
6. **Information & communication** – timely exchange of policies, alerts.
7. **Monitoring & remediation** – inspection program, root cause analysis.

## Risk assessment process
- **Identify risks** (e.g., unreviewed journal postings, AI misuse, independence breach).
- **Assess severity** (high/medium/low) and likelihood.
- **Link to responses** (controls listed below).

## Responses / controls
| Risk | Control Response | Owner |
| --- | --- | --- |
| Unauthorised posting | Manager approval & audit trail | Engagement Manager |
| AI-generated misstatement | Calculator dominance policy & citations | AI Safety Lead |
| Independence breach | Non-audit service blocker; quarterly attestations | Ethics Partner |
| Data leakage | RLS, signed URLs, retention policy | Security Officer |
| Methodology drift | Standards templates & checklists; training | Methodology Lead |

## System controls inventory
| Control | Purpose | Frequency | Owner | Evidence |
| --- | --- | --- | --- | --- |
| HITL approvals (POST/LOCK/HANDOFF/ARCHIVE/SEND) | Require manager review before executing sensitive journal, lock, handoff, archive, or client-send actions | Per sensitive tool invocation | Operations Director | services/rag/index.ts (`approval_queue`), src/pages/approvals.tsx |
| Independence & NAS gate | Prevent accepting audit engagements with prohibited NAS unless partner override + approval documented | Per engagement acceptance | Engagement Partner | STANDARDS/POLICY/independence_catalog.md, approval_queue (INDEPENDENCE_OVERRIDE), activity_log |
| Row-level security (RLS) | Enforce least-privilege data access across org membership | Continuous (database policy) | Security Lead | supabase/rls/agents_001.sql, STANDARDS/POLICY/data_privacy_and_RLS.md |
| Signed URL document delivery | Ensure evidence exports require authenticated request and expire automatically | Per document download | Security Lead | services/rag/index.ts (`ensureDocumentsBucket`), src/pages/documents.tsx |
| Calculator dominance guardrail | Prevent AI overrides of regulated calculators without human review | At every memo/tool call | AI Safety Lead | STANDARDS/POLICY/calculator_dominance.md, lib/agents/runtime.ts |
| Refusal rules | Block unsafe or policy-breaching agent responses | At inference runtime | AI Safety Lead | lib/agents/runtime.ts (`validateNarrativeCitations`, refusal branches) |
| Citation checker | Confirm memos include configuration/document citations before release | At memo generation | Technical Reviewer | lib/agents/runtime.ts (`collectMemoCitations`), Telemetry groundedness metrics |
| Sensitive tool blocking | Queue high-risk tool executions for approval with evidence context | Per sensitive tool request | Ops Lead | services/rag/index.ts (`results.push({ status: 'BLOCKED' })`), approval_queue records |

## Monitoring activities
- **Engagement inspections:** quarterly sample review across domains; documented in monitoring_checklist.md.
- **Metrics dashboard:** error rates, approval turnaround, citation compliance.
- **Incident logging:** independence breaches, data incidents.

## Remediation
- Root cause analysis using QMS incident log.
- Action plans tracked until closed; effectiveness verified.
- Feedback loop into training, methodology updates, and AI prompt revisions.

## Documentation & communication
- Policies stored in `/STANDARDS/POLICY` with version history.
- Quality alerts distributed via platform notifications + email.
- Annual QMS report delivered to leadership.

## References
- ISQM 1 paragraphs 13–54, A17–A159
- ISQM 2 (EQR) for high-risk engagements
