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
| Environment separation (DEV/PROD) | FAIL |
| Webhook verification tokens/signatures | FAIL |
| Retries and exponential backoff for external calls | FAIL |
| Idempotency keys / dedupe for webhooks | FAIL |
| Centralized error handling workflow | FAIL |
| Structured logging and metrics | FAIL |
| Alerting and incident response runbooks | FAIL |
| CI pipeline with lint/test/SCA | FAIL |
| Unit/integration tests | FAIL |
| Dependency scanning (npm audit/Snyk) | FAIL |
| gitleaks or secret scanning in CI | FAIL |
| Backup/restore plan for Sheets and DB | FAIL |
| Data retention & deletion policy | FAIL |
| Access controls & least privilege | FAIL |
| GDPR/PII handling guidelines | FAIL |

