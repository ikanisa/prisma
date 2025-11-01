# Agent Guardrails

## Overview
Autonomous accounting agents accelerate reconciliations and reviews but must operate under strict guardrails to prevent financial misstatements, privacy incidents, and policy violations. This document defines the control framework spanning prompt hygiene, tool usage, monitoring, and incident response.

## Roles & Responsibilities
- **AI Platform Owner:** Maintains guardrail policy, approves prompt revisions, and coordinates security reviews.
- **Finance Systems Lead:** Verifies agent outputs for ledger-affecting actions and ensures audit trail completeness.
- **Security Engineering:** Reviews new tools and data sources, manages secret distribution, and monitors anomalies.
- **On-Call SRE:** Owns runtime kill-switches and mitigations when guardrails trigger.

## Prompt Lifecycle
1. **Version Control:** All prompts stored in `packages/agents/prompts` with semantic version tags and checksums recorded in `agents-manifest.json`.
2. **Change Management:** Pull requests modifying prompts require approval from AI Platform Owner and Security Engineering.
3. **Testing:** Run regression suite `pnpm run test:agents` including prompt-injection, red-team scenarios, and deterministic output checks.
4. **Deployment:** Promote new prompt versions behind feature flags; monitor golden tasks before broad rollout.

## Tool Allow-List
| Tool | Purpose | Data Scope | Notes |
|------|---------|------------|-------|
| `ledger.query` | Read-only ledger analytics | Tenant-scoped financial data | Enforces row-level security and read-only role |
| `journal.post` | Create/update journal entries | Tenant financial records | Requires idempotency key and balanced entry validation |
| `evidence.attach` | Upload supporting documents | Object storage (per-tenant) | Sanitizes metadata; PII redaction required |
| `notify.review` | Send alerts to humans | Email/Slack endpoints | Logs template, recipients, and trace_id |

Any new tool must undergo STRIDE threat modeling and be added to this allow-list with documented scopes.

## Data Minimization & Redaction
- Mask PII (SSNs, tax IDs, bank accounts) using the `redactSensitiveFields` utility before prompts exit the secure boundary.
- Summaries must exclude raw document contents unless explicitly approved.
- Financial values sent to LLMs must be rounded to reporting precision and tagged with currency.

## Runtime Enforcement
- **Policy Engine:** Agents must call the policy check endpoint before executing side-effectful tools; responses include approval, deny, or require-human-review states.
- **Rate Limits:** Default 60 requests/minute per agent per tenant; override requires security approval.
- **Circuit Breakers:** Automatic disable when error rate exceeds 5% over 5 minutes or when policy denies exceed 3 in a row.
- **Observation Hooks:** Emit structured logs `{ trace_id, agent_id, tool, cost_usd, latency_ms, outcome }` via OpenTelemetry spans.

## Monitoring & Evaluation
- Golden task suite stored in `agents/evals` with expected outputs.
- Weekly evaluation reports share win-rate trends, cost per task, and anomalies.
- Integrate evaluation metrics into Grafana dashboard with alerts when win-rate drops by >5% week-over-week.

## Incident Response
1. Trigger kill-switch (`AGENT_SAFE_MODE=1`) via feature flag service.
2. Notify security, compliance, and finance owners.
3. Collect prompt, inputs, tool outputs, and logs for forensic review.
4. File incident ticket with severity classification (S0–S3) and follow SOC 2 post-incident workflow.
5. Conduct root cause analysis, update guardrails, and document lessons learned.

## Compliance Alignment
- SOC 2: Controls cover CC7 (Monitoring), CC8 (Change Management), and A1 (Availability) for agent components.
- GDPR: Ensure agents process minimum necessary personal data; maintain processing records.
- IFRS/GAAP: Human review remains required for material journal postings; agent outputs must be traceable to reviewers.

## Roadmap (NICE-TO-HAVE)
- Differential privacy fine-tuning for summarization prompts.
- Cost anomaly detection using budget envelopes per feature flag cohort.
- Automated red-team LLM to continuously probe guardrails.
