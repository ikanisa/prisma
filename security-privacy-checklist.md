# Security & Privacy Checklist

## Identity and Access
- [ ] Enforce OIDC/OAuth flows with MFA for Admin roles
- [ ] RBAC/ABAC policies validated with automated tests
- [ ] Session management reviewed for inactivity timeout and device binding

## Application Security
- [ ] Helmet CSP, HSTS, and secure headers enabled in gateway
- [ ] Input validation via Zod/AJV at API boundaries
- [ ] SSRF and injection mitigations documented and tested
- [ ] CSRF protections verified for state-changing requests

## Secrets & Infrastructure
- [ ] Secret manager references confirmed in IaC manifests
- [ ] No plaintext secrets committed; detect-secrets baseline updated
- [ ] Database, cache, queue networks restricted by security groups

## Data Protection
- [ ] PII classification map updated in `DATA-MODEL.md`
- [ ] Encryption at rest verified for Postgres, Redis, and storage buckets
- [ ] TLS certificates monitored with automated expiry alerts
- [ ] Data retention/erasure workflows tested in staging

## Monitoring & Response
- [ ] Security alerts integrated with SIEM and on-call rotations
- [ ] Incident response runbook tabletop exercise completed
- [ ] Audit logs exported to immutable storage with integrity checks

## Compliance
- [ ] SOC 2 control evidence stored in governance repository
- [ ] GDPR DPIA reviewed and signed off by DPO
- [ ] PCI DSS scoping reviewed (confirm non-applicability or controls)
