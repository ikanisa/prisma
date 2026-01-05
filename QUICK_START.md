# Quick Start Guide

Get your production setup running in 5 minutes.

## 1. Install Dependencies

```bash
cd apps/web
pnpm add @opentelemetry/api @opentelemetry/sdk-node @opentelemetry/exporter-otlp-http @opentelemetry/instrumentation-http @opentelemetry/resources @opentelemetry/semantic-conventions @opentelemetry/sdk-trace-base prom-client
pnpm add -D tsx
```

## 2. Set Environment Variables

Create `.env.local`:

```bash
# OAuth (Required for ChatGPT App Store)
OPENAI_APP_OAUTH_CLIENT_ID=your_client_id
OPENAI_APP_OAUTH_CLIENT_SECRET=your_client_secret
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Observability (Optional)
OTEL_ENABLED=true
OTEL_SERVICE_NAME=prisma-glow
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces
METRICS_BACKEND=prometheus
TRACING_BACKEND=opentelemetry
```

## 3. Start Observability Stack (Optional)

```bash
# Start Prometheus and Grafana
docker-compose -f docker-compose.observability.yml up -d

# Access:
# - Prometheus: http://localhost:9090
# - Grafana: http://localhost:3001 (admin/admin)
# - Metrics: http://localhost:3000/api/metrics
```

## 4. Run Tests

```bash
# Test OAuth
npx tsx scripts/test-oauth.ts

# Test MCP Server
npx tsx scripts/test-mcp.ts

# Test ChatGPT UI
npx tsx scripts/test-chatgpt-ui.ts

# Test All
npx tsx scripts/test-all.ts
```

## 5. Start Development Server

```bash
cd apps/web
pnpm dev
```

## 6. Verify Setup

- **Metrics**: http://localhost:3000/api/metrics
- **MCP Server**: http://localhost:3000/api/mcp
- **ChatGPT UI**: http://localhost:3000/chatgpt
- **App Config**: http://localhost:3000/.well-known/openai-app-config.json

## Next Steps

1. **Set up OAuth in OpenAI Developer Portal** (see `docs/NEXT_STEPS_IMPLEMENTATION.md`)
2. **Configure alerts** (see `prometheus/alerts.yml`)
3. **Submit to ChatGPT App Store** (see `docs/PRODUCTION_SETUP.md`)

## Troubleshooting

- **OAuth not working?** Check environment variables and redirect URI
- **Metrics not showing?** Verify Prometheus is scraping `/api/metrics`
- **MCP server errors?** Check authentication and tool registry

For detailed instructions, see:
- `docs/PRODUCTION_SETUP.md` - Complete production setup
- `docs/NEXT_STEPS_IMPLEMENTATION.md` - Step-by-step implementation
- `docs/REFERENCE_REPOSITORIES.md` - OpenAI reference patterns

