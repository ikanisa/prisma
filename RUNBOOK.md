# Operations Runbook

## Purpose
Provide actionable procedures for responding to incidents, executing planned maintenance, and running compliance-ready operations across Staff and Admin PWAs.

## Contacts & Escalation
| Role | Primary | Secondary | Notes |
|------|---------|-----------|-------|
| On-Call SRE | #oncall-sre Slack | PagerDuty rotation | Owns infrastructure and runtime incidents |
| Ledger Engineering Lead | lead-ledger@company.com | finance-platform@company.com | Handles data integrity issues |
| AI Platform Owner | ai-platform@company.com | security@company.com | Manages agent guardrails |
| Compliance Manager | compliance@company.com | legal@company.com | Oversees regulatory notifications |

Escalate Sev0/Sev1 incidents via PagerDuty; ensure executive briefing within 1 hour for Sev0.

## Incident Severity Matrix
| Severity | Definition | Example | Target Response |
|----------|------------|---------|-----------------|
| Sev0 | Critical outage impacting filings or data integrity | Ledger corruption, agent rogue posting | Immediate, all-hands response |
| Sev1 | Major functionality degraded, workaround exists | PWA offline sync broken for >30 min | Respond within 30 min |
| Sev2 | Partial degradation, limited scope | Single tenant access issue | Respond within 2 hours |
| Sev3 | Minor issue or cosmetic bug | UI glitch without data impact | Respond within 1 business day |

## Standard Operating Procedures

### 1. Production Incident Response
1. Acknowledge alert in PagerDuty and announce in #incident channel.
2. Assign incident commander, communications lead, and scribe.
3. Capture timeline, affected services, and mitigation steps in incident doc template.
4. Engage domain experts (ledger, agents, frontend) as needed.
5. After mitigation, confirm recovery via automated smoke tests and manual validation.
6. Publish post-incident report within 48 hours including corrective actions.

### 2. Deployment Rollout (Blue-Green / Canary)
1. Create release branch and RC tag (`RC_TAG`).
2. Run full CI/CD pipeline including Lighthouse CI and ZAP scans.
3. Deploy to staging; execute regression and offline sync tests.
4. Promote to canary (5% traffic) via feature flag / router.
5. Monitor RED metrics (rate, errors, duration) and agent cost telemetry for 30 minutes.
6. If stable, complete rollout to 100%; otherwise trigger rollback (see below).

### 3. Rollback Procedure
1. Flip traffic back to previous environment or deploy last known good tag.
2. Revert database migrations using expand/contract scripts; verify data integrity checks.
3. Disable new features via config flags (`config/feature-flags.yaml`).
4. Run smoke tests to confirm restored state.
5. Document rollback steps and file follow-up issues.

### 4. Data Subject Request (GDPR)
1. Validate requester identity using support workflow.
2. Query data catalog to identify personal data (refer to `DATA-MODEL.md`).
3. Execute erasure or export scripts; capture audit log.
4. Obtain legal review before completion.
5. Confirm within regulatory SLA (30 days) and update privacy tracker.

### 5. Agent Kill-Switch Activation
1. Set `AGENT_SAFE_MODE=1` via feature flag console.
2. Notify AI Platform Owner and Compliance Manager.
3. Review `AGENT-GUARDRAILS.md` for remediation steps.
4. Investigate prompts, tool invocations, and logs; determine root cause.
5. Re-enable agents only after guardrail updates are validated in staging.

## Observability & Dashboards
- **Grafana:** Dashboards for API latency, error rates, and queue depth.
- **Lighthouse CI:** Accessible via GitHub Actions artifacts; monitor trendline.
- **Security SIEM:** Aggregates audit logs, policy denials, and anomaly detections.
- **Agent Metrics:** Track cost per task, win-rate, and guardrail triggers.

## Appendices
- Incident template stored at `docs/OPERATIONS/incident-template.md`.
- Smoke test checklist in `.github/workflows/release.yml` artifact.
- Compliance evidence index located in `docs/compliance/`.
