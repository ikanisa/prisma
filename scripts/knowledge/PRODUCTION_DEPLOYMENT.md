# Production Deployment Checklist
**Accounting Knowledge Base System v1.1.0**

## Pre-Deployment Checklist

### 1. Environment Setup
- [ ] Node.js 22.12.0 installed (or 20.19.4+)
- [ ] pnpm 9.12.3 installed
- [ ] PostgreSQL 15+ with pgvector extension
- [ ] Docker installed (if using containers)
- [ ] All environment variables configured

### 2. Environment Variables

Create `.env.production`:

```bash
# Required
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-key
OPENAI_API_KEY=sk-...your-key
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Optional - API Configuration
KNOWLEDGE_API_PORT=3002
NODE_ENV=production

# Optional - Performance
REDIS_URL=redis://localhost:6379
CACHE_TTL_SECONDS=3600

# Optional - Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Optional - Monitoring
SENTRY_DSN=https://...
LOG_LEVEL=info
```

---

## Deployment Steps

### Option A: Production Server Deployment

#### Step 1: Prepare Server

```bash
# SSH into production server
ssh user@your-server.com

# Create application directory
sudo mkdir -p /opt/prisma-glow/knowledge
sudo chown $USER:$USER /opt/prisma-glow/knowledge
cd /opt/prisma-glow/knowledge

# Clone or copy files
git clone <your-repo> .
# OR
rsync -avz --exclude node_modules local-path/ user@server:/opt/prisma-glow/knowledge/
```

#### Step 2: Install Dependencies

```bash
# Install pnpm
npm install -g pnpm@9.12.3

# Install dependencies
cd scripts/knowledge
pnpm install --frozen-lockfile --prod
```

#### Step 3: Apply Database Migration

```bash
# Backup existing database first
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Apply migration
psql $DATABASE_URL -f ../../supabase/migrations/20251201170000_accounting_knowledge_base.sql

# Verify migration
psql $DATABASE_URL -c "\dt" | grep knowledge
```

#### Step 4: Ingest Knowledge Sources

```bash
# Test with one source first
# Edit ingest.ts to include only 1-2 sources
pnpm tsx ingest.ts

# Verify ingestion
pnpm tsx manage.ts stats

# If successful, ingest all sources
# Restore full source list in ingest.ts
pnpm tsx ingest.ts
```

#### Step 5: Run Tests

```bash
# Run comprehensive test suite
pnpm tsx test-suite.ts

# Verify all tests pass
# Expected: 30+ tests, 100% pass rate
```

#### Step 6: Setup as System Service (systemd)

Create `/etc/systemd/system/knowledge-api.service`:

```ini
[Unit]
Description=Prisma Glow Knowledge Base API
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/prisma-glow/knowledge/scripts/knowledge
Environment="NODE_ENV=production"
EnvironmentFile=/opt/prisma-glow/knowledge/.env.production
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=knowledge-api

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable knowledge-api
sudo systemctl start knowledge-api
sudo systemctl status knowledge-api
```

#### Step 7: Setup Nginx Reverse Proxy

Create `/etc/nginx/sites-available/knowledge-api`:

```nginx
upstream knowledge_api {
    server localhost:3002;
}

server {
    listen 80;
    server_name knowledge-api.yourdomain.com;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=knowledge_limit:10m rate=10r/s;
    limit_req zone=knowledge_limit burst=20 nodelay;

    location / {
        proxy_pass http://knowledge_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://knowledge_api/health;
        access_log off;
    }
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/knowledge-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### Step 8: Setup SSL (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d knowledge-api.yourdomain.com
```

---

### Option B: Docker Deployment

#### Step 1: Build Image

```bash
cd /Users/jeanbosco/workspace/prisma/scripts/knowledge
docker build -t prisma-knowledge-api:1.1.0 -f Dockerfile ../..
```

#### Step 2: Setup Environment

Create `.env.docker`:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
OPENAI_API_KEY=sk-...
DATABASE_URL=postgresql://postgres:password@postgres:5432/knowledge
POSTGRES_PASSWORD=your-secure-password
KNOWLEDGE_API_PORT=3002
```

#### Step 3: Deploy with Docker Compose

```bash
docker-compose --env-file .env.docker up -d

