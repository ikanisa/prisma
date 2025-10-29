# Release Runbook: Prisma Glow Platform

**Version:** 1.0  
**Last Updated:** 2025-10-29  
**Owner:** DevOps Team  
**Review Frequency:** Monthly  

---

## Table of Contents

1. [Overview](#overview)
2. [Pre-Release Checklist](#pre-release-checklist)
3. [Build & Package](#build--package)
4. [Testing](#testing)
5. [Staging Deployment](#staging-deployment)
6. [Production Deployment](#production-deployment)
7. [Smoke Tests](#smoke-tests)
8. [Rollback Procedures](#rollback-procedures)
9. [Post-Deployment](#post-deployment)
10. [On-Call Handoff](#on-call-handoff)
11. [Incident Response](#incident-response)

---

## Overview

This runbook documents the end-to-end release process for the Prisma Glow platform, from build through production deployment, including smoke tests and rollback procedures.

### Release Cadence
- **Major Releases:** Monthly (first Tuesday of month)
- **Minor Releases:** Bi-weekly (every other Wednesday)
- **Hotfixes:** As needed (within 24 hours of critical issue)
- **Maintenance Windows:** Tuesdays 02:00-04:00 UTC

### Communication Channels
- **Release Coordination:** #releases (Slack/Teams)
- **Incidents:** #incidents (Slack/Teams)
- **Status Page:** [status.prismaglow.com](https://status.prismaglow.com) (TBD)

---

## Pre-Release Checklist

**Owner:** Release Manager  
**Timeline:** T-2 days before release

### Code & Testing
- [ ] All PRs merged to `main` branch
- [ ] CI/CD pipelines passing (green builds)
  - [ ] ci.yml workflow (root lint/test/build/coverage)
  - [ ] workspace-ci.yml workflow (all service tests)
  - [ ] docker-build.yml workflow (multi-platform images)
- [ ] Code review completed for all changes
- [ ] CodeQL security scan passing (no critical/high findings)
- [ ] Container image scans passing (Trivy/Grype)
- [ ] Test coverage meets thresholds (45/40/45/45)
- [ ] Python tests passing (60%+ coverage)
- [ ] Playwright E2E tests passing
- [ ] Load tests completed (Artillery/k6)

### Documentation & Communication
- [ ] Release notes drafted (CHANGELOG.md updated)
- [ ] ADRs updated for architectural changes
- [ ] API documentation current (OpenAPI specs)
- [ ] Deployment plan reviewed with team
- [ ] Stakeholders notified of release window
- [ ] Status page scheduled maintenance posted

### Infrastructure & Secrets
- [ ] Staging environment validated
- [ ] Production secrets verified (no rotation needed)
- [ ] Database migrations reviewed and approved
- [ ] Backup of production database completed
- [ ] Capacity planning reviewed (expected load)
- [ ] On-call engineer assigned

---

## Build & Package

**Owner:** CI/CD System (automated)  
**Timeline:** Triggered on main branch merge

### Build Process

1. **Version Tagging**
   ```bash
   # Create release tag
   git tag -a v1.2.3 -m "Release v1.2.3: <description>"
   git push origin v1.2.3
   ```

2. **Automated Build** (GitHub Actions)
   - Workflow: `.github/workflows/docker-build.yml`
   - Platforms: linux/amd64, linux/arm64
   - Services built:
     - `apps/web` (Next.js)
     - `apps/gateway` (Express)
     - `server` (FastAPI) - **Note: No Dockerfile in repo yet**
     - `services/rag` (Node.js)
     - `analytics` (Node.js)
     - `agent` (Node.js)
     - `ui` (Vite bundle)

3. **Image Tagging Convention**
   - `ghcr.io/ikanisa/prisma-web:v1.2.3`
   - `ghcr.io/ikanisa/prisma-web:latest`
   - `ghcr.io/ikanisa/prisma-gateway:v1.2.3`
   - etc.

4. **SBOM Generation** (Per Service)
   ```bash
   # Generate CycloneDX SBOM
   pnpm dlx @cyclonedx/cyclonedx-npm --output-file docs/sbom/prisma-web-v1.2.3.json
   
   # For Python (FastAPI)
   pip install cyclonedx-bom
   cyclonedx-py -o docs/sbom/prisma-backend-v1.2.3.json
   ```

5. **Image Signing** (Recommended)
   ```bash
   # Sign with cosign
   cosign sign --key cosign.key ghcr.io/ikanisa/prisma-web:v1.2.3
   ```

### Artifacts
- [ ] Docker images pushed to container registry
- [ ] SBOMs generated and committed to `docs/sbom/`
- [ ] Images signed (cosign signatures)
- [ ] Git tag created and pushed

---

## Testing

**Owner:** QA Team / Automated Tests  
**Timeline:** Continuous (pre-merge) + Staging validation

### Unit & Integration Tests

Run locally before merging:
```bash
# Install dependencies
pnpm install --frozen-lockfile

# Typecheck
pnpm run typecheck

# Lint
pnpm run lint

# Unit tests
pnpm run test

# Coverage
pnpm run coverage

# Python tests
source .venv/bin/activate
pytest --cov=server --cov-report=term-missing
```

### E2E Tests (Playwright)

```bash
# Core journeys
pnpm run test:playwright:core

# Full suite
pnpm run test:playwright
```

### Load Testing

```bash
# Artillery load test
pnpm run load:test

# k6 RAG smoke test
k6 run scripts/perf/rag-smoke.js
```

### Staging Validation
- [ ] Deploy to staging environment
- [ ] Run smoke tests (see [Smoke Tests](#smoke-tests))
- [ ] Validate database migrations
- [ ] Test critical user journeys
- [ ] Verify integrations (OpenAI, Supabase, Google Drive)
- [ ] Check observability (logs, traces, metrics)

---

## Staging Deployment

**Owner:** DevOps  
**Environment:** staging.prismaglow.com  
**Timeline:** T-1 day before production

### Deployment Steps

1. **Pre-Deployment**
   ```bash
   # SSH to staging server
   ssh deploy@staging.prismaglow.com
   
   # Navigate to deployment directory
   cd /opt/prisma
   
   # Pull latest code (for config updates)
   git pull origin main
   ```

2. **Database Migrations**
   ```bash
   # Supabase migrations (if any)
   psql "$STAGING_DATABASE_URL" -f supabase/migrations/<new_migration>.sql
   
   # Prisma migrations
   cd apps/web
   pnpm run prisma:migrate:deploy
   cd ../..
   ```

3. **Environment Variables**
   ```bash
   # Verify .env.production exists and is current
   diff .env.production .env.production.example
   
   # Check for new required variables
   grep -v '^#' .env.example | grep '=' | cut -d= -f1 | sort > /tmp/required.txt
   grep -v '^#' .env.production | grep '=' | cut -d= -f1 | sort > /tmp/current.txt
   diff /tmp/required.txt /tmp/current.txt
   ```

4. **Pull Images**
   ```bash
   # Set version
   export SERVICE_VERSION=v1.2.3
   
   # Pull new images
   docker compose --profile web --profile gateway -f docker-compose.prod.yml pull
   ```

5. **Deploy**
   ```bash
   # Deploy with new version
   docker compose --profile web --profile gateway -f docker-compose.prod.yml up -d
   ```

6. **Verify Deployment**
   ```bash
   # Check container status
   docker compose ps
   
   # Check logs
   docker compose logs -f --tail=100
   ```

### Post-Deployment Checks
- [ ] Health endpoints responding (200 OK)
- [ ] Database connectivity verified
- [ ] OpenTelemetry traces appearing in backend
- [ ] Sentry error rate normal (<1%)
- [ ] Application accessible via browser

---

## Production Deployment

**Owner:** Release Manager + On-Call Engineer  
**Environment:** app.prismaglow.com  
**Timeline:** During maintenance window

### Pre-Deployment

1. **Notify Stakeholders**
   ```
   Subject: Production Deployment - Prisma Glow v1.2.3
   
   Maintenance Window: 2025-11-05 02:00-04:00 UTC
   Expected Duration: 30 minutes
   Impacted Services: All (brief downtime expected)
   Rollback Plan: Available (see below)
   
   Changes:
   - [Feature] New RAG search improvements
   - [Fix] Resolved auth session timeout issue
   - [Security] Upgraded Vite to 7.1.11 (CVE fix)
   
   Contact: #incidents channel for issues
   ```

2. **Backup Production Database**
   ```bash
   # Via Supabase dashboard or CLI
   supabase db dump -f backups/prisma-$(date +%Y%m%d-%H%M).sql
   
   # Verify backup
   ls -lh backups/prisma-$(date +%Y%m%d-%H%M).sql
   ```

3. **Enable Maintenance Mode** (Optional)
   ```bash
   # If maintenance page configured
   # Enable at load balancer/CDN level
   ```

### Deployment Steps

1. **SSH to Production**
   ```bash
   ssh deploy@app.prismaglow.com
   cd /opt/prisma
   ```

2. **Pre-Flight Checks**
   ```bash
   # Verify current version
   docker compose ps
   
   # Check current health status
   curl -f http://localhost:8000/health || echo "Backend unhealthy"
   curl -f http://localhost:3001/health || echo "Gateway unhealthy"
   
   # Verify disk space
   df -h
   
   # Check memory
   free -h
   ```

3. **Database Migrations**
   ```bash
   # Apply Supabase migrations
   psql "$DATABASE_URL" -f supabase/migrations/<migration>.sql
   
   # Apply Prisma migrations
   cd apps/web
   pnpm run prisma:migrate:deploy
   cd ../..
   
   # Verify migration success
   psql "$DATABASE_URL" -c "SELECT * FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 5;"
   ```

4. **Pull New Images**
   ```bash
   export SERVICE_VERSION=v1.2.3
   docker compose --profile web --profile gateway -f docker-compose.prod.yml pull
   ```

5. **Deploy (Zero-Downtime)**
   ```bash
   # Rolling update (one service at a time)
   docker compose --profile web --profile gateway -f docker-compose.prod.yml up -d --no-deps web
   sleep 10
   docker compose --profile web --profile gateway -f docker-compose.prod.yml up -d --no-deps gateway
   sleep 10
   docker compose --profile web --profile gateway -f docker-compose.prod.yml up -d
   ```

6. **Monitor Deployment**
   ```bash
   # Watch container status
   watch -n 2 'docker compose ps'
   
   # Tail logs
   docker compose logs -f --tail=50
   ```

### Post-Deployment Verification
- [ ] All containers healthy (docker compose ps)
- [ ] Health endpoints returning 200 OK
- [ ] Database connections stable
- [ ] Error rate in Sentry normal
- [ ] Response times within SLO (p95 < 500ms)
- [ ] No spike in error logs

---

## Smoke Tests

**Owner:** On-Call Engineer  
**Timeline:** Immediately after deployment

### Automated Health Checks

```bash
#!/bin/bash
# smoke-test.sh

BASE_URL="${BASE_URL:-http://localhost:3000}"
GATEWAY_URL="${GATEWAY_URL:-http://localhost:3001}"
BACKEND_URL="${BACKEND_URL:-http://localhost:8000}"

echo "🔍 Running smoke tests..."

# Health endpoints
echo "Testing health endpoints..."
curl -f -s "${BACKEND_URL}/health" || { echo "❌ Backend health failed"; exit 1; }
curl -f -s "${GATEWAY_URL}/health" || { echo "❌ Gateway health failed"; exit 1; }
echo "✅ Health checks passed"

# Database connectivity
echo "Testing database connectivity..."
curl -f -s "${BACKEND_URL}/api/v1/health/db" || { echo "❌ Database health failed"; exit 1; }
echo "✅ Database connectivity passed"

# Authentication (if token available)
if [ -n "$AUTH_TOKEN" ]; then
    echo "Testing authenticated endpoint..."
    curl -f -s -H "Authorization: Bearer $AUTH_TOKEN" "${BACKEND_URL}/api/v1/me" || { echo "❌ Auth test failed"; exit 1; }
    echo "✅ Authentication test passed"
fi

echo "🎉 All smoke tests passed!"
```

### Manual Verification Checklist

- [ ] **Login Flow**
  - Navigate to login page
  - Enter valid credentials
  - Verify successful authentication
  - Check session persistence

- [ ] **Core Features**
  - [ ] Dashboard loads
  - [ ] Organization data displayed
  - [ ] Document upload works
  - [ ] RAG search returns results
  - [ ] Reports generate successfully
  - [ ] Autopilot workflows execute

- [ ] **Integrations**
  - [ ] OpenAI API calls succeed
  - [ ] Supabase storage accessible
  - [ ] Email notifications sent (if applicable)
  - [ ] Google Drive sync (if enabled)

- [ ] **Performance**
  - [ ] Page load time < 3s
  - [ ] API response time < 500ms (p95)
  - [ ] No JavaScript console errors

### Critical User Journeys (Playwright)

```bash
# Run critical journeys
pnpm run test:playwright:core

# Journeys typically include:
# - User login
# - Document upload
# - RAG search query
# - Report generation
# - Settings update
```

---

## Rollback Procedures

**Owner:** On-Call Engineer  
**Timeline:** Immediate (if deployment fails)

### When to Rollback

Rollback immediately if:
- Health checks fail after 5 minutes
- Error rate > 5% for > 2 minutes
- Critical functionality broken (login, data access)
- Database migration failure (with data loss risk)
- p95 latency > 2000ms for > 5 minutes

### Rollback Steps

1. **Identify Previous Version**
   ```bash
   # Check previous tag
   git tag --sort=-creatordate | head -5
   
   # Identify previous image version
   docker images | grep prisma-web | head -5
   ```

2. **Rollback Docker Images**
   ```bash
   # Set to previous version
   export SERVICE_VERSION=v1.2.2  # Previous working version
   
   # Redeploy previous version
   docker compose --profile web --profile gateway -f docker-compose.prod.yml up -d
   
   # Verify rollback
   docker compose ps
   docker compose logs --tail=50
   ```

3. **Rollback Database Migrations** (If Necessary)
   ```bash
   # WARNING: Only if migration is reversible and tested
   
   # Prisma migrations (use down migrations if available)
   cd apps/web
   # Prisma doesn't have automatic down migrations
   # Manually revert using SQL if needed
   psql "$DATABASE_URL" -f migrations/rollback/<migration>_down.sql
   
   # Supabase migrations
   # Manually revert using prepared rollback SQL
   psql "$DATABASE_URL" -f supabase/rollbacks/<migration>_rollback.sql
   ```

4. **Restore Database from Backup** (Last Resort)
   ```bash
   # WARNING: Data loss possible. Only for catastrophic failures.
   
   # Identify latest backup
   ls -lt backups/ | head -5
   
   # Restore (requires downtime)
   psql "$DATABASE_URL" < backups/prisma-YYYYMMDD-HHMM.sql
   ```

5. **Verify Rollback**
   ```bash
   # Run smoke tests
   ./smoke-test.sh
   
   # Check error rates in Sentry
   # Check response times in observability platform
   ```

6. **Communicate Rollback**
   ```
   Subject: ROLLBACK COMPLETED - Prisma Glow v1.2.3
   
   Rollback completed at: YYYY-MM-DD HH:MM UTC
   Rolled back to: v1.2.2
   Reason: [Health checks failed / Error rate spike / Database migration issue]
   
   Current status: STABLE
   Next steps: Root cause analysis + fix + re-deploy
   
   Contact: #incidents
   ```

### Post-Rollback Actions
- [ ] Root cause analysis initiated
- [ ] Incident retrospective scheduled
- [ ] Fix identified and tested in staging
- [ ] Re-deployment plan created

---

## Post-Deployment

**Owner:** Release Manager + DevOps  
**Timeline:** T+1 hour after deployment

### Monitoring (First 24 Hours)

1. **Error Rates**
   - Monitor Sentry error dashboard
   - Alert threshold: > 2% error rate

2. **Performance Metrics**
   - p50 latency < 200ms
   - p95 latency < 500ms
   - p99 latency < 1000ms

3. **Business Metrics**
   - Successful logins per hour
   - Document uploads per hour
   - RAG queries per hour
   - Autopilot jobs completed

4. **Infrastructure Metrics**
   - CPU usage < 70%
   - Memory usage < 80%
   - Disk usage < 80%
   - Database connections < 80% of pool

### Observability Dashboards

Check the following dashboards:
- **Application Dashboard** (Grafana/equivalent)
  - Request rate, error rate, latency (RED metrics)
  - Success rate by endpoint
  
- **Infrastructure Dashboard**
  - CPU, memory, disk, network
  - Container health status
  
- **Database Dashboard**
  - Connection pool utilization
  - Query performance
  - Replication lag (if applicable)

### Sign-Off

Once stable for 24 hours:
- [ ] Release notes published
- [ ] Stakeholders notified of successful deployment
- [ ] Monitoring confirmed normal
- [ ] Post-deployment retrospective scheduled (if issues occurred)
- [ ] Documentation updated (if needed)

---

## On-Call Handoff

**Owner:** Release Manager → On-Call Engineer  
**Timeline:** After deployment verification

### Handoff Checklist

- [ ] **Deployment Details**
  - Version deployed: v1.2.3
  - Deployment time: YYYY-MM-DD HH:MM UTC
  - Services updated: [list]
  - Database migrations: [list or "none"]

- [ ] **Known Issues**
  - List any non-critical issues detected
  - Workarounds documented
  - Tickets created for follow-up

- [ ] **Monitoring Focus**
  - Specific metrics to watch
  - Alert thresholds
  - Expected traffic patterns

- [ ] **Rollback Plan**
  - Previous version: v1.2.2
  - Rollback tested: Yes/No
  - Estimated rollback time: 10 minutes

- [ ] **Contacts**
  - Release Manager: [name, contact]
  - Backend Lead: [name, contact]
  - Frontend Lead: [name, contact]
  - SRE: [name, contact]

### On-Call Responsibilities

During the first 24 hours post-deployment:
- Monitor alerts and dashboards
- Respond to incidents within 15 minutes
- Escalate to Release Manager if rollback needed
- Document any issues in #incidents channel

---

## Incident Response

**Owner:** On-Call Engineer  
**Timeline:** Immediate upon detection

### Incident Severity Levels

| Severity | Definition | Response Time | Example |
|----------|------------|---------------|---------|
| **P0 (Critical)** | Complete service outage | 15 minutes | Database down, all services unreachable |
| **P1 (High)** | Major feature broken | 30 minutes | Login broken, data loss risk |
| **P2 (Medium)** | Feature degraded | 2 hours | Slow performance, partial functionality |
| **P3 (Low)** | Minor issue | Next business day | UI glitch, non-critical feature |

### Incident Response Steps

1. **Detect & Acknowledge**
   - Alert triggered or manual detection
   - Acknowledge in incident management system
   - Post to #incidents channel

2. **Assess Severity**
   - Determine severity level (P0-P3)
   - Decide if rollback needed
   - Notify appropriate stakeholders

3. **Mitigate**
   - For P0/P1: Consider immediate rollback
   - For P2/P3: Implement fix or workaround
   - Document actions taken

4. **Resolve & Verify**
   - Verify incident resolved
   - Run smoke tests
   - Monitor for 30 minutes post-resolution

5. **Post-Incident**
   - Write incident report
   - Schedule retrospective
   - Implement preventive measures

### Incident Communication Template

```
🚨 INCIDENT: [Title]

Severity: P[0-3]
Status: INVESTIGATING / MITIGATING / RESOLVED
Started: YYYY-MM-DD HH:MM UTC
Impact: [Description of user impact]

Actions Taken:
- [List actions]

Next Steps:
- [What's being done]

Updates: Every 15 minutes (P0/P1), 1 hour (P2/P3)
```

---

## Appendices

### A. Contact List

| Role | Name | Contact | Backup |
|------|------|---------|--------|
| Release Manager | TBD | TBD | TBD |
| On-Call Engineer | TBD | TBD | TBD |
| Backend Lead | TBD | TBD | TBD |
| Frontend Lead | TBD | TBD | TBD |
| Database Admin | TBD | TBD | TBD |
| Security Lead | TBD | TBD | TBD |

### B. Environment URLs

| Environment | URL | Purpose |
|-------------|-----|---------|
| Development | http://localhost:3000 | Local development |
| Staging | https://staging.prismaglow.com | Pre-production testing |
| Production | https://app.prismaglow.com | Live production |

### C. Key Metrics & SLOs

| Metric | Target (SLO) | Measurement |
|--------|--------------|-------------|
| Availability | 99.9% | Monthly uptime |
| p50 Latency | < 200ms | API response time |
| p95 Latency | < 500ms | API response time |
| p99 Latency | < 1000ms | API response time |
| Error Rate | < 1% | HTTP 5xx / Total requests |
| Success Rate | > 99% | HTTP 2xx / Total requests |

### D. Useful Commands

```bash
# Check service status
docker compose ps

# View logs for specific service
docker compose logs -f web

# Restart service
docker compose restart gateway

# Check database migrations status
psql "$DATABASE_URL" -c "SELECT * FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 10;"

# Check disk space
df -h

# Check memory
free -h

# Check active connections to database
psql "$DATABASE_URL" -c "SELECT count(*) FROM pg_stat_activity;"

# Check slow queries
psql "$DATABASE_URL" -c "SELECT pid, now() - query_start AS duration, query FROM pg_stat_activity WHERE state = 'active' AND now() - query_start > interval '5 seconds';"
```

### E. References

- [Go-Live Readiness Report](./go-live-readiness-report.md)
- [Risk Register](./risk-register.csv)
- [Architecture Decision Records](./adr/)
- [Incident Response Plan](./incident-response.md)
- [Backup & Restore Procedures](./backup-restore.md)

---

**Document Control**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-29 | DevOps Automation | Initial release runbook |

---

**Next Review Date:** 2025-11-29
