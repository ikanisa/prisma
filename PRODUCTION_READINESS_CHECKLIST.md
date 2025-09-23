# Production Readiness Checklist

## Table of Contents
- [Security](#security)
- [Reliability](#reliability)
- [Observability](#observability)
- [DevOps](#devops)
- [Data Management](#data-management)
- [Compliance](#compliance)

| Item | Status |
|---|---|
| Secrets managed via n8n credentials or vault | FAIL |
| .env.example committed with placeholders | PASS |
| Environment separation (DEV/PROD) | PASS |
| Webhook verification tokens/signatures | FAIL |
| Retries and exponential backoff for external calls | PASS |
| Idempotency keys / dedupe for webhooks | FAIL |
| Centralized error handling workflow | FAIL |
| Structured logging and metrics | PASS |
| Alerting and incident response runbooks | PASS |
| CI pipeline with lint/test/SCA | PASS |
| Unit/integration tests | PASS |
| Dependency scanning (npm audit/Snyk) | PASS |
| gitleaks or secret scanning in CI | PASS |
| Backup/restore plan for Sheets and DB | PASS |
| Data retention & deletion policy | PASS |
| Access controls & least privilege | PASS |
| GDPR/PII handling guidelines | PASS |
| Accounting Supabase schemas with RLS | PASS |
| Accounting API approvals & trace logging | PASS |
| Accounting workspace job cards implemented | PASS |
| Policy guides in STANDARDS/POLICY refreshed | PASS |
| Automated tests for accounting modules | PASS |
