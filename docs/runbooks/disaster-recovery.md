# Disaster Recovery Runbook

**Document Version**: 1.0  
**Last Updated**: January 11, 2026  
**Addresses**: Audit Blocker #10

---

## Overview

This runbook provides step-by-step procedures for disaster recovery scenarios affecting the Prisma application infrastructure.

## Recovery Objectives

| Metric | Target | Description |
|--------|--------|-------------|
| **RTO** | 4 hours | Recovery Time Objective - maximum acceptable downtime |
| **RPO** | 1 hour | Recovery Point Objective - maximum acceptable data loss |

---

## 1. Database Recovery

### 1.1 Supabase Point-in-Time Recovery

**Scenario**: Database corruption, accidental deletion, or ransomware

```bash
# 1. Access Supabase Dashboard
# Navigate to: Settings → Database → Backups

# 2. Select recovery point (within last 7 days)
# Click "Restore to Point in Time"

# 3. Verify recovery
psql $DATABASE_URL -c "SELECT COUNT(*) FROM user_profiles;"
```

### 1.2 Manual Backup Restoration

```bash
# 1. Download latest backup from Supabase
# Settings → Database → Backups → Download

# 2. Create new database (if needed)
supabase db reset

# 3. Restore backup
psql $NEW_DATABASE_URL < backup.sql

# 4. Run migrations
pnpm --filter web prisma:migrate:deploy

# 5. Verify data integrity
pnpm run db:verify
```

### 1.3 Data Integrity Verification

```sql
-- Run after any recovery
SELECT 
    'user_profiles' as table_name, 
    COUNT(*) as row_count 
FROM user_profiles
UNION ALL
SELECT 'engagements', COUNT(*) FROM engagements
UNION ALL
SELECT 'documents', COUNT(*) FROM documents;

-- Check for orphaned records
SELECT id FROM engagements 
WHERE created_by NOT IN (SELECT id FROM user_profiles);
```

---

## 2. Application Recovery

### 2.1 Cloudflare Pages Rollback

**Scenario**: Bad deployment causing application failure

```bash
# 1. Access Cloudflare Dashboard
# Workers & Pages → prisma → Deployments

# 2. Find last working deployment
# Click "..." → "Rollback to this deployment"

# 3. Verify rollback
curl -s https://prisma.ikanisa.com/api/health | jq .status
```

### 2.2 Manual Redeployment

```bash
# 1. Checkout known-good commit
git checkout <commit-sha>

# 2. Deploy manually
npm run deploy

# 3. Verify deployment
curl -I https://prisma.ikanisa.com
```

---

## 3. Service Degradation Procedures

### 3.1 OpenAI API Unavailable

**Impact**: AI features unavailable  
**Mitigation**:

1. Enable fallback mode in configuration
2. Disable AI-dependent features in UI
3. Log incidents for user communication

```typescript
// Fallback mode check
if (!OPENAI_API_KEY || process.env.AI_FALLBACK_MODE === 'true') {
  // Use rule-based categorization
  return getRuleBasedPrediction(transaction);
}
```

### 3.2 Supabase Unavailable

**Impact**: Authentication and database unavailable  
**Mitigation**:

1. Display maintenance page
2. Monitor Supabase status: https://status.supabase.com
3. Activate support ticket with Supabase

---

## 4. Communication Procedures

### 4.1 Status Page Updates

```markdown
Template: Service Degradation

Title: [Service] Experiencing Issues
Body: We are aware of issues with [feature]. 
      Our team is investigating.
      Estimated resolution: [time]
      
Updates will be posted here.
```

### 4.2 Escalation Matrix

| Severity | Response Time | Notification |
|----------|--------------|--------------|
| P1 Critical | 15 min | All hands, exec team |
| P2 High | 1 hour | On-call + team lead |
| P3 Medium | 4 hours | On-call |
| P4 Low | 24 hours | Normal ticket |

---

## 5. Recovery Verification Checklist

After any recovery:

- [ ] Application loads at primary URL
- [ ] User authentication works
- [ ] Database queries return data
- [ ] AI features respond (if applicable)
- [ ] Audit logs recording
- [ ] SSL certificate valid
- [ ] Rate limiting active
- [ ] Session management functional

---

## 6. Post-Incident Review

Within 48 hours of recovery:

1. Document timeline of events
2. Identify root cause
3. List action items to prevent recurrence
4. Update this runbook if needed
5. Schedule post-mortem meeting
