# Agent Registry System - Deployment Guide

## Pre-Deployment Checklist

### 1. Code Readiness
- [ ] All agents defined in `agents.registry.yaml`
- [ ] Registry validation passes: `node scripts/agent-cli.mjs validate`
- [ ] TypeScript compilation succeeds: `pnpm run typecheck`
- [ ] All tests pass: `pnpm run test`
- [ ] Linting passes: `pnpm run lint`

### 2. Environment Configuration
- [ ] Environment variables configured (see `AGENT_REGISTRY_ENV_VARS.md`)
- [ ] OpenAI API key set and tested
- [ ] Gemini API key set and tested
- [ ] Supabase credentials configured
- [ ] Environment-specific configs ready (.env.staging, .env.production)

### 3. Dependencies
- [ ] All npm packages installed: `pnpm install --frozen-lockfile`
- [ ] js-yaml package available
- [ ] @prisma-glow/agents package built
- [ ] Gateway routes integrated

### 4. Infrastructure
- [ ] Database accessible
- [ ] Redis available (for caching)
- [ ] Load balancer configured
- [ ] CDN configured (if applicable)
- [ ] Monitoring tools ready

## Deployment Methods

### Method 1: Docker Compose (Recommended for Staging)

#### Step 1: Build Images
```bash
# Build all services
docker compose build

# Or build specific service
docker compose build gateway
```

#### Step 2: Configure Environment
```bash
# Create production env file
cp .env.example .env.production

# Edit with production values
vim .env.production
```

#### Step 3: Start Services
```bash
# Start with production profile
docker compose --profile production --env-file .env.production up -d

# Check logs
docker compose logs -f gateway
```

#### Step 4: Verify Deployment
```bash
# Health check
curl http://localhost:3001/health

# Agent registry health
curl http://localhost:3001/api/agents

# Test agent execution
curl -X POST http://localhost:3001/api/agents/tax-compliance-mt-034/run \
  -H "Content-Type: application/json" \
  -d '{"message": "Test query"}'
```

### Method 2: Kubernetes

#### Step 1: Create ConfigMaps and Secrets
```bash
# Create registry configmap
kubectl create configmap agent-registry \
  --from-file=agents.registry.yaml

# Create secrets
kubectl create secret generic agent-secrets \
  --from-literal=OPENAI_API_KEY=$OPENAI_API_KEY \
  --from-literal=GEMINI_API_KEY=$GEMINI_API_KEY \
  --from-literal=SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY
```

#### Step 2: Apply Deployment
```bash
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml
```

#### Step 3: Verify Deployment
```bash
# Check pods
kubectl get pods -l app=agent-gateway

# Check logs
kubectl logs -f deployment/agent-gateway

# Port forward for testing
kubectl port-forward svc/agent-gateway 3001:3001
```

### Method 3: Traditional Server Deployment

#### Step 1: Prepare Server
```bash
# SSH to server
ssh user@your-server.com

# Clone/pull latest code
git pull origin main

# Install dependencies
pnpm install --frozen-lockfile
```

#### Step 2: Build Application
```bash
# Build TypeScript
pnpm run build

# Build specific packages
pnpm --filter @prisma-glow/agents run build
pnpm --filter @prisma-glow/gateway run build
```

#### Step 3: Configure Environment
```bash
# Create production env file
cp .env.example .env

# Edit with production values
vim .env
```

#### Step 4: Start with PM2
```bash
# Install PM2 if not already
npm install -g pm2

# Start application
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Enable startup script
pm2 startup
```

## Post-Deployment Verification

### 1. Health Checks

```bash
# Gateway health
curl http://your-domain.com/health

# Agent registry health
curl http://your-domain.com/api/agents

# Expected response:
# {
#   "success": true,
#   "data": [...],
#   "count": 30
# }
```

### 2. Smoke Tests

```bash
# Test each category
curl http://your-domain.com/api/agents/search?category=tax
curl http://your-domain.com/api/agents/search?category=audit
curl http://your-domain.com/api/agents/search?category=accounting
curl http://your-domain.com/api/agents/search?category=corporate

# Test specific agent
curl -X POST http://your-domain.com/api/agents/tax-compliance-mt-034/run \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_TOKEN" \
  -d '{
    "message": "What are Malta tax filing deadlines?",
    "jurisdictionCode": "MT"
  }'
```

### 3. Performance Tests

```bash
# Run load tests
npm run test:load

# Or use k6
k6 run tests/load/agent-execution.js

# Or use Artillery
artillery run tests/load/agents.yaml
```

### 4. Monitoring Setup

```bash
# Check metrics endpoint
curl http://your-domain.com/metrics

# Verify logging
tail -f logs/agent-execution.log

# Check error tracking
# (Sentry, DataDog, etc.)
```

## Rollback Procedures

### Quick Rollback (Docker)

```bash
# Stop current version
docker compose down

# Checkout previous version
git checkout <previous-tag>

# Rebuild and start
docker compose build
docker compose up -d
```

### Kubernetes Rollback

```bash
# Check rollout history
kubectl rollout history deployment/agent-gateway

# Rollback to previous version
kubectl rollout undo deployment/agent-gateway

# Rollback to specific revision
kubectl rollout undo deployment/agent-gateway --to-revision=2
```

### PM2 Rollback

```bash
# Stop current process
pm2 stop agent-gateway

# Checkout previous version
git checkout <previous-tag>

# Rebuild
pnpm run build

# Restart
pm2 restart agent-gateway
```

## Monitoring & Alerting

### Key Metrics to Monitor

1. **Agent Execution Metrics**
   - Execution count by agent
   - Average execution time
   - Success/failure rate
   - Engine fallback rate

