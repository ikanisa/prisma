# Deployment Guide - Prisma Glow

**Version:** 1.0.0  
**Last Updated:** November 28, 2024

---

## Prerequisites

### Required Software
- **Node.js:** 22.12.0 (use nvm or volta)
- **pnpm:** 9.12.3
- **Python:** 3.11+
- **PostgreSQL:** 15+
- **Redis:** 7+ (for production caching)

### Required Accounts
- Google Gemini AI API key
- OpenAI API key (optional)
- Sentry account (for error tracking)
- Supabase project (for database)

---

## Environment Setup

### 1. Clone Repository
```bash
git clone <repository-url>
cd prisma
```

### 2. Install Dependencies
```bash
# Node dependencies
pnpm install --frozen-lockfile

# Python dependencies
python -m venv .venv
source .venv/bin/activate
pip install -r server/requirements-production.txt
```

### 3. Environment Variables
Create `.env.production`:

```bash
# API Keys
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-pro
OPENAI_API_KEY=your-openai-key

# Database
DATABASE_URL=postgresql://user:password@host:5432/database
REDIS_URL=redis://localhost:6379

# Security
API_SECRET_KEY=generate-secure-random-key
ALLOWED_ORIGINS=https://yourdomain.com

# Monitoring
SENTRY_DSN=your-sentry-dsn
LOG_LEVEL=INFO

# Feature Flags
ENABLE_CACHING=true
ENABLE_RATE_LIMITING=true
```

---

## Build Process

### Frontend Build
```bash
# Production build
pnpm run build

# Verify bundle size
ls -lh dist/assets/*.js

# Expected: Main bundle < 500KB
```

### Backend Preparation
```bash
# Run database migrations
pnpm --filter web run prisma:migrate:deploy

# Generate Prisma client
pnpm --filter web run prisma:generate
```

---

## Deployment Options

### Option 1: Docker (Recommended)

```bash
# Build images
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml up -d

# Check health
curl http://localhost:8000/health
```

### Option 2: Direct Deployment

#### Frontend (Netlify/Vercel)
```bash
# Build
pnpm run build

# Deploy to Netlify
netlify deploy --prod --dir=dist

# Or Vercel
vercel --prod
```

#### Backend (AWS/GCP/Azure)
```bash
# Start FastAPI
uvicorn server.main:app --host 0.0.0.0 --port 8000 --workers 4
```

---

## Health Checks

### Endpoints
- `GET /health` - Basic health check
- `GET /ready` - Readiness check
- `GET /metrics` - Prometheus metrics

### Expected Responses
```bash
# Health
curl http://localhost:8000/health
# {"status": "healthy", "timestamp": 1701234567.89}

# Readiness
curl http://localhost:8000/ready
# {"status": "ready", "agents_loaded": 20}

# Metrics
curl http://localhost:8000/metrics
# Prometheus format metrics
```

---

## Performance Targets

| Metric | Target | Command |
|--------|--------|---------|
| Bundle Size | <500KB | `ls -lh dist/assets/*.js` |
| API Response | <300ms (P95) | Check `/metrics` |
| Lighthouse Score | >90 | `pnpm run lighthouse` |
| Test Coverage | >80% | `pnpm run coverage` |

---

## Security Checklist

- [ ] All API keys in environment variables
- [ ] CORS configured for production domains
- [ ] Rate limiting enabled
- [ ] Security headers configured
- [ ] HTTPS enforced
- [ ] Secrets not in git
- [ ] Database credentials rotated
- [ ] API authentication enabled

---

## Monitoring Setup

### Sentry (Error Tracking)
```python
import sentry_sdk
sentry_sdk.init(
    dsn=os.getenv("SENTRY_DSN"),
    environment="production"
)
```

### Prometheus (Metrics)
- Metrics endpoint: `/metrics`
- Scrape interval: 15s
- Retention: 30 days

### Logs
- Format: JSON
- Destination: stdout (captured by container runtime)
- Retention: 7 days

---

## Rollback Procedure

```bash
# 1. Stop current deployment
docker-compose down

# 2. Checkout previous version
git checkout <previous-tag>

# 3. Rebuild and deploy
docker-compose -f docker-compose.prod.yml up -d

# 4. Verify health
curl http://localhost:8000/health
```

---

## Troubleshooting

### Issue: High Memory Usage
**Solution:** Increase container memory limit or optimize agent caching

### Issue: Slow API Responses
**Solution:** Enable Redis caching, check database query performance

### Issue: Build Failures
**Solution:** Clear node_modules and pnpm cache:
```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install --frozen-lockfile
```

---

## Support

- **Documentation:** `/docs`
- **API Docs:** `/docs/api`
- **Issues:** GitHub Issues
- **Email:** support@prismag low.com
