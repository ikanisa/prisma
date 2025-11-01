# Agent Safety Checklist

## Policy & Governance
- [ ] Agent guardrails documented and versioned in `AGENT-GUARDRAILS.md`
- [ ] Tool allow-list reviewed with security and compliance
- [ ] Cost and latency budgets approved by product leadership

## Prompt & Context Controls
- [ ] System/developer/user prompts separated with checksum validation
- [ ] Sensitive data redaction applied before prompts leave secure boundary
- [ ] Prompt-injection regression tests executed in CI

## Runtime Enforcement
- [ ] Function-calling schemas validated; reject unknown tool invocations
- [ ] Rate limits and circuit breakers configured per tenant/user
- [ ] Retry policies deterministic; no infinite retries without human approval

## Monitoring & Telemetry
- [ ] Agent actions logged with trace_id, user_id, tenant_id, agent_id
- [ ] Cost telemetry exported to observability stack with alert thresholds
- [ ] Golden task evaluation harness tracks win-rate and regressions per model version

## Incident Response
- [ ] Fallback workflows defined when agents fail or violate policy
- [ ] Rollback / disable switch tested (feature flag or kill-switch)
- [ ] Post-incident review template aligned with SOC 2 requirements