# Check logs
docker-compose logs -f knowledge-api

# Verify health
curl http://localhost:3002/health
```

#### Step 4: Apply Migration (if using external DB)

```bash
docker exec -it prisma-knowledge-db psql -U postgres -d knowledge \
  -f /docker-entrypoint-initdb.d/01-schema.sql
```

#### Step 5: Ingest Knowledge

```bash
# Run ingestion inside container
docker exec -it prisma-knowledge-api pnpm tsx scripts/knowledge/ingest.ts

# Or run from host
docker-compose exec knowledge-api pnpm tsx scripts/knowledge/ingest.ts
```

---

### Option C: Kubernetes Deployment

#### Step 1: Create Kubernetes Manifests

**Namespace:**
```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: prisma-glow
```

**ConfigMap:**
```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: knowledge-config
  namespace: prisma-glow
data:
  NODE_ENV: production
  KNOWLEDGE_API_PORT: "3002"
```

**Secret:**
```yaml
# k8s/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: knowledge-secrets
  namespace: prisma-glow
type: Opaque
stringData:
  SUPABASE_URL: https://your-project.supabase.co
  SUPABASE_SERVICE_ROLE_KEY: eyJ...
  OPENAI_API_KEY: sk-...
  DATABASE_URL: postgresql://...
```

**Deployment:**
```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: knowledge-api
  namespace: prisma-glow
spec:
  replicas: 3
  selector:
    matchLabels:
      app: knowledge-api
  template:
    metadata:
      labels:
        app: knowledge-api
    spec:
      containers:
      - name: knowledge-api
        image: prisma-knowledge-api:1.1.0
        ports:
        - containerPort: 3002
        envFrom:
        - configMapRef:
            name: knowledge-config
        - secretRef:
            name: knowledge-secrets
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3002
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3002
          initialDelaySeconds: 5
          periodSeconds: 5
```

**Service:**
```yaml
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: knowledge-api
  namespace: prisma-glow
spec:
  selector:
    app: knowledge-api
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3002
  type: LoadBalancer
```

**HorizontalPodAutoscaler:**
```yaml
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: knowledge-api-hpa
  namespace: prisma-glow
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: knowledge-api
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

#### Step 2: Deploy to Kubernetes

```bash
# Apply all manifests
kubectl apply -f k8s/

# Check deployment
kubectl get pods -n prisma-glow
kubectl get svc -n prisma-glow

# View logs
kubectl logs -f deployment/knowledge-api -n prisma-glow
```

---

## Post-Deployment Verification

### 1. Health Checks

```bash
# API health
curl https://knowledge-api.yourdomain.com/health

# Database connectivity
psql $DATABASE_URL -c "SELECT COUNT(*) FROM knowledge_sources;"

# Search functionality
curl -X POST https://knowledge-api.yourdomain.com/api/knowledge/search \
  -H "Content-Type: application/json" \
  -d '{"query":"How do I account for revenue?","topK":3}'
```

### 2. Performance Tests

```bash
# Run test suite
pnpm tsx scripts/knowledge/test-suite.ts

# Load test (using Apache Bench)
ab -n 1000 -c 10 -H "Content-Type: application/json" \
  -p query.json \
  https://knowledge-api.yourdomain.com/api/knowledge/search

# Monitor response times
curl -w "@curl-format.txt" -o /dev/null -s \
  https://knowledge-api.yourdomain.com/api/knowledge/stats
```

### 3. Verify Data

```bash
# Check statistics
curl https://knowledge-api.yourdomain.com/api/knowledge/stats

# Verify all sources ingested
pnpm tsx scripts/knowledge/manage.ts list-sources

# Check for stale documents
pnpm tsx scripts/knowledge/manage.ts check-freshness
```

---

## Monitoring Setup

### 1. Application Monitoring (PM2)

```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start server.js --name knowledge-api

# Setup monitoring
pm2 monit

# Setup auto-restart
pm2 startup
pm2 save
```

### 2. Log Aggregation

