# Production Setup Guide

This guide covers setting up tracing, metrics, alerts, OAuth, and ChatGPT App Store submission.

## 1. Tracing Backend Setup

### Option A: OpenTelemetry

#### Installation

```bash
# Install OpenTelemetry packages
pnpm add @opentelemetry/api @opentelemetry/sdk-node @opentelemetry/exporter-jaeger @opentelemetry/instrumentation-http
```

#### Configuration

Create `apps/web/lib/observability/opentelemetry.ts`:

```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';

const sdk = new NodeSDK({
  traceExporter: new JaegerExporter({
    endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
  }),
  instrumentations: [new HttpInstrumentation()],
});

sdk.start();

export { sdk };
```

#### Environment Variables

```bash
JAEGER_ENDPOINT=http://localhost:14268/api/traces
OTEL_SERVICE_NAME=prisma-glow
OTEL_RESOURCE_ATTRIBUTES=service.name=prisma-glow,service.version=1.0.0
```

### Option B: Datadog

#### Installation

```bash
pnpm add dd-trace
```

#### Configuration

Create `apps/web/lib/observability/datadog.ts`:

```typescript
import tracer from 'dd-trace';

tracer.init({
  service: 'prisma-glow',
  env: process.env.NODE_ENV,
  version: process.env.APP_VERSION,
  logInjection: true,
});

export { tracer };
```

#### Environment Variables

```bash
DD_AGENT_HOST=localhost
DD_TRACE_AGENT_PORT=8126
DD_SERVICE=prisma-glow
DD_ENV=production
DD_VERSION=1.0.0
```

### Integration with Existing Tracer

Update `apps/web/lib/observability/tracing.ts` to export to backend:

```typescript
// Add to exportSpan method
private exportSpan(span: TraceSpan): void {
  if (process.env.TRACING_BACKEND === 'opentelemetry') {
    // Export to OpenTelemetry
    // Implementation depends on chosen backend
  } else if (process.env.TRACING_BACKEND === 'datadog') {
    // Export to Datadog
    // Implementation depends on chosen backend
  }
}
```

## 2. Metrics Backend Setup

### Option A: Prometheus

#### Installation

```bash
pnpm add prom-client
```

#### Configuration

Create `apps/web/lib/observability/prometheus.ts`:

```typescript
import { Registry, Counter, Histogram, Gauge } from 'prom-client';

const register = new Registry();

// Tool metrics
export const toolCallsTotal = new Counter({
  name: 'tool_calls_total',
  help: 'Total number of tool calls',
  labelNames: ['tool', 'status'],
  registers: [register],
});

export const toolCallsDuration = new Histogram({
  name: 'tool_calls_duration_seconds',
  help: 'Tool call duration in seconds',
  labelNames: ['tool'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
  registers: [register],
});

// API metrics
export const apiRequestsTotal = new Counter({
  name: 'api_requests_total',
  help: 'Total number of API requests',
  labelNames: ['endpoint', 'method', 'status'],
  registers: [register],
});

export const apiRequestsDuration = new Histogram({
  name: 'api_requests_duration_seconds',
  help: 'API request duration in seconds',
  labelNames: ['endpoint', 'method'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
  registers: [register],
});

// Export metrics endpoint
export async function getMetrics(): Promise<string> {
  return register.metrics();
}

export { register };
```

#### Metrics Endpoint

Create `apps/web/app/api/metrics/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { getMetrics } from '@/lib/observability/prometheus';

export async function GET() {
  const metrics = await getMetrics();
  return new NextResponse(metrics, {
    headers: {
      'Content-Type': 'text/plain; version=0.0.4',
    },
  });
}
```

### Option B: Datadog

#### Installation

```bash
pnpm add datadog-metrics
```

#### Configuration

Create `apps/web/lib/observability/datadog-metrics.ts`:

```typescript
import { BufferedMetricsLogger } from 'datadog-metrics';

const logger = new BufferedMetricsLogger({
  apiKey: process.env.DATADOG_API_KEY,
  host: process.env.DD_AGENT_HOST || 'localhost',
  port: process.env.DD_DOGSTATSD_PORT || 8125,
  prefix: 'prisma_glow.',
});

export { logger };
```

#### Integration

Update `apps/web/lib/observability/metrics.ts` to export to Datadog:

```typescript
import { logger } from './datadog-metrics';

// In record method
if (process.env.METRICS_BACKEND === 'datadog') {
  if (metric.type === 'counter') {
    logger.increment(metric.name, metric.value, metric.tags);
  } else if (metric.type === 'gauge') {
    logger.gauge(metric.name, metric.value, metric.tags);
  } else if (metric.type === 'histogram') {
    logger.histogram(metric.name, metric.value, metric.tags);
  }
}
```

## 3. Alerting Setup

### Prometheus + Alertmanager

#### Alert Rules

Create `prometheus/alerts.yml`:

```yaml
groups:
  - name: prisma_glow_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(api_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors/second"

      - alert: HighToolCallLatency
        expr: histogram_quantile(0.95, tool_calls_duration_seconds) > 5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High tool call latency"
          description: "95th percentile latency is {{ $value }} seconds"

      - alert: RateLimitExceeded
        expr: rate(rate_limit_exceeded_total[5m]) > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Rate limit exceeded frequently"
          description: "Rate limit exceeded {{ $value }} times/minute"
```

### Datadog Alerts

Create alerts in Datadog dashboard:

1. **High Error Rate**
   - Metric: `prisma_glow.api.requests.errors`
   - Threshold: > 10 errors/minute
   - Notification: Slack/PagerDuty

