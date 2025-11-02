# P9: Observability & Operations

## Overview
Complete observability infrastructure: structured logging, error tracking, distributed tracing, dashboards, health checks, alerting, backup/restore.

## Structured Logging
**Format:** JSON with correlation IDs
```json
{
  "level": "info",
  "message": "Request processed",
  "correlationId": "req_abc123",
  "userId": "user_456",
  "duration": 145,
  "timestamp": "2025-11-02T16:30:00.000Z"
}
```

## Error Tracking
**Tool:** Sentry
**Configuration:** See ENV_GUIDE.md for DSN variables

## Distributed Tracing
**Tool:** OpenTelemetry
**Exporter:** OTLP HTTP
**Spans:** Gateway, FastAPI, RAG, Agents

## Required Dashboards
1. **Assistant Adoption:** Queries/day, users, success rate
2. **Document Pipeline:** Upload rate, processing time, failures
3. **Approvals SLA:** Pending count, approval time, timeout rate
4. **Security Denials:** Failed auth, tool denials, RBAC violations

## Health Checks
```bash
curl https://api.prismaglow.com/health
curl https://api.prismaglow.com/ready
```

## Alerting Thresholds
- Error rate > 1% → Page on-call
- Response time p95 > 2s → Investigate
- Rate limit hits > 100/min → Scale up

## Backup & Restore
See supabase/README.md for procedures

**Version:** 1.0.0 (2025-11-02)
