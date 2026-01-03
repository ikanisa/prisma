# Deployment Troubleshooting Guide
## Prisma Glow - Common Issues and Solutions

**Last Updated:** January 2025

---

## Table of Contents

1. [Environment Issues](#environment-issues)
2. [Build Failures](#build-failures)
3. [Database Issues](#database-issues)
4. [Deployment Failures](#deployment-failures)
5. [Performance Issues](#performance-issues)
6. [Service Worker Issues](#service-worker-issues)

---

## Environment Issues

### Issue: Missing Environment Variables

**Symptoms:**
- Application fails to start
- API calls return errors
- Environment validation fails

**Solution:**
```bash
# Validate environment
pnpm run validate:env

# Check required variables
cat .env.example

# Set missing variables
export NEXT_PUBLIC_SUPABASE_URL="your-url"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="your-key"
```

### Issue: Invalid Environment Variable Format

**Symptoms:**
- Validation script reports format errors
- Connection strings fail

**Solution:**
```bash
# Check format requirements
# DATABASE_URL must start with postgresql://
# SUPABASE_URL must be HTTPS
# REDIS_URL must start with redis://

# Fix format
export DATABASE_URL="postgresql://user:pass@host:5432/db"
```

---

## Build Failures

### Issue: TypeScript Errors

**Symptoms:**
- Build fails with type errors
- Type checking fails

**Solution:**
```bash
# Run type check
pnpm run typecheck

# Fix errors or temporarily skip (not recommended)
SKIP_TYPE_CHECK=true pnpm run build
```

### Issue: ESLint Errors

**Symptoms:**
- Build fails with lint errors
- Code style issues

**Solution:**
```bash
# Run linter
pnpm run lint

# Auto-fix issues
pnpm run lint -- --fix

# Temporarily skip (not recommended)
SKIP_LINT=true pnpm run build
```

### Issue: Dependency Installation Fails

**Symptoms:**
- `pnpm install` fails
- Missing packages

**Solution:**
```bash
# Clean install
rm -rf node_modules pnpm-lock.yaml
pnpm install --frozen-lockfile

# If workspace issues
pnpm -w install --frozen-lockfile --ignore-scripts
pnpm -w run build:workspace
```

---

## Database Issues

### Issue: Migration Failures

**Symptoms:**
- Database migrations fail
- Schema out of sync

**Solution:**
```bash
# Check migration status
pnpm --filter web exec prisma migrate status

# Reset database (development only)
pnpm --filter web exec prisma migrate reset

# Apply migrations
pnpm --filter web run prisma:migrate:deploy
```

### Issue: Connection Pool Exhausted

**Symptoms:**
- Database connection errors
- Timeout errors

**Solution:**
```bash
# Check connection pool settings
# Increase pool size in DATABASE_URL
# Add ?connection_limit=20&pool_timeout=10

# Restart application
```

---

## Deployment Failures

### Issue: Cloudflare Pages Build Fails

**Symptoms:**
- Deployment fails in CI
- Build errors

**Solution:**
```bash
# Test build locally
pnpm run build

# Check build logs
# Verify environment variables in Cloudflare dashboard
# Check Node.js version compatibility
```

### Issue: Docker Build Fails

**Symptoms:**
- Docker image build fails
- Container won't start

**Solution:**
```bash
# Build locally
docker-compose -f docker-compose.prod.yml build

# Check Dockerfile
# Verify base image compatibility
# Check resource limits
```

---

## Performance Issues

### Issue: Slow API Responses

**Symptoms:**
- High response times
- Timeout errors

**Solution:**
```bash
# Enable Redis caching
export REDIS_URL="redis://localhost:6379"

# Check database query performance
# Enable query logging
# Review slow query logs
```

### Issue: High Memory Usage

**Symptoms:**
- Application crashes
- OOM errors

**Solution:**
```bash
# Check memory usage
# Increase container memory limits
# Optimize agent caching
# Review memory leaks
```

---

## Service Worker Issues

### Issue: Service Worker Not Updating

**Symptoms:**
- Old version persists
- Changes not reflected

**Solution:**
```bash
# Clear service worker cache
# In browser DevTools:
# Application > Service Workers > Unregister
# Application > Storage > Clear site data

# Hard reload: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
```

### Issue: Offline Functionality Not Working

**Symptoms:**
- App doesn't work offline
- Sync not working

**Solution:**
```bash
# Check service worker registration
# Verify IndexedDB is accessible
# Check browser console for errors
# Verify PWA dependencies installed
```

---

## Quick Diagnostic Commands

```bash
# Check environment
pnpm run validate:env

# Check build
pnpm run build

# Check types
pnpm run typecheck

# Check linting
pnpm run lint

# Check database
pnpm --filter web exec prisma migrate status

# Check health
curl http://localhost:3000/api/health
```

---

## Getting Help

1. **Check Logs:**
   - Application logs
   - Browser console
   - CI/CD logs

2. **Review Documentation:**
   - [Deployment Guide](./DEPLOYMENT_GUIDE.md)
   - [Production Operations](../operations/PRODUCTION_OPERATIONS.md)

3. **Common Solutions:**
   - Restart services
   - Clear caches
   - Verify environment variables
   - Check network connectivity

---

**Last Updated:** January 2025  
**Maintained By:** DevOps Team