**Using Winston:**

```typescript
// Add to server.js
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}
```

### 3. Metrics Collection

**Using Prometheus:**

```typescript
// Add to server.js
import promClient from 'prom-client';

const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// Add metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

---

## Maintenance Tasks

### Daily

```bash
# Check service status
sudo systemctl status knowledge-api

# Review logs
sudo journalctl -u knowledge-api --since today

# Monitor query volume
psql $DATABASE_URL -c "SELECT COUNT(*) FROM agent_queries_log WHERE created_at > NOW() - INTERVAL '24 hours';"
```

### Weekly

```bash
# Check document freshness
pnpm tsx scripts/knowledge/manage.ts check-freshness

# Review query analytics
psql $DATABASE_URL -f scripts/sql/weekly_analytics.sql

# Backup database
pg_dump $DATABASE_URL | gzip > backup_$(date +%Y%m%d).sql.gz
```

### Monthly

```bash
# Export knowledge sources
pnpm tsx scripts/knowledge/manage.ts export-sources -o monthly_backup.json

# Review and cleanup old queries (optional)
psql $DATABASE_URL -c "DELETE FROM agent_queries_log WHERE created_at < NOW() - INTERVAL '90 days';"

# Update statistics
psql $DATABASE_URL -c "ANALYZE;"
```

### Quarterly

```bash
# Re-ingest updated standards
pnpm tsx scripts/knowledge/ingest.ts

# Refresh embeddings for updated documents
pnpm tsx scripts/knowledge/manage.ts refresh-embeddings --document-id <uuid>

# Cleanup deprecated documents
pnpm tsx scripts/knowledge/manage.ts cleanup --older-than 730
```

---

## Rollback Procedure

### If deployment fails:

```bash
# 1. Stop service
sudo systemctl stop knowledge-api

# 2. Restore database from backup
psql $DATABASE_URL < backup_YYYYMMDD.sql

# 3. Revert code
git checkout <previous-version-tag>

# 4. Restart service
sudo systemctl start knowledge-api

# 5. Verify
curl http://localhost:3002/health
```

---

## Security Hardening

### 1. Firewall Rules

```bash
# Allow only necessary ports
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw deny 3002/tcp  # Block direct API access
sudo ufw enable
```

### 2. API Key Rotation

```bash
# Generate new API keys quarterly
# Update in .env.production
# Restart service
sudo systemctl restart knowledge-api
```

### 3. Database Security

```sql
-- Create read-only user for monitoring
CREATE ROLE knowledge_readonly WITH LOGIN PASSWORD 'secure-password';
GRANT CONNECT ON DATABASE knowledge TO knowledge_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO knowledge_readonly;

-- Revoke unnecessary permissions
REVOKE ALL ON SCHEMA public FROM PUBLIC;
```

---

## Troubleshooting

### Issue: Service won't start

```bash
# Check logs
sudo journalctl -u knowledge-api -n 50

# Verify environment
sudo systemctl show knowledge-api | grep Environment

# Test manually
cd /opt/prisma-glow/knowledge/scripts/knowledge
node server.js
```

### Issue: Slow queries

```bash
# Check database indexes
psql $DATABASE_URL -c "\di+ knowledge_embeddings"

# Analyze query performance
psql $DATABASE_URL -c "EXPLAIN ANALYZE SELECT * FROM knowledge_embeddings LIMIT 10;"

# Rebuild indexes
psql $DATABASE_URL -c "REINDEX TABLE knowledge_embeddings;"
```

### Issue: High memory usage

```bash
# Check process memory
ps aux | grep node

# Increase Node.js memory limit
# In service file: Environment="NODE_OPTIONS=--max-old-space-size=4096"

# Restart service
sudo systemctl restart knowledge-api
```

---

## Support Contacts

- **Documentation**: scripts/knowledge/README_COMPLETE.md
- **Integration Guide**: scripts/knowledge/INTEGRATION_GUIDE.md
- **Quick Start**: config/knowledge/QUICK_START.md

---

**Deployment Checklist Complete** ✅
**Version**: 1.1.0
**Date**: December 1, 2025
