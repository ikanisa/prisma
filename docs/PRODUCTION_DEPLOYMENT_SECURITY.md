# Production Deployment Security Guide

## Overview

This guide outlines the critical security requirements for deploying Prisma Glow to production. **All items marked as CRITICAL must be completed before go-live.**

## ✅ Pre-Deployment Checklist

### 1. Environment Variables Configuration

**CRITICAL:** All secrets must be configured via environment variables. Never commit secrets to git.

#### Required Variables (Production)

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_JWT_SECRET=your-jwt-secret-from-supabase-dashboard
SUPABASE_JWT_AUDIENCE=authenticated

# CORS & Security
GATEWAY_ALLOWED_ORIGINS=https://app.yourdomain.com,https://staging.yourdomain.com
API_ALLOWED_ORIGINS=https://app.yourdomain.com,https://staging.yourdomain.com

# Monitoring & Error Tracking
SENTRY_DSN=your-sentry-dsn

# Database
POSTGRES_USER=your-postgres-user
POSTGRES_PASSWORD=your-strong-password
POSTGRES_DB=prisma_glow

# MinIO Storage
MINIO_ROOT_USER=your-minio-user
MINIO_ROOT_PASSWORD=your-strong-password

# Sentry Self-Hosted (if applicable)
SENTRY_SECRET_KEY=your-sentry-secret-key

# Deployment
SERVICE_VERSION=1.0.0
GATEWAY_IMAGE=your-registry/gateway:1.0.0
RAG_IMAGE=your-registry/rag:1.0.0
AGENT_IMAGE=your-registry/agent:1.0.0
ANALYTICS_IMAGE=your-registry/analytics:1.0.0
```

#### Recommended Variables

```bash
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=your-openai-api-key
REDIS_PASSWORD=your-redis-password
```

### 2. Validate Configuration

Before deployment, run the validation script:

```bash
./scripts/validate-production-env.sh
```

Or use Python validator:

```bash
python server/config_validator.py
```

Both scripts will check for:
- ✅ All required environment variables are set
- ✅ URLs are properly formatted
- ✅ CORS origins are configured
- ⚠️  Warnings for recommended variables

### 3. Security Hardening

#### ✅ Completed

- [x] **No hard-coded credentials** - All services use environment variables
- [x] **Sentry error tracking enabled** - Production errors will be tracked
- [x] **Rate limiting implemented** - Write endpoints protected against abuse
- [x] **503 status for incomplete features** - Better than 501 NOT_IMPLEMENTED
- [x] **.gitignore configured** - All `.env*` files excluded (except examples)

#### 🔒 Rate Limiting

The following endpoints have rate limiting enabled:

- **Agent creation/update/delete**: 10 requests per minute
- **RAG ingestion**: 5 requests per 5 minutes
- **RAG search**: 30 requests per minute
- **Control operations**: 10 requests per minute

Rate limit responses return HTTP 429 with:
```json
{
  "detail": {
    "error": "Rate limit exceeded",
    "limit": 10,
    "window": 60,
    "retry_after": 45
  }
}
```

### 4. Docker Compose Configuration

The `docker-compose.prod.yml` file includes:

- ✅ **Required env var validation** - Uses `${VAR:?error}` syntax to fail if missing
- ✅ **No default passwords** - All secrets must be provided
- ✅ **Restart policies** - Services automatically restart on failure
- ✅ **Security headers** - CORS properly configured

### 5. Deployment Workflow

#### Step 1: Set Environment Variables

Create a `.env.production` file (not committed to git):

```bash
cp .env.example .env.production
# Edit .env.production with actual production values
```

#### Step 2: Validate Configuration

```bash
# Source production env vars
set -a; source .env.production; set +a

# Validate
./scripts/validate-production-env.sh
```

#### Step 3: Deploy with Docker Compose

```bash
# Deploy with validation
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d

# Check service health
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs -f
```

## 🔐 Security Best Practices

### Secrets Management

1. **Never commit secrets to git**
   - Use `.gitignore` to exclude `.env*` files
   - Use secret management services (AWS Secrets Manager, HashiCorp Vault, etc.)

2. **Use strong passwords**
   - Minimum 20 characters
   - Include uppercase, lowercase, numbers, and special characters
   - Use a password manager

3. **Rotate secrets regularly**
   - Database passwords: every 90 days
   - API keys: every 6 months
   - JWT secrets: only when compromised

### CORS Configuration

**Production CORS must be explicitly configured:**

```bash
# ❌ NEVER use wildcards in production
GATEWAY_ALLOWED_ORIGINS=*

# ✅ Always specify exact origins
GATEWAY_ALLOWED_ORIGINS=https://app.prismaglow.com,https://staging.prismaglow.com
```

### Monitoring

**Sentry Configuration:**

1. Create a Sentry project at [sentry.io](https://sentry.io)
2. Copy the DSN from Settings > Client Keys
3. Set `SENTRY_DSN` in production environment
4. Verify errors are captured by triggering a test error

**Error tracking is automatically enabled when:**
- `import.meta.env.PROD === true` (Vite frontend)
- `SENTRY_DSN` environment variable is set (Backend)

## 📊 Validation Results

After following this guide, you should see:

```
✅ No hard-coded credentials in source code
✅ Sentry error tracking enabled for production builds
✅ Rate limiting middleware added to write endpoints
✅ API endpoints return 503 instead of 501
✅ Environment variable validation on startup
✅ .env.example file created with all required variables
✅ .gitignore excludes all .env* files (except examples)
```

## 🚨 Rollback Plan

If issues arise after deployment:

1. **Quick rollback**: Revert to previous Docker images
   ```bash
   SERVICE_VERSION=0.9.0 docker-compose -f docker-compose.prod.yml up -d
   ```

2. **Disable rate limiting temporarily**: Comment out rate limiter in main.py
   ```python
   # app.state.rate_limiter = RateLimiter(redis_client)
   ```

3. **Restore from backup**: Use database backups if data corruption occurs

## 📞 Support

For issues during deployment:
- Check logs: `docker-compose logs -f [service-name]`
- Validate environment: `./scripts/validate-production-env.sh`
- Review security report: `SECURITY_FIXES_IMPLEMENTATION_REPORT.md`

## 🔗 Related Documentation

- [Security Fixes Implementation Report](../SECURITY_FIXES_IMPLEMENTATION_REPORT.md)
- [Production Readiness Checklist](../PRODUCTION_READINESS_CHECKLIST.md)
- [Docker Compose Configuration](../docker-compose.prod.yml)
- [Environment Variables Reference](../.env.example)
