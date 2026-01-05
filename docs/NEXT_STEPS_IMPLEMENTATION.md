# Next Steps Implementation Guide

This guide provides step-by-step instructions for implementing the production setup steps.

## Prerequisites

- Node.js 22.12.0 (via Volta)
- pnpm installed
- Environment variables configured
- Access to OpenAI Developer Portal

## Step 1: Install Dependencies

### OpenTelemetry (Tracing)

```bash
cd apps/web
pnpm add @opentelemetry/api @opentelemetry/sdk-node @opentelemetry/exporter-jaeger @opentelemetry/exporter-otlp-http @opentelemetry/instrumentation-http @opentelemetry/resources @opentelemetry/semantic-conventions @opentelemetry/sdk-trace-base
```

### Prometheus (Metrics)

```bash
pnpm add prom-client
```

### Test Scripts

```bash
pnpm add -D tsx
```

## Step 2: Configure Environment Variables

Add to `.env.local`:

```bash
# OpenTelemetry
OTEL_ENABLED=true
OTEL_SERVICE_NAME=prisma-glow
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces
# OR for Jaeger:
JAEGER_ENDPOINT=http://localhost:14268/api/traces

# Prometheus
METRICS_BACKEND=prometheus
# Metrics are exposed at /api/metrics

# Tracing Backend
TRACING_BACKEND=opentelemetry
# OR: datadog

# OAuth
OPENAI_APP_OAUTH_CLIENT_ID=your_client_id
OPENAI_APP_OAUTH_CLIENT_SECRET=your_client_secret
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## Step 3: Initialize Observability

### Update Next.js App Entry Point

Create or update `apps/web/instrumentation.ts`:

```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./lib/observability/opentelemetry');
  }
}
```

### Update Next.js Config

Add to `apps/web/next.config.js`:

```javascript
const nextConfig = {
  experimental: {
    instrumentationHook: true,
  },
  // ... rest of config
};
```

## Step 4: Set Up Prometheus

### Option A: Docker (Recommended for Development)

Create `docker-compose.observability.yml`:

```yaml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - ./prometheus/alerts.yml:/etc/prometheus/alerts.yml
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/usr/share/prometheus/console_libraries'
      - '--web.console.templates=/usr/share/prometheus/consoles'

  alertmanager:
    image: prom/alertmanager:latest
    ports:
      - "9093:9093"
    volumes:
      - ./prometheus/alertmanager.yml:/etc/alertmanager/alertmanager.yml
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-storage:/var/lib/grafana
```

### Create Prometheus Config

Create `prometheus/prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alerts.yml"

scrape_configs:
  - job_name: 'prisma-glow'
    static_configs:
      - targets: ['host.docker.internal:3000']
    metrics_path: '/api/metrics'
    scrape_interval: 5s
```

### Start Services

```bash
docker-compose -f docker-compose.observability.yml up -d
```

Access:
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001 (admin/admin)

## Step 5: Set Up OpenTelemetry Collector (Optional)

For production, use OpenTelemetry Collector:

```yaml
# docker-compose.observability.yml
services:
  otel-collector:
    image: otel/opentelemetry-collector:latest
    ports:
      - "4317:4317"   # OTLP gRPC receiver
      - "4318:4318"   # OTLP HTTP receiver
    volumes:
      - ./otel-collector-config.yml:/etc/otelcol/config.yaml
```

## Step 6: Test OAuth Flow

```bash
# Run OAuth test
npx tsx scripts/test-oauth.ts

# Or test all
npx tsx scripts/test-all.ts
```

Expected output:
- ✅ OAuth credentials configured
- ✅ Authorization endpoint redirects correctly
- ✅ Callback endpoint exists
- ✅ Token exchange endpoint exists

## Step 7: Test MCP Server

```bash
# Run MCP test
npx tsx scripts/test-mcp.ts
```

Expected output:
- ✅ MCP server responds to GET
- ✅ tools/list works
- ✅ Authentication required for tools/call

## Step 8: Test ChatGPT UI

```bash
# Run ChatGPT UI test
npx tsx scripts/test-chatgpt-ui.ts
```

Expected output:
- ✅ ChatGPT page exists
- ✅ App config exists
- ✅ All required fields present

## Step 9: Configure Alerts

### Prometheus Alertmanager Config

Create `prometheus/alertmanager.yml`:

```yaml
route:
  group_by: ['alertname', 'severity']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'default'
  routes:
    - match:
        severity: critical
      receiver: 'critical-alerts'
    - match:
        severity: warning
      receiver: 'warning-alerts'

