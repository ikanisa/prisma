# Operations Runbook: Prisma Glow Autonomous Finance Suite

**Version:** 2.0.0  
**Last Updated:** 2026-01-02  
**On-Call Rotation:** TBD

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Service Inventory](#2-service-inventory)
3. [Health Checks](#3-health-checks)
4. [Common Operations](#4-common-operations)
5. [Incident Response](#5-incident-response)
6. [Troubleshooting Guide](#6-troubleshooting-guide)
7. [Recovery Procedures](#7-recovery-procedures)
8. [Monitoring & Alerts](#8-monitoring--alerts)
9. [Contacts](#9-contacts)

---

## 1. System Overview

### Architecture Summary

```
[Users] → [Cloudflare CDN] → [Frontend (Vite/React)]
                                    ↓
                            [Supabase Auth]
                                    ↓
                            [FastAPI Backend] ←→ [Redis Cache]
                                    ↓
                            [PostgreSQL (Supabase)]
                                    ↓
                            [AI Providers (OpenAI/Gemini)]
```

### Key URLs

| Environment | Frontend | Backend | Supabase |
|-------------|----------|---------|----------|
| Production | `app.prismaglow.com` | `api.prismaglow.com` | Supabase Dashboard |
| Staging | `staging.prismaglow.com` | `api-staging.prismaglow.com` | Supabase Dashboard |

---

## 2. Service Inventory

| Service | Type | Location | Health Endpoint |
|---------|------|----------|-----------------|
| Web Frontend | Static | Cloudflare Pages | N/A |
| FastAPI Backend | Container | Cloud Run/Docker | `/health` |
| Supabase | Managed | Supabase Cloud | Dashboard |
| Redis | Managed | Redis Cloud | N/A |
| Sentry | SaaS | sentry.io | Dashboard |

### Critical Dependencies

| Dependency | Purpose | Fallback |
|------------|---------|----------|
| Supabase | Auth, DB, Storage | None (critical) |
| OpenAI | AI agents | Gemini fallback |
| Gemini | Alt AI provider | OpenAI fallback |
| Redis | Cache, rate limiting | In-memory fallback |

---

## 3. Health Checks

### Backend Health Check

```bash
# Check health endpoint
curl -s https://api.prismaglow.com/health | jq .

# Expected response:
{
  "status": "healthy",
  "timestamp": "2026-01-02T22:00:00Z"
}
```

### Readiness Check

```bash
curl -s https://api.prismaglow.com/readiness | jq .

# Expected response:
{
  "status": "ready",
  "checks": {
    "database": "ok",
    "redis": "ok",
    "supabase": "ok"
  }
}
```

### Database Connectivity

```bash
# Via Supabase CLI
supabase db ping

# Direct psql
psql "$DATABASE_URL" -c "SELECT 1;"
```

---

## 4. Common Operations

### 4.1 Deploy New Version

```bash
# Tag release
git tag -a v2.0.1 -m "Release v2.0.1"
git push origin v2.0.1

# Trigger deployment (GitHub Actions)
gh workflow run deploy.yml --ref v2.0.1

# Monitor deployment
gh run watch
```

### 4.2 Run Database Migration

```bash
# Staging
supabase db push --linked

# Production (with review)
supabase db push --linked --dry-run
supabase db push --linked
```

### 4.3 Clear Cache

```bash
# Redis CLI
redis-cli FLUSHDB

# Via API (if implemented)
curl -X POST https://api.prismaglow.com/admin/cache/clear \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### 4.4 Restart Backend Service

```bash
# Cloud Run
gcloud run services update prisma-api --region=us-central1 --no-traffic

# Docker Compose
docker-compose restart api
```

### 4.5 View Logs

```bash
# Cloud Run
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=prisma-api" --limit=100

# Docker
docker logs prisma-api --tail=100 -f

# Supabase Functions
supabase functions logs --name accounting-close
```

---

## 5. Incident Response

### Severity Levels

| Level | Definition | Response Time | Escalation |
|-------|------------|---------------|------------|
| SEV1 | Service down, data loss | 15 min | Immediate |
| SEV2 | Major feature broken | 1 hour | Manager |
| SEV3 | Minor feature impaired | 4 hours | Next shift |
| SEV4 | Cosmetic/minor issue | 24 hours | Backlog |

### Incident Workflow

```
1. DETECT → Alert received or user report
2. TRIAGE → Assess severity and impact
3. NOTIFY → Alert stakeholders per severity
4. INVESTIGATE → Identify root cause
5. MITIGATE → Implement fix or workaround
6. RESOLVE → Confirm service restored
7. POSTMORTEM → Document within 48 hours
```

### Incident Declaration

```markdown
## Incident: [TITLE]

**Severity:** SEV[1-4]
**Status:** Investigating | Identified | Monitoring | Resolved
**Started:** YYYY-MM-DD HH:MM UTC
**Resolved:** YYYY-MM-DD HH:MM UTC

### Impact
[Description of user impact]

### Timeline
- HH:MM - Event
- HH:MM - Event

### Root Cause
[Description]

### Action Items
- [ ] Item 1
- [ ] Item 2
```

---

## 6. Troubleshooting Guide

### 6.1 Authentication Failures

**Symptoms:** Users cannot log in, 401 errors

**Checks:**
```bash
# Verify JWT secret configured
echo $SUPABASE_JWT_SECRET | wc -c  # Should be > 50

# Check Supabase Auth status
curl -s "$SUPABASE_URL/auth/v1/health"

# Review auth logs
grep -i "auth" /var/log/prisma-api.log | tail -20
```

**Common Causes:**
- JWT secret mismatch between environments
- Supabase Auth service issue
- Clock skew on server

**Resolution:**
1. Verify environment variables
2. Check Supabase status page
3. Restart backend service

---

### 6.2 Database Connection Issues

**Symptoms:** 500 errors, timeouts, "connection refused"

**Checks:**
```bash
# Test connection
psql "$DATABASE_URL" -c "SELECT NOW();"

# Check connection count
psql "$DATABASE_URL" -c "SELECT count(*) FROM pg_stat_activity;"

# Verify Supabase status
curl -s "$SUPABASE_URL/rest/v1/" -H "apikey: $SUPABASE_ANON_KEY"
```

**Common Causes:**
- Connection pool exhausted
- Database at capacity
- Network issue

**Resolution:**
1. Restart backend to reset connections
2. Scale database if at capacity
3. Check Supabase network status

---

### 6.3 AI Agent Failures

**Symptoms:** Agent responses fail, timeouts, rate limit errors

**Checks:**
```bash
# OpenAI status
curl -s https://status.openai.com/api/v2/status.json

# Check rate limit headers in logs
grep "x-ratelimit-remaining" /var/log/prisma-api.log

# Verify API key
curl -s https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY" | head
```

**Common Causes:**
- API rate limits exceeded
- OpenAI service outage
- Invalid/expired API key

**Resolution:**
1. Switch to fallback provider (Gemini)
2. Implement request queuing
3. Contact OpenAI support if key issue

---

### 6.4 High Latency

**Symptoms:** Slow page loads, API timeouts > 10s

**Checks:**
```bash
# Check system resources
top -bn1 | head -20

# Check Redis latency
redis-cli --latency

# Check database query performance
psql "$DATABASE_URL" -c "SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"
```

**Common Causes:**
- Slow database queries
- Cache cold start
- Vector search overload
- Resource exhaustion

**Resolution:**
1. Identify slow queries and optimize
2. Warm up cache
3. Scale resources if needed

---

### 6.5 Rate Limiting Errors

**Symptoms:** 429 Too Many Requests responses

**Checks:**
```bash
# Check Redis rate limit keys
redis-cli KEYS "rl:*" | head -20

# Review rate limit configuration
grep "RATE_LIMIT" .env
```

**Resolution:**
1. Verify legitimate traffic vs. abuse
2. Adjust limits if needed
3. Block abusive IPs at CDN level

---

## 7. Recovery Procedures

### 7.1 Rollback Deployment

```bash
# Identify last good version
git log --oneline -10

# Rollback to specific version
gh workflow run deploy.yml --ref v2.0.0

# Or manual rollback
gcloud run services update-traffic prisma-api \
  --to-revisions=prisma-api-00123=100
```

### 7.2 Database Rollback

```bash
# Point-in-time recovery (Supabase)
# Use Supabase Dashboard → Database → Backups → Restore

# Manual migration rollback
supabase db reset  # WARNING: Destructive
```

### 7.3 Disaster Recovery

| Scenario | RTO | RPO | Procedure |
|----------|-----|-----|-----------|
| Backend failure | 15 min | 0 | Redeploy from container registry |
| Database corruption | 1 hour | 1 hour | PITR from Supabase |
| Complete outage | 4 hours | 1 hour | Restore from backup region |

---

## 8. Monitoring & Alerts

### Dashboards

| Dashboard | URL | Purpose |
|-----------|-----|---------|
| Sentry | `sentry.io/prisma-glow` | Errors, performance |
| Supabase | `supabase.com/dashboard` | Database, auth, storage |
| Cloudflare | `dash.cloudflare.com` | CDN, security |

### Alert Thresholds

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| Error rate | > 1% | > 5% | Investigate immediately |
| P95 latency | > 2s | > 5s | Scale or optimize |
| CPU usage | > 70% | > 90% | Scale up |
| Memory usage | > 80% | > 95% | Scale up or restart |
| Disk usage | > 70% | > 90% | Cleanup or expand |

### Alert Channels

| Severity | Channels |
|----------|----------|
| SEV1 | PagerDuty, Slack #incidents, Phone |
| SEV2 | Slack #incidents, Email |
| SEV3 | Slack #alerts |
| SEV4 | Email digest |

---

## 9. Contacts

### On-Call Rotation

| Role | Primary | Backup |
|------|---------|--------|
| Backend | TBD | TBD |
| Frontend | TBD | TBD |
| DevOps | TBD | TBD |
| Database | TBD | TBD |

### Escalation Path

```
L1: On-Call Engineer (15 min response)
    ↓
L2: Engineering Lead (30 min response)
    ↓
L3: CTO (1 hour response)
```

### Vendor Contacts

| Vendor | Support | Account Manager |
|--------|---------|-----------------|
| Supabase | support@supabase.io | TBD |
| OpenAI | help.openai.com | TBD |
| Cloudflare | support.cloudflare.com | TBD |

---

## Appendix: Quick Commands

```bash
# === Health Checks ===
curl -s https://api.prismaglow.com/health
curl -s https://api.prismaglow.com/readiness

# === Logs ===
gcloud logging read "resource.labels.service_name=prisma-api" --limit=50
docker logs prisma-api --tail=100 -f

# === Database ===
psql "$DATABASE_URL" -c "SELECT count(*) FROM organization_members;"
supabase db push --linked --dry-run

# === Cache ===
redis-cli INFO stats
redis-cli KEYS "rl:*" | wc -l

# === Deployment ===
gh workflow run deploy.yml --ref main
gcloud run services describe prisma-api

# === Monitoring ===
curl -s https://status.openai.com/api/v2/status.json | jq .status
```

---

*Runbook maintained by Operations team. Review and update monthly.*
