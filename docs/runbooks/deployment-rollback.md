# Deployment Rollback Runbook

**Document Version**: 1.0  
**Last Updated**: January 11, 2026  
**Addresses**: Audit High Priority #16

---

## Quick Reference

| Platform | Rollback Method | Time to Rollback |
|----------|----------------|------------------|
| Cloudflare Pages | Dashboard UI | < 2 min |
| Database Migrations | Prisma migrate | 5-15 min |
| Environment Variables | Dashboard UI | < 1 min |

---

## 1. Cloudflare Pages Rollback

### Via Dashboard (Recommended)

1. Navigate to: https://dash.cloudflare.com
2. Select: Workers & Pages → prisma
3. Click: Deployments tab
4. Find the last working deployment
5. Click: "..." → "Rollback to this deployment"
6. Confirm rollback

### Via CLI

```bash
# List recent deployments
npx wrangler pages deployment list --project-name=prisma-glow

# Note: Wrangler doesn't support direct rollback
# Instead, checkout the commit and redeploy

git checkout <good-commit-sha>
npm run deploy
```

---

## 2. Git-Based Rollback

### Immediate Rollback

```bash
# 1. Identify bad commit
git log --oneline -10

# 2. Revert the bad commit(s)
git revert HEAD

# 3. Push revert
git push origin main

# 4. Deploy (auto-deploys if connected to Git)
npm run deploy
```

### Hard Reset (Use with Caution)

```bash
# Only if revert is not feasible
git reset --hard <good-commit-sha>
git push --force origin main  # DANGEROUS

# Then redeploy
npm run deploy
```

---

## 3. Database Migration Rollback

### Check Migration Status

```bash
cd apps/web
pnpm prisma migrate status
```

### Rollback Last Migration

```bash
# Generate rollback SQL
pnpm prisma migrate diff \
  --from-schema-datamodel prisma/schema.prisma \
  --to-schema-datasource prisma/schema.prisma \
  --script > rollback.sql

# Review the SQL carefully
cat rollback.sql

# Apply rollback (manual step)
psql $DATABASE_URL < rollback.sql
```

### Emergency: Reset to Known State

```bash
# WARNING: This may cause data loss
# Only use if database is in inconsistent state

pnpm prisma migrate reset --force
```

---

## 4. Environment Variable Rollback

### Cloudflare Pages

1. Dashboard → Workers & Pages → prisma → Settings
2. Click "Variables and Secrets"
3. Locate changed variable
4. Edit to previous value
5. Save changes
6. Trigger new deployment

### Document Changes

Always log environment variable changes in your deployment notes.

---

## 5. Rollback Decision Tree

```
Is the site completely down?
├── Yes → Immediate Cloudflare rollback
└── No
    └── Is it a data issue?
        ├── Yes → Consider database rollback
        └── No
            └── Is it a configuration issue?
                ├── Yes → Check env variables
                └── No → Standard code rollback
```

---

## 6. Post-Rollback Verification

After any rollback:

- [ ] Application loads correctly
- [ ] Authentication works
- [ ] Database queries succeed
- [ ] No console errors
- [ ] API endpoints respond
- [ ] Monitoring shows green

---

## 7. Prevention

### Before Deploying

- [ ] Run tests locally
- [ ] Review changes in PR
- [ ] Check CI/CD pipeline
- [ ] Notify team of deployment

### Feature Flags

Consider using feature flags for risky deployments:

```typescript
if (process.env.FEATURE_NEW_THING === 'true') {
  // New feature
} else {
  // Old behavior
}
```

This allows instant rollback without deployment.