2. **High Latency**
   - Metric: `prisma_glow.api.requests.duration.p95`
   - Threshold: > 2 seconds
   - Notification: Slack

3. **Rate Limit Hits**
   - Metric: `prisma_glow.rate_limit.exceeded`
   - Threshold: > 50 hits/hour
   - Notification: Slack

## 4. OAuth Setup in OpenAI Developer Portal

### Step 1: Register Your App

1. Go to [OpenAI Developer Portal](https://platform.openai.com)
2. Navigate to "Apps" → "Create App"
3. Fill in app details:
   - Name: Prisma Glow
   - Description: AI-powered audit, tax, and accounting operations platform
   - Category: Business/Productivity

### Step 2: Configure OAuth

1. Go to "OAuth" section in app settings
2. Create OAuth application
3. Set redirect URI: `https://your-domain.com/api/auth/openai/callback`
4. Copy Client ID and Client Secret

### Step 3: Update Environment Variables

```bash
OPENAI_APP_OAUTH_CLIENT_ID=your_client_id_here
OPENAI_APP_OAUTH_CLIENT_SECRET=your_client_secret_here
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Step 4: Test OAuth Flow

1. Visit `/api/auth/openai/authorize` (create this endpoint)
2. Should redirect to OpenAI OAuth
3. After authorization, should redirect back to callback
4. Verify tokens are stored in database

## 5. ChatGPT App Store Submission

### Prerequisites

- [ ] OAuth configured and tested
- [ ] MCP server accessible at `/api/mcp`
- [ ] App config at `/.well-known/openai-app-config.json`
- [ ] Privacy policy and terms of service
- [ ] App icon and screenshots
- [ ] App description and features

### Submission Checklist

#### 1. App Configuration

Verify `apps/web/public/.well-known/openai-app-config.json`:

- [ ] All required fields filled
- [ ] OAuth client ID configured
- [ ] API endpoints correct
- [ ] Capabilities listed
- [ ] Metadata complete

#### 2. MCP Server

- [ ] Accessible at `/api/mcp`
- [ ] Returns tool list correctly
- [ ] Tool calls work with authentication
- [ ] Error handling works

#### 3. UI Components

- [ ] ChatGPT app page renders correctly
- [ ] Widgets work in iframe
- [ ] Actions communicate with ChatGPT
- [ ] Responsive design

#### 4. Security

- [ ] OAuth flow secure
- [ ] Rate limiting enabled
- [ ] Input validation
- [ ] Error messages don't leak info
- [ ] HTTPS only

#### 5. Documentation

- [ ] User guide
- [ ] API documentation
- [ ] Privacy policy
- [ ] Terms of service

### Submission Steps

1. **Prepare Submission Package**
   - App config JSON
   - Screenshots (at least 3)
   - App icon (512x512 PNG)
   - Description (500 words max)
   - Privacy policy URL
   - Terms of service URL

2. **Submit in Developer Portal**
   - Go to "Apps" → "Submit for Review"
   - Upload package
   - Fill in submission form
   - Submit

3. **Review Process**
   - OpenAI reviews app (typically 1-2 weeks)
   - May request changes
   - Once approved, app goes live

### Testing Before Submission

```bash
# Test MCP server
curl -X POST https://your-domain.com/api/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"method": "tools/list"}'

# Test OAuth flow
# Visit: https://your-domain.com/api/auth/openai/authorize

# Test ChatGPT UI
# Load: https://your-domain.com/chatgpt
```

## 6. Reference Repositories

The following OpenAI repositories have been cloned to `~/workspace`:

- `openai-chatkit-starter-app` - Basic ChatKit integration
- `openai-chatkit-advanced-samples` - Advanced ChatKit patterns
- `openai-agents-python` - Agent orchestration examples

### Key Learnings

**From ChatKit Starter:**
- Basic ChatKit integration pattern
- Session management
- Widget rendering

**From ChatKit Advanced:**
- FastAPI backend integration
- Streaming responses
- Complex widget patterns

**From Agents Python:**
- Agent orchestration patterns
- Tool calling best practices
- Workflow management

## 7. Production Deployment Checklist

- [ ] Environment variables configured
- [ ] Tracing backend connected
- [ ] Metrics backend connected
- [ ] Alerts configured
- [ ] OAuth tested end-to-end
- [ ] Rate limits tuned
- [ ] Database migrations applied
- [ ] CI/CD pipeline passing
- [ ] Security scan passed
- [ ] Performance tested
- [ ] Documentation complete
- [ ] App Store submission ready

## 8. Monitoring Dashboard

### Key Metrics to Monitor

1. **API Performance**
   - Request rate
   - Response time (p50, p95, p99)
   - Error rate
   - Rate limit hits

2. **Tool Execution**
   - Tool call rate
   - Tool execution time
   - Tool error rate
   - Most used tools

3. **Agent Operations**
   - Agent request rate
   - Agent response time
   - Agent error rate
   - Agent routing accuracy

4. **System Health**
   - CPU usage
   - Memory usage
   - Database connection pool
   - Cache hit rate

### Dashboard Examples

**Grafana Dashboard (Prometheus):**
- API request rate graph
- Error rate graph
- Tool call latency histogram
- Rate limit hits counter

**Datadog Dashboard:**
- Service map
- APM traces
- Custom metrics
- Logs correlation

## Next Steps

1. Choose tracing backend (OpenTelemetry or Datadog)
2. Choose metrics backend (Prometheus or Datadog)
3. Set up infrastructure (Kubernetes, Docker, etc.)
4. Configure alerts
5. Complete OAuth setup
6. Submit to ChatGPT App Store
7. Monitor and iterate

