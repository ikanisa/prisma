# API Reference

This directory contains API documentation for the Prisma Glow platform.

## OpenAPI Specification

The API is documented using OpenAPI 3.0. See [openapi.yaml](./openapi.yaml) for the full specification.

### Viewing the Spec

```bash
# Install Swagger UI locally
npx swagger-ui-express-cli openapi.yaml

# Or use online viewer
# https://editor.swagger.io/
```

## Base URLs

| Environment | URL |
|-------------|-----|
| Production | https://prisma.ikanisa.com |
| Development | http://localhost:3000 |

## Authentication

All protected endpoints require a valid JWT token from Supabase Auth.

```bash
# Example authenticated request
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  https://prisma.ikanisa.com/api/ai/status
```

## Rate Limits

| Endpoint Type | Limit |
|--------------|-------|
| AI endpoints | 20/min |
| Auth endpoints | 10/min |
| Default | 100/min |

Rate limit headers are included in all API responses:
- `X-RateLimit-Limit`: Maximum requests per window
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Window reset timestamp

## Endpoints

### Health & Monitoring

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/health | Health check |
| GET | /api/metrics | Prometheus metrics |

### AI & Agents

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/ai/status | AI service status |
| POST | /api/agent/orchestrator | Send agent query |

### ChatKit

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/chatkit/session | List sessions |
| POST | /api/chatkit/session | Create session |
| POST | /api/chatkit/message | Send message |
