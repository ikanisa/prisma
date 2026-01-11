# Incident Response Runbook

**Document Version**: 1.0  
**Last Updated**: January 11, 2026  
**Addresses**: Audit High Priority #16

---

## Incident Classification

| Severity | Definition | Examples | Response Time |
|----------|------------|----------|---------------|
| **P1** | Complete outage | Site down, data breach | 15 min |
| **P2** | Major degradation | Auth broken, DB slow | 1 hour |
| **P3** | Minor degradation | Single feature broken | 4 hours |
| **P4** | Cosmetic/Low impact | UI glitch, typo | 24 hours |

---

## 1. Initial Response

### Step 1: Acknowledge

```bash
# 1. Check monitoring dashboards
# - Cloudflare Analytics
# - Sentry error dashboard
# - Supabase Dashboard

# 2. Verify incident
curl -s https://prisma.ikanisa.com/api/health
```

### Step 2: Communicate

- Update status page (if P1/P2)
- Notify stakeholders per escalation matrix
- Create incident channel/ticket

### Step 3: Assess

- What services are affected?
- What is the user impact?
- When did it start?
- Any recent deployments?

---

## 2. Common Incidents

### 2.1 Application 500 Errors

**Symptoms**: Users seeing error pages, Sentry alerts

**Diagnosis**:
```bash
# Check application logs
wrangler pages deployment tail

# Check recent deployments
git log --oneline -10
```

**Resolution**:
1. Identify error in Sentry
2. If deployment-related: rollback
3. If code bug: hotfix and deploy

---

### 2.2 Database Connection Issues

**Symptoms**: Timeouts, connection refused

**Diagnosis**:
```bash
# Test database connection
psql $DATABASE_URL -c "SELECT 1;"

# Check Supabase status
open https://status.supabase.com
```

**Resolution**:
1. Check Supabase Dashboard for issues
2. Restart Supabase project if needed
3. Contact Supabase support if persistent

---

### 2.3 Authentication Failures

**Symptoms**: Users cannot log in, session errors

**Diagnosis**:
```bash
# Test auth endpoint
curl -X POST https://prisma.ikanisa.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

**Resolution**:
1. Check Supabase Auth settings
2. Verify JWT secret configuration
3. Check for expired certificates

---

### 2.4 High Error Rate

**Symptoms**: Error rate > 1% in monitoring

**Diagnosis**:
1. Check Sentry for error patterns
2. Review recent code changes
3. Check external service status

**Resolution**:
1. Identify and fix root cause
2. Consider rollback if code-related
3. Enable circuit breakers if external

---

## 3. Post-Incident

### Within 24 hours:
- [ ] Root cause identified
- [ ] Immediate fix applied
- [ ] Monitoring enhanced (if needed)

### Within 48 hours:
- [ ] Post-mortem document created
- [ ] Action items assigned
- [ ] Timeline documented
- [ ] Prevention measures identified

### Post-Mortem Template:

```markdown
## Incident Post-Mortem

**Incident**: [Title]
**Date**: [Date]
**Duration**: [X hours]
**Severity**: P[X]

### Summary
[Brief description]

### Timeline
- HH:MM - [Event]
- HH:MM - [Event]

### Root Cause
[Detailed explanation]

### Resolution
[What fixed it]

### Action Items
- [ ] [Task] - Owner - Due Date

### Lessons Learned
[What we learned]
```

---

## 4. Contact Information

| Role | Contact | Availability |
|------|---------|--------------|
| Primary On-Call | [TBD] | 24/7 |
| Backup On-Call | [TBD] | 24/7 |
| Engineering Lead | [TBD] | Business hours |
| Supabase Support | support@supabase.com | 24/7 |
| Cloudflare Support | [Dashboard] | 24/7 |