receivers:
  - name: 'default'
    webhook_configs:
      - url: 'http://localhost:5001/webhook'
  
  - name: 'critical-alerts'
    webhook_configs:
      - url: 'http://localhost:5001/webhook/critical'
  
  - name: 'warning-alerts'
    webhook_configs:
      - url: 'http://localhost:5001/webhook/warning'
```

### Slack Integration (Optional)

```yaml
receivers:
  - name: 'slack-alerts'
    slack_configs:
      - api_url: 'YOUR_SLACK_WEBHOOK_URL'
        channel: '#alerts'
        title: 'Prisma Glow Alert'
        text: '{{ .CommonAnnotations.summary }}'
```

## Step 10: OAuth Setup in OpenAI Developer Portal

### Step-by-Step

1. **Go to OpenAI Developer Portal**
   - Visit https://platform.openai.com
   - Navigate to "Apps" → "Create App"

2. **Fill in App Details**
   - Name: Prisma Glow
   - Description: AI-powered audit, tax, and accounting operations platform
   - Category: Business/Productivity

3. **Configure OAuth**
   - Go to "OAuth" section
   - Click "Create OAuth Application"
   - Set redirect URI: `https://your-domain.com/api/auth/openai/callback`
   - Select scopes: `openid`, `profile`, `email`
   - Save

4. **Copy Credentials**
   - Copy Client ID
   - Copy Client Secret (only shown once!)

5. **Update Environment Variables**
   ```bash
   OPENAI_APP_OAUTH_CLIENT_ID=<your_client_id>
   OPENAI_APP_OAUTH_CLIENT_SECRET=<your_client_secret>
   ```

6. **Test OAuth Flow**
   ```bash
   npx tsx scripts/test-oauth.ts
   ```

## Step 11: ChatGPT App Store Submission

### Pre-Submission Checklist

- [ ] OAuth configured and tested
- [ ] MCP server accessible at `/api/mcp`
- [ ] App config at `/.well-known/openai-app-config.json`
- [ ] ChatGPT UI at `/chatgpt` works
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] App icon (512x512 PNG)
- [ ] Screenshots (at least 3)
- [ ] App description (500 words max)

### Submission Steps

1. **Prepare Submission Package**
   - App config JSON (already at `/.well-known/openai-app-config.json`)
   - Screenshots (save to `apps/web/public/screenshots/`)
   - App icon (save to `apps/web/public/icons/icon-512.png`)
   - Description (prepare in markdown)

2. **Verify App Config**
   ```bash
   curl https://your-domain.com/.well-known/openai-app-config.json | jq
   ```

3. **Test MCP Server**
   ```bash
   curl -X POST https://your-domain.com/api/mcp \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
   ```

4. **Submit in Developer Portal**
   - Go to "Apps" → "Submit for Review"
   - Upload package
   - Fill in submission form
   - Submit

### Review Process

- Typically takes 1-2 weeks
- OpenAI may request changes
- Once approved, app goes live

## Step 12: Monitoring Dashboard Setup

### Grafana Dashboard

1. **Import Dashboard**
   - Go to Grafana (http://localhost:3001)
   - Import dashboard ID: 1860 (Node Exporter Full)
   - Add Prometheus as data source

2. **Create Custom Dashboard**
   - Add panels for:
     - API request rate
     - Error rate
     - Tool call latency
     - Rate limit hits
     - Active sessions

3. **Set Up Alerts**
   - Configure alert rules in Prometheus
   - Set up notification channels in Grafana

## Troubleshooting

### OpenTelemetry Not Working

- Check `OTEL_ENABLED=true` in env
- Verify collector is running
- Check logs for errors

### Prometheus Not Scraping

- Verify `/api/metrics` endpoint works
- Check Prometheus config
- Verify network connectivity

### OAuth Flow Fails

- Verify redirect URI matches exactly
- Check client ID and secret
- Review callback endpoint logs

### MCP Server Not Responding

- Check authentication
- Verify tool registry is initialized
- Review error logs

## Next Steps After Setup

1. **Monitor Metrics**
   - Set up dashboards
   - Configure alerts
   - Review performance

2. **Optimize**
   - Tune rate limits
   - Optimize slow queries
   - Improve error handling

3. **Scale**
   - Add more instances
   - Set up load balancing
   - Configure auto-scaling

## Support

For issues or questions:
- Check logs in `/var/log/prisma-glow/`
- Review Prometheus metrics
- Check OpenTelemetry traces
- Review documentation in `docs/`

