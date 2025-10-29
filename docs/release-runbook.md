# Release Runbook

## Table of Contents
- [Overview](#overview)
- [Pre-Release Checklist](#pre-release-checklist)
- [Build Process](#build-process)
- [Testing Process](#testing-process)
- [Staging Deployment](#staging-deployment)
- [Production Deployment](#production-deployment)
- [Smoke Tests](#smoke-tests)
- [Rollback Procedures](#rollback-procedures)
- [Post-Deployment](#post-deployment)
- [On-Call Handoff](#on-call-handoff)
- [Hotfix Process](#hotfix-process)
- [Emergency Response](#emergency-response)

## Overview

This runbook documents the complete release process for Prisma Glow, from feature development through production deployment. It covers standard releases, hotfixes, and emergency rollback procedures.

### Release Cadence

- **Standard Releases**: Weekly (Thursdays, 10:00 UTC)
- **Hotfixes**: As needed (follow expedited process)
- **Emergency Patches**: Within 2 hours of critical issue discovery

### Release Types

| Type | Description | Approval Required | Testing Requirements |
|------|-------------|-------------------|---------------------|
| **Major** | Breaking changes, new features | Engineering Manager + Product | Full regression suite |
| **Minor** | New features, backwards-compatible | Engineering Manager | Integration + smoke tests |
| **Patch** | Bug fixes, no new features | Team Lead | Affected area tests + smoke |
| **Hotfix** | Critical production bug fix | On-call + Team Lead | Targeted tests + smoke |

### Roles and Responsibilities

| Role | Responsibilities |
|------|------------------|
| **Release Manager** | Coordinates release, updates tracking, ensures checklist completion |
| **On-Call Engineer** | Monitors deployment, responds to incidents |
| **QA Lead** | Signs off on test results |
| **DevOps** | Executes deployment, manages infrastructure |
| **Engineering Manager** | Final approval for production deployment |

## Pre-Release Checklist

### Code Readiness

- [ ] All PRs merged to `main` branch
- [ ] CI/CD pipeline passing (green builds)
  - [ ] Lint checks passing
  - [ ] TypeScript compilation successful
  - [ ] All unit tests passing
  - [ ] Integration tests passing
  - [ ] Code coverage meets thresholds (≥45% Vitest, ≥60% pytest)
  - [ ] No security vulnerabilities (CodeQL, dependency audit)
- [ ] Code review approvals obtained (minimum 2 reviewers)
- [ ] ADRs created for architectural changes
- [ ] Documentation updated (README, API docs, runbooks)
- [ ] CHANGELOG.md updated with release notes

### Database Migrations

- [ ] Migration scripts reviewed and tested on staging
  - [ ] Supabase migrations in `supabase/migrations/` validated
  - [ ] Prisma migrations in `apps/web/prisma/migrations/` validated
  - [ ] Migration rollback strategy documented
- [ ] pgTAP policy tests passing
- [ ] Database backup taken before migration
- [ ] Migration dry-run completed on staging
- [ ] Performance impact assessed (no blocking operations)
- [ ] Data consistency verified post-migration

### Configuration

- [ ] Environment variables documented in `.env.example`
- [ ] Secrets rotated if needed (see `SECURITY.md`)
- [ ] `config/system.yaml` validated
- [ ] Rate limits reviewed and adjusted if needed
- [ ] Feature flags configured appropriately

### Dependencies

- [ ] Dependency updates reviewed
- [ ] `pnpm-lock.yaml` committed
- [ ] `server/requirements.txt` pinned versions
- [ ] No critical/high severity vulnerabilities
- [ ] SBOM generated (if available)

### Testing

- [ ] All automated tests passing
- [ ] Manual testing completed for new features
- [ ] Playwright e2e tests passing
- [ ] Load tests passing (Artillery/k6)
- [ ] Regression testing completed
- [ ] Accessibility testing completed (for UI changes)

### Documentation

- [ ] User-facing changes documented
- [ ] API changes documented (OpenAPI spec updated)
- [ ] Deployment notes prepared
- [ ] Known issues documented
- [ ] Migration guide prepared (if breaking changes)

## Build Process

### 1. Tag the Release

```bash
# Fetch latest changes
git fetch origin
git checkout main
git pull origin main

# Create release tag
git tag -a v1.2.3 -m "Release v1.2.3: Description of changes"
git push origin v1.2.3
```

**Tag Format**: `v<major>.<minor>.<patch>` (semantic versioning)

### 2. Build Docker Images

Docker images are built automatically by GitHub Actions (`.github/workflows/docker-build.yml`) on:
- Push to `main` branch (tagged as `latest` and commit SHA)
- Git tags matching `v*` (tagged as version number)

**Manual Build** (if needed):
```bash
# Set version
export SERVICE_VERSION=$(git rev-parse --short HEAD)

# Build images
docker build -t ghcr.io/ikanisa/prisma/gateway:${SERVICE_VERSION} ./gateway
docker build -t ghcr.io/ikanisa/prisma/fastapi:${SERVICE_VERSION} ./server
docker build -t ghcr.io/ikanisa/prisma/rag:${SERVICE_VERSION} ./rag
docker build -t ghcr.io/ikanisa/prisma/agent:${SERVICE_VERSION} ./agent
docker build -t ghcr.io/ikanisa/prisma/analytics:${SERVICE_VERSION} ./analytics
docker build -t ghcr.io/ikanisa/prisma/web:${SERVICE_VERSION} ./apps/web

# Push to registry
docker push ghcr.io/ikanisa/prisma/gateway:${SERVICE_VERSION}
# ... repeat for other services
```

### 3. Verify Build Artifacts

- [ ] Docker images pushed to GHCR
- [ ] Image tags correct (version, commit SHA, latest)
- [ ] Image sizes reasonable (no bloat)
- [ ] Health check CMD present in images
- [ ] OCI labels include version metadata

## Testing Process

### 1. Unit Tests

```bash
# TypeScript tests
pnpm run test

# Python tests
pytest

# Coverage report
pnpm run coverage
```

**Acceptance Criteria**:
- All tests pass
- Coverage ≥45% (Vitest), ≥60% (pytest)
- No flaky tests (run 3 times to confirm)

### 2. Integration Tests

```bash
# Gateway integration tests
pnpm --filter @prisma-glow/gateway test

# Web app tests
pnpm --filter web test

# RAG service tests
pnpm --filter @prisma-glow/rag test
```

**Acceptance Criteria**:
- All integration tests pass
- Database interactions validated
- External API mocks working

### 3. End-to-End Tests

```bash
# Start staging environment
docker compose -f docker-compose.prod.yml --env-file .env.staging up -d

# Run Playwright tests
PLAYWRIGHT_BASE_URL=https://staging.example.com pnpm run test:playwright

# Run core journeys
pnpm run test:playwright:core
```

**Test Scenarios**:
- User login/logout
- Knowledge base search
- Task creation and execution
- Agent interactions
- Document upload/download

**Acceptance Criteria**:
- All e2e tests pass
- Screenshots/videos captured for failures
- Performance within SLO (p95 < 1s)

### 4. Load Tests

```bash
# Artillery load test
pnpm run load:test

# k6 performance test
./scripts/perf/run_k6.sh ada recon telemetry
```

**Acceptance Criteria**:
- Error rate < 1%
- p95 latency < 1s
- p99 latency < 3s
- No memory leaks
- Database connections stable

### 5. Security Tests

- [ ] Secret scanning passed (gitleaks)
- [ ] Dependency audit clean (`pnpm audit`, `pip-audit`)
- [ ] CodeQL analysis passed (if configured)
- [ ] OWASP ZAP scan (for major releases)
- [ ] Container vulnerability scan (Trivy, Snyk)

## Staging Deployment

### 1. Prepare Staging Environment

```bash
# SSH to staging server
ssh deploy@staging.example.com

# Navigate to deployment directory
cd /opt/prisma-glow

# Backup current configuration
cp .env.compose .env.compose.backup
cp docker-compose.prod.yml docker-compose.prod.yml.backup
```

### 2. Update Configuration

```bash
# Update .env.compose with new image tags
nano .env.compose

# Set image tags to new version
# Example:
# GATEWAY_IMAGE=ghcr.io/ikanisa/prisma/gateway:v1.2.3
# FASTAPI_IMAGE=ghcr.io/ikanisa/prisma/fastapi:v1.2.3
# ...
```

### 3. Apply Database Migrations

```bash
# Backup database
pg_dump "$DATABASE_URL" > backup-$(date +%Y%m%d-%H%M%S).sql

# Apply Supabase migrations
for migration in supabase/migrations/*.sql; do
  psql "$DATABASE_URL" -f "$migration"
done

# Verify migrations
psql "$DATABASE_URL" -c "SELECT * FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 5;"

# Apply Prisma migrations (if web app updated)
docker compose run --rm web npx prisma migrate deploy
```

### 4. Deploy Services

```bash
# Pull new images
docker compose --env-file .env.compose --profile web -f docker-compose.prod.yml pull

# Stop old containers
docker compose --env-file .env.compose --profile web -f docker-compose.prod.yml down

# Start new containers
docker compose --env-file .env.compose --profile web -f docker-compose.prod.yml up -d

# Wait for services to be ready
sleep 30

# Check container status
docker compose --env-file .env.compose --profile web -f docker-compose.prod.yml ps
```

### 5. Verify Staging Deployment

```bash
# Health checks
curl -f https://staging.example.com/health || echo "Health check failed"
curl -f https://staging.example.com/readiness || echo "Readiness check failed"

# Check logs for errors
docker compose --env-file .env.compose --profile web -f docker-compose.prod.yml logs --tail=100

# Run smoke tests
PLAYWRIGHT_BASE_URL=https://staging.example.com pnpm run test:playwright
```

**Acceptance Criteria**:
- All services healthy
- No errors in logs (first 5 minutes)
- Smoke tests passing
- Manual verification of key features

### 6. Staging Soak Period

**Wait Time**: Minimum 4 hours (24 hours for major releases)

**Monitoring**:
- [ ] Error rates stable
- [ ] Latency within SLO
- [ ] Memory usage stable (no leaks)
- [ ] Database connection pool healthy
- [ ] No unexpected errors in Sentry

**Sign-Off**: QA Lead + Engineering Manager

## Production Deployment

### Prerequisites

- [ ] Staging deployment successful and stable
- [ ] Soak period completed
- [ ] All stakeholders notified
- [ ] Change window approved
- [ ] On-call engineer available
- [ ] Rollback plan confirmed

### 1. Pre-Deployment Communication

**Notification Template**:
```
Subject: Production Deployment - v1.2.3 (2025-10-29 10:00 UTC)

Team,

We will be deploying v1.2.3 to production on Thursday, Oct 29 at 10:00 UTC.

Changes:
- Feature: Knowledge base search improvements
- Fix: Task execution timeout handling
- Dependency: Upgrade OpenAI SDK to v6.6.0

Expected downtime: None (rolling update)
Impact: No user-facing changes

Staging validation: Completed (4-hour soak)
Rollback plan: Ready (tag v1.2.2)

Release Manager: [Name]
On-Call: [Name]

Please confirm readiness or raise concerns by 09:30 UTC.

Thanks,
[Release Manager]
```

**Notification Channels**:
- #engineering Slack channel
- Email to stakeholders
- Status page update (if user-facing changes)

### 2. Freeze Deployments

```bash
# Set maintenance flag (if needed)
# This prevents other deployments during the window
touch /opt/prisma-glow/.maintenance
```

### 3. Backup Production

```bash
# Database backup
pg_dump "$PROD_DATABASE_URL" > prod-backup-$(date +%Y%m%d-%H%M%S).sql
gzip prod-backup-$(date +%Y%m%d-%H%M%S).sql

# Upload to secure storage
aws s3 cp prod-backup-$(date +%Y%m%d-%H%M%S).sql.gz s3://backups/prisma-glow/

# Configuration backup
tar czf config-backup-$(date +%Y%m%d-%H%M%S).tar.gz .env.compose docker-compose.prod.yml
```

### 4. Apply Database Migrations

**For Supabase**:
```bash
# Apply migrations one at a time
for migration in supabase/migrations/NEW_*.sql; do
  echo "Applying $migration"
  psql "$PROD_DATABASE_URL" -f "$migration"
  
  # Verify migration success
  if [ $? -ne 0 ]; then
    echo "Migration failed! Rolling back..."
    # Execute rollback if available
    # psql "$PROD_DATABASE_URL" -f "${migration/.sql/_rollback.sql}"
    exit 1
  fi
done
```

**For Prisma**:
```bash
# Deploy Prisma migrations
docker compose --env-file .env.compose --profile web run --rm web npx prisma migrate deploy
```

### 5. Deploy Using GitHub Actions

**Option A: GitHub Actions Workflow**

1. Navigate to GitHub Actions → "Compose Deploy (SSH)"
2. Click "Run workflow"
3. Fill in parameters:
   - **profile**: `web` (or `ui` for legacy)
   - **deploy_path**: `/opt/prisma-glow`
   - **rollback_tag**: (leave empty for new deployment)
4. Monitor workflow execution

**Option B: Manual SSH Deployment**

```bash
# SSH to production
ssh deploy@production.example.com
cd /opt/prisma-glow

# Update image tags in .env.compose
nano .env.compose
# Set all *_IMAGE variables to new version (e.g., v1.2.3)

# Pull new images
docker compose --env-file .env.compose --profile web -f docker-compose.prod.yml pull

# Rolling update (zero downtime)
docker compose --env-file .env.compose --profile web -f docker-compose.prod.yml up -d --no-deps --build gateway
sleep 30
docker compose --env-file .env.compose --profile web -f docker-compose.prod.yml up -d --no-deps --build fastapi
sleep 30
docker compose --env-file .env.compose --profile web -f docker-compose.prod.yml up -d --no-deps --build rag
sleep 30
docker compose --env-file .env.compose --profile web -f docker-compose.prod.yml up -d --no-deps --build web
```

### 6. Verify Production Deployment

```bash
# Health checks
curl -f https://app.prismaglow.com/health || echo "ALERT: Health check failed!"
curl -f https://app.prismaglow.com/readiness || echo "ALERT: Readiness check failed!"

# Check all service health
curl -f https://api.prismaglow.com/health
curl -f https://rag.prismaglow.com/health
curl -f https://analytics.prismaglow.com/health

# Verify version
curl https://app.prismaglow.com/api/version
# Should return: {"version": "v1.2.3", "commit": "abc123", "deployed": "2025-10-29T10:00:00Z"}

# Check logs for errors
docker compose --env-file .env.compose --profile web -f docker-compose.prod.yml logs --tail=100 --timestamps

# Check container status
docker compose --env-file .env.compose --profile web -f docker-compose.prod.yml ps
```

**Acceptance Criteria**:
- All services report healthy
- Version endpoint returns correct version
- No critical errors in logs
- Container restart count = 0

## Smoke Tests

### Automated Smoke Tests

```bash
# Run synthetic checks
./scripts/smoke/healthz-checks.sh production

# Run Playwright smoke tests
PLAYWRIGHT_BASE_URL=https://app.prismaglow.com \
PLAYWRIGHT_SMOKE_PATHS="/, /login, /dashboard" \
pnpm run test:playwright
```

### Manual Smoke Tests

Perform these critical user journeys manually:

#### 1. Authentication Flow
- [ ] Navigate to https://app.prismaglow.com
- [ ] Click "Login"
- [ ] Enter credentials
- [ ] Verify redirect to dashboard
- [ ] Check user profile loads correctly

#### 2. Knowledge Base Search
- [ ] Navigate to Knowledge Base
- [ ] Enter search query: "VAT rates UK"
- [ ] Verify results returned within 2 seconds
- [ ] Click on result to view document
- [ ] Verify document content displays

#### 3. Task Execution
- [ ] Navigate to Tasks
- [ ] Create new task: "Test task for deployment"
- [ ] Assign to self
- [ ] Click "Execute"
- [ ] Verify task runs and completes
- [ ] Check task output is correct

#### 4. Document Upload
- [ ] Navigate to Documents
- [ ] Click "Upload"
- [ ] Select test PDF file
- [ ] Verify upload progress bar
- [ ] Verify document appears in list
- [ ] Download document and verify integrity

#### 5. Agent Interaction
- [ ] Navigate to Agent Chat
- [ ] Enter prompt: "What is the current VAT rate in the UK?"
- [ ] Verify agent responds within 5 seconds
- [ ] Verify response is accurate
- [ ] Check sources are cited

**Acceptance Criteria**:
- All smoke tests pass
- Response times within SLO
- No JavaScript errors in browser console
- No 5xx errors in network tab

## Rollback Procedures

### When to Rollback

Initiate rollback immediately if:
- Critical functionality broken (P0 incident)
- Data integrity issue detected
- Security vulnerability exposed
- Error rate > 5%
- Service unavailable for > 5 minutes

### Rollback Decision Tree

```
Is the issue critical? (P0/P1)
├─ YES → Rollback immediately
└─ NO
   ├─ Can it be hotfixed in < 30 minutes?
   │  ├─ YES → Attempt hotfix
   │  └─ NO → Rollback
   └─ Is workaround available?
      ├─ YES → Apply workaround, schedule fix
      └─ NO → Rollback
```

### Rollback Process

#### 1. Declare Incident

```bash
# Notify team
# Post in #incidents Slack channel:
"🚨 INCIDENT: Rolling back production deployment v1.2.3 due to [reason]"

# Assign Incident Commander
# Update status page
```

#### 2. Identify Last Known Good Version

```bash
# Check deployment history
docker compose --env-file .env.compose --profile web -f docker-compose.prod.yml images

# Identify previous version (e.g., v1.2.2)
ROLLBACK_VERSION="v1.2.2"
```

#### 3. Rollback Application

**Option A: GitHub Actions**

1. Navigate to GitHub Actions → "Compose Deploy (SSH)"
2. Click "Run workflow"
3. Fill in parameters:
   - **profile**: `web`
   - **deploy_path**: `/opt/prisma-glow`
   - **rollback_tag**: `v1.2.2`
4. Monitor workflow execution

**Option B: Manual Rollback**

```bash
# SSH to production
ssh deploy@production.example.com
cd /opt/prisma-glow

# Update .env.compose to previous version
sed -i 's/:v1.2.3/:v1.2.2/g' .env.compose

# Pull old images
docker compose --env-file .env.compose --profile web -f docker-compose.prod.yml pull

# Restart services
docker compose --env-file .env.compose --profile web -f docker-compose.prod.yml down
docker compose --env-file .env.compose --profile web -f docker-compose.prod.yml up -d

# Verify rollback
curl -f https://app.prismaglow.com/api/version
```

#### 4. Rollback Database (if needed)

**⚠️ CAUTION**: Database rollback is risky. Only perform if absolutely necessary.

```bash
# Restore from backup
gunzip prod-backup-YYYYMMDD-HHMMSS.sql.gz
psql "$PROD_DATABASE_URL" < prod-backup-YYYYMMDD-HHMMSS.sql

# Verify data integrity
psql "$PROD_DATABASE_URL" -c "SELECT COUNT(*) FROM organizations;"
```

**Alternative: Rollback Specific Migration**

```bash
# If rollback script exists
psql "$PROD_DATABASE_URL" -f supabase/migrations/YYYYMMDD_migration_rollback.sql
```

#### 5. Verify Rollback

```bash
# Run smoke tests
./scripts/smoke/healthz-checks.sh production

# Check logs
docker compose --env-file .env.compose --profile web -f docker-compose.prod.yml logs --tail=200

# Manual verification of critical features
```

#### 6. Post-Rollback Communication

```
Subject: Rollback Complete - v1.2.3 → v1.2.2

Team,

We have rolled back production from v1.2.3 to v1.2.2 due to [reason].

Rollback completed at: [timestamp]
Services verified: All systems operational

Root cause: [brief description]
Next steps:
1. Post-mortem scheduled for [date/time]
2. Fix will be deployed in next release cycle
3. Tracking issue: #123

Incident timeline:
- 10:00 UTC: Deployment started (v1.2.3)
- 10:15 UTC: Issue detected (error rate spike)
- 10:20 UTC: Rollback initiated
- 10:30 UTC: Rollback complete, services verified

On-Call: [Name]
Incident Commander: [Name]

Thanks for your patience.
[Release Manager]
```

## Post-Deployment

### 1. Monitoring (First 2 Hours)

**Watch for**:
- Error rate spikes
- Latency increases
- Memory leaks
- Database connection pool exhaustion
- Increased error logs in Sentry

**Dashboards to Monitor**:
- Grafana: https://grafana.example.com/d/prisma-overview
- Sentry: https://sentry.io/organizations/prisma-glow
- Supabase Logs: https://supabase.com/dashboard/project/[project-id]/logs

**Alert Thresholds**:
- Error rate > 1%
- p95 latency > 1.5s
- Memory usage > 80%
- CPU usage > 80%

### 2. Verification Tasks

- [ ] Run full smoke test suite
- [ ] Verify Sentry release tagged correctly
- [ ] Check OpenTelemetry traces for new version
- [ ] Confirm metrics being collected
- [ ] Verify database migrations applied
- [ ] Check storage bucket policies (if changed)
- [ ] Validate rate limits working
- [ ] Test authentication flows
- [ ] Verify external integrations (OpenAI, Google Drive)

### 3. Update Tracking

- [ ] Close release issue
- [ ] Update CHANGELOG.md
- [ ] Tag Sentry release
- [ ] Update status page
- [ ] Archive deployment notes

### 4. Communication

**Success Notification**:
```
Subject: Production Deployment Complete - v1.2.3 ✅

Team,

v1.2.3 has been successfully deployed to production.

Deployment time: 10:00 - 10:30 UTC (30 minutes)
Downtime: None
Issues: None

All systems operational. Monitoring for next 24 hours.

Release notes: https://github.com/ikanisa/prisma/releases/tag/v1.2.3

Thanks to everyone involved!
[Release Manager]
```

### 5. Post-Deployment Review (Next Day)

Schedule a 30-minute review meeting with:
- Release Manager
- On-Call Engineer
- Team Lead
- QA Lead

**Agenda**:
1. Review deployment metrics
2. Discuss any issues or near-misses
3. Identify process improvements
4. Update runbook if needed

## On-Call Handoff

### Handoff Checklist

The releasing engineer must brief the on-call engineer on:

- [ ] Summary of changes in this release
- [ ] Known issues or workarounds
- [ ] Rollback procedure review
- [ ] Monitoring dashboard overview
- [ ] Recent alerts and false positives
- [ ] Escalation contacts (if incident occurs)
- [ ] Location of deployment artifacts (logs, configs)

### Handoff Template

```
On-Call Handoff - v1.2.3 Deployment

Deployed: 2025-10-29 10:30 UTC
Version: v1.2.3
Last Known Good: v1.2.2

Changes:
- [Brief list of key changes]

Known Issues:
- None (or list any)

Watch For:
- [Specific areas that might have issues]

Rollback:
- Process documented in docs/release-runbook.md
- Images available: ghcr.io/ikanisa/prisma/*:v1.2.2

Monitoring:
- Grafana: https://grafana.example.com/d/prisma-overview
- Sentry: https://sentry.io/organizations/prisma-glow
- Logs: `docker compose logs -f`

Escalation:
- Primary: [Name] (+1-XXX-XXX-XXXX)
- Secondary: [Name] (+1-XXX-XXX-XXXX)
- Engineering Manager: [Name] (+1-XXX-XXX-XXXX)

Questions? Ask in #oncall or ping me directly.

[Release Manager]
```

## Hotfix Process

### When to Use Hotfix Process

Use hotfix process for:
- Critical production bugs (P0/P1)
- Security vulnerabilities
- Data integrity issues
- Service outages

**Do NOT use for**:
- Minor bugs (P2/P3)
- Feature requests
- Performance optimizations (unless critical)

### Hotfix Steps

#### 1. Create Hotfix Branch

```bash
# Branch from last production tag
git checkout v1.2.3
git checkout -b hotfix/critical-bug-fix

# Make minimal changes (only what's needed to fix issue)
# ... edit files ...

# Commit with clear message
git commit -m "Hotfix: Fix critical authentication bug"

# Push branch
git push origin hotfix/critical-bug-fix
```

#### 2. Fast-Track Review

- Create PR with `[HOTFIX]` prefix
- Request review from Team Lead or Engineering Manager
- Skip normal review process if critical (get approval via Slack)
- Ensure CI passes

#### 3. Tag Hotfix

```bash
# Merge hotfix to main
git checkout main
git merge hotfix/critical-bug-fix

# Tag with patch version bump
git tag -a v1.2.4 -m "Hotfix v1.2.4: Critical authentication bug fix"
git push origin v1.2.4
```

#### 4. Expedited Deployment

- Skip staging soak (deploy directly to production)
- Reduce monitoring window to 1 hour (instead of 4)
- Follow same deployment process as standard release
- Notify team immediately

#### 5. Post-Hotfix

- [ ] Backport to any active release branches
- [ ] Update CHANGELOG.md
- [ ] Document root cause in post-mortem
- [ ] Create issue to prevent recurrence
- [ ] Update tests to catch similar issues

## Emergency Response

### Incident Severity Levels

| Severity | Description | Response Time | Escalation |
|----------|-------------|--------------|------------|
| **P0** | Complete outage, data loss risk | Immediate | All hands |
| **P1** | Critical feature broken | < 30 minutes | On-call + Team Lead |
| **P2** | Major feature degraded | < 2 hours | On-call |
| **P3** | Minor issue, workaround exists | < 24 hours | Standard queue |

### Emergency Contacts

**Primary On-Call**: Rotates weekly (see PagerDuty schedule)

**Escalation Chain**:
1. On-Call Engineer
2. Team Lead
3. Engineering Manager
4. CTO

**Emergency Communication**:
- Slack: #incidents (immediate)
- PagerDuty: For automated alerts
- Phone: For P0 incidents

### Incident Response Process

1. **Detect**: Alert fires, user report, monitoring dashboard
2. **Acknowledge**: On-call engineer acknowledges incident within 5 minutes
3. **Assess**: Determine severity (P0-P3)
4. **Communicate**: Post in #incidents, update status page
5. **Mitigate**: Apply immediate fix or rollback
6. **Verify**: Confirm issue resolved
7. **Document**: Record timeline and actions in `docs/OPERATIONS/incidents/`
8. **Post-Mortem**: Schedule review within 5 business days

See `docs/SECURITY/incident-response.md` for full incident response procedures.

## Related Documentation

- [Architecture Documentation](architecture.md) - System architecture overview
- [Production Operations Runbook](PHASE5/production-operations-runbook.md) - Daily operations
- [Deployment Guides](deployment/) - Environment-specific deployment instructions
- [Security Guidelines](../SECURITY.md) - Security best practices
- [Contributing Guide](../CONTRIBUTING.md) - Development workflow

## Changelog

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-10-29 | 1.0 | Initial release runbook | Engineering Team |

---

**Maintained By**: DevOps Team  
**Review Cadence**: Quarterly or after major incidents  
**Last Updated**: 2025-10-29