2. **API Metrics**
   - Request rate
   - Error rate
   - Response time (p50, p95, p99)
   - Rate limit hits

3. **System Metrics**
   - CPU usage
   - Memory usage
   - Disk usage
   - Network I/O

4. **External API Metrics**
   - OpenAI API latency
   - Gemini API latency
   - Supabase query time
   - API error rates

### Alerting Rules

```yaml
# Example Prometheus alerts
groups:
  - name: agent_registry
    rules:
      - alert: HighAgentErrorRate
        expr: rate(agent_execution_errors[5m]) > 0.1
        annotations:
          summary: High agent execution error rate
          
      - alert: SlowAgentExecution
        expr: histogram_quantile(0.95, agent_execution_duration_seconds) > 30
        annotations:
          summary: 95th percentile execution time > 30s
          
      - alert: RegistryLoadFailure
        expr: agent_registry_load_errors > 0
        annotations:
          summary: Failed to load agent registry
```

## Scaling Strategies

### Horizontal Scaling

```bash
# Docker Compose
docker compose up -d --scale gateway=3

# Kubernetes
kubectl scale deployment agent-gateway --replicas=5
```

### Load Balancing

```nginx
# Nginx configuration
upstream agent_gateway {
    least_conn;
    server gateway1:3001;
    server gateway2:3001;
    server gateway3:3001;
}

server {
    listen 80;
    server_name api.yourdomain.com;
    
    location /api/agents {
        proxy_pass http://agent_gateway;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Caching Strategy

```typescript
// Enable result caching
const result = await agentRouter.run({
  agentId: "tax-compliance-mt-034",
  input: message,
  metadata: { 
    jurisdictionCode: "MT",
    cacheKey: `tax-mt-${hashMessage(message)}`,
    cacheTTL: 3600 // 1 hour
  }
});
```

## Backup & Disaster Recovery

### Registry Backup

```bash
# Automated daily backup
#!/bin/bash
# scripts/backup-registry.sh

DATE=$(date +%Y%m%d)
BACKUP_DIR=/backups/agent-registry

# Backup YAML
cp agents.registry.yaml $BACKUP_DIR/agents.registry.$DATE.yaml

# Backup to S3
aws s3 cp agents.registry.yaml s3://your-bucket/backups/registry/$DATE/

# Keep last 30 days
find $BACKUP_DIR -name "agents.registry.*.yaml" -mtime +30 -delete
```

### Database Backup

```bash
# Backup Supabase/PostgreSQL
pg_dump $DATABASE_URL > backups/db-$DATE.sql

# Upload to S3
aws s3 cp backups/db-$DATE.sql s3://your-bucket/backups/db/
```

## Troubleshooting

### Issue: Agents not loading

```bash
# Check registry file exists
ls -l agents.registry.yaml

# Validate registry
node scripts/agent-cli.mjs validate

# Check permissions
chmod 644 agents.registry.yaml

# Check logs
docker compose logs gateway | grep "registry"
```

### Issue: High latency

```bash
# Check agent execution times
curl http://localhost:3001/metrics | grep agent_execution_duration

# Enable debug logging
export DEBUG=agent:*
pm2 restart gateway

# Profile with clinic
clinic doctor -- node apps/gateway/dist/server.js
```

### Issue: API errors

```bash
# Check API keys
echo $OPENAI_API_KEY | cut -c1-10
echo $GEMINI_API_KEY | cut -c1-10

# Test OpenAI connection
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Check Supabase connection
curl "$SUPABASE_URL/rest/v1/" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY"
```

## Security Hardening

### 1. API Security

```typescript
// Add rate limiting
import rateLimit from "express-rate-limit";

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per windowMs
});

app.use("/api/agents", limiter);
```

### 2. Authentication

```typescript
// Add JWT authentication
import { requireAuth } from "./middleware/auth";

router.post("/agents/:agentId/run", requireAuth, async (req, res) => {
  // Only authenticated users can execute agents
});
```

### 3. Input Validation

```typescript
// Validate input
import { z } from "zod";

const runAgentSchema = z.object({
  message: z.string().min(1).max(5000),
  jurisdictionCode: z.string().length(2).optional(),
});

router.post("/agents/:agentId/run", async (req, res) => {
  const validated = runAgentSchema.parse(req.body);
  // ... execute agent
});
```

## Maintenance

### Regular Tasks

**Daily:**
- Monitor error rates
- Check API usage
- Review logs for anomalies

**Weekly:**
- Review agent performance metrics
- Check for registry updates
- Test agent accuracy
- Update documentation

**Monthly:**
- Rotate API keys
- Update dependencies
- Review and optimize slow agents
- Backup verification

**Quarterly:**
- Security audit
- Performance optimization
- Agent effectiveness review
- Cost optimization

## Success Criteria

Deployment is successful when:
- ✅ All health checks pass
- ✅ Smoke tests complete successfully
- ✅ No error spikes in monitoring
- ✅ Response times within SLA
- ✅ All agents accessible via API
- ✅ Search functionality works
- ✅ Engine fallback functional
- ✅ Logs showing normal operation
- ✅ Monitoring dashboards green
- ✅ Team notified and trained

## Support Contacts

- **Infrastructure:** DevOps team
- **Application:** Development team
- **Security:** Security team
- **On-call:** Follow escalation policy

## Additional Resources

- Architecture Diagram: `/AGENT_REGISTRY_VISUAL_MAP.txt`
- API Documentation: `/packages/agents/README.md`
- Environment Variables: `/docs/AGENT_REGISTRY_ENV_VARS.md`
- Migration Guide: `/docs/AGENT_REGISTRY_MIGRATION_GUIDE.md`
