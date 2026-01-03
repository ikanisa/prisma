# Production Operations Guide
## Prisma Glow - Production Operations & Readiness

**Version:** 1.0.0  
**Last Updated:** January 2025

---

## Table of Contents

1. [Production Readiness Checklist](#production-readiness-checklist)
2. [Pre-Deployment Validation](#pre-deployment-validation)
3. [Deployment Procedures](#deployment-procedures)
4. [Post-Deployment Verification](#post-deployment-verification)
5. [Monitoring & Alerting](#monitoring--alerting)
6. [Incident Response](#incident-response)
7. [Rollback Procedures](#rollback-procedures)

---

## Production Readiness Checklist

### Security ✅
- [x] Secrets managed via dedicated secret manager or vault
- [x] .env.example committed with placeholders
- [x] Environment separation (DEV/PROD)
- [x] Webhook verification tokens/signatures
- [x] Retries and exponential backoff for external calls
- [x] Idempotency keys / dedupe for webhooks
- [x] Centralized error handling workflow
- [x] OAuth scope catalogue maintained
- [x] Supabase keys rotated per rotation guide
- [x] CAPTCHA + leaked-password checks enabled
- [x] SMTP invite delivery configured

### Reliability ✅
- [x] Retries with exponential backoff on all external integrations
- [x] Idempotency keys for webhook processing
- [x] Graceful degradation paths and circuit breakers
- [x] Runbooks include RTO/RPO targets and escalation paths

### Observability ✅
- [x] Structured logging and metrics
- [x] Alerting and incident response runbooks
- [x] Logging architecture documented
- [x] Telemetry schemas and rate-limit guidance
- [x] Error notification pipeline implemented
- [x] Rate-limit breaches and SLA monitoring
- [x] Web search cache retention monitored

### DevOps ✅
- [x] CI pipeline with lint/test/SCA
- [x] Unit/integration tests
- [x] Dependency scanning (npm audit/Snyk)
- [x] gitleaks or secret scanning in CI
- [x] Versioned infrastructure
- [x] Environment-specific configs

### Data Management ✅
- [x] Backup/restore plan for Sheets and DB
- [x] Data retention & deletion policy
- [x] Financial close & disclosure workflows
- [x] Ledger imports, TB snapshots, IFRS note composer

### Compliance ✅
- [x] GDPR/PII handling guidelines
- [x] Access controls based on least-privilege
- [x] Periodic access reviews
- [x] Audit trails retained for accounting APIs

### Hardening & UAT ✅
- [x] Performance/load test & UAT plan
- [x] Phase D load profiles executed
- [x] ADA compliance verified
- [x] Partner sign-off scripts completed

---

## Pre-Deployment Validation

### 1. Environment Validation

Before deploying, validate all environment variables:

```bash
# Validate environment configuration
pnpm run validate:env

# Or with custom env file
ENV_FILE=.env.production pnpm run validate:env
```

The validation script checks:
- All required variables are set
- Variable formats are correct (URLs, connection strings, etc.)
- No missing critical configuration
- Optional variables (warnings only)

### 2. Pre-Deployment Checklist

- [ ] All tests passing in CI
- [ ] Environment variables validated
- [ ] Database migrations tested
- [ ] Security scans passed
- [ ] Performance tests passed
- [ ] Documentation updated
- [ ] Rollback plan reviewed
- [ ] Team notified of deployment

### 3. Database Migration Validation

```bash
# Test migrations locally
pnpm --filter web run prisma:migrate:dev

# Validate migration order
pnpm --filter web exec prisma migrate diff --from-empty --to-schema-datamodel ./prisma/schema.prisma --script

# Check for breaking changes
pnpm --filter web exec prisma validate
```

---

## Deployment Procedures

### Standard Deployment

1. **Prepare Release**
   ```bash
   # Ensure all changes are committed
   git status
   
   # Run full test suite
   pnpm run test
   pnpm run typecheck
   pnpm run lint
   ```

2. **Validate Environment**
   ```bash
   pnpm run validate:env
   ```

3. **Build Application**
   ```bash
   pnpm run build
   ```

4. **Deploy to Staging**
   - Push to staging branch
   - Monitor CI/CD pipeline
   - Verify staging deployment

5. **Deploy to Production**
   - Merge to main branch
   - Monitor deployment
   - Verify health endpoints

### Emergency/Hotfix Deployment

1. Create hotfix branch from main
2. Make minimal changes
3. Test thoroughly
4. Get approval
5. Merge to main
6. Deploy immediately
7. Monitor closely

---

## Post-Deployment Verification

### Health Checks

```bash
# Check application health
curl https://prisma-glow.pages.dev/api/health

# Check readiness
curl https://prisma-glow.pages.dev/api/ready

# Check metrics
curl https://prisma-glow.pages.dev/api/metrics
```

### Verification Checklist

- [ ] Health endpoint returns 200
- [ ] Readiness endpoint returns 200
- [ ] Database connections working
- [ ] API endpoints responding
- [ ] Frontend loading correctly
- [ ] No error spikes in monitoring
- [ ] Performance metrics normal

### Smoke Tests

Run automated smoke tests:

```bash
# UI smoke tests
pnpm run test:playwright

# API smoke tests
pnpm run test:api:smoke
```

---

## Monitoring & Alerting

### Key Metrics to Monitor

1. **Application Health**
   - Response times (P50, P95, P99)
   - Error rates
   - Request throughput

2. **Database**
   - Connection pool usage
   - Query performance
   - Replication lag

3. **Infrastructure**
   - CPU/Memory usage
   - Disk I/O
   - Network traffic

4. **Business Metrics**
   - Active users
   - Feature usage
   - Conversion rates

### Alert Thresholds

- **Critical:** Error rate > 5%
- **Warning:** Response time P95 > 1s
- **Warning:** Database connections > 80%
- **Critical:** Service unavailable

### Monitoring Tools

- **Sentry:** Error tracking
- **Prometheus:** Metrics collection
- **Grafana:** Dashboards
- **PagerDuty:** Incident management

---

## Incident Response

### Severity Levels

1. **P0 - Critical:** Service down, data loss
2. **P1 - High:** Major feature broken, significant impact
3. **P2 - Medium:** Feature degraded, workaround available
4. **P3 - Low:** Minor issue, minimal impact

### Response Procedures

1. **Acknowledge** incident
2. **Assess** severity and impact
3. **Communicate** to stakeholders
4. **Investigate** root cause
5. **Resolve** or mitigate
6. **Verify** fix
7. **Document** incident

### Escalation Path

1. On-call engineer (first responder)
2. Team lead (if unresolved in 30 min)
3. Engineering manager (if unresolved in 1 hour)
4. CTO (if unresolved in 2 hours)

---

## Rollback Procedures

### Application Rollback

```bash
# Using docker compose
make compose-prod-rollback ROLLBACK_TAG=<previous-sha>

# Or via GitHub Actions
# Trigger compose-deploy workflow with rollback_tag parameter
```

### Database Rollback

1. **Assess Impact**
   - Review migration changes
   - Check data dependencies
   - Verify backup availability

2. **Execute Rollback**
   ```bash
   # Point-in-time restore (Supabase)
   # Follow docs/OPERATIONS/observability-checklist.md
   ```

3. **Verify**
   - Check data integrity
   - Verify application functionality
   - Monitor for issues

### Rollback Decision Matrix

| Issue Type | Rollback? | Notes |
|------------|-----------|-------|
| Data corruption | Yes | Immediate |
| Security vulnerability | Yes | Immediate |
| Performance degradation | Maybe | If severe |
| Feature bug | Maybe | If critical |
| UI issue | No | Fix forward |

---

## Maintenance Windows

### Scheduled Maintenance

- **Frequency:** Monthly
- **Duration:** 2-4 hours
- **Activities:**
  - Database maintenance
  - Dependency updates
  - Security patches
  - Performance optimization

### Emergency Maintenance

- **Communication:** 24 hours notice (when possible)
- **Duration:** As needed
- **Activities:** Critical fixes only

---

## Contact Information

- **On-Call:** See PagerDuty schedule
- **Engineering Lead:** [Contact Info]
- **DevOps:** [Contact Info]
- **Security:** [Contact Info]

---

## Related Documentation

- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [Architecture Documentation](./ARCHITECTURE.md)
- [Security Guide](./SECURITY.md)
- [Monitoring Guide](./MONITORING_AND_OBSERVABILITY.md)
- [Incident Response Runbook](./RUNBOOK.md)

---

**Last Updated:** January 2025  
**Maintained By:** DevOps Team

