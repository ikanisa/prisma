# Observability & Operations Documentation

**Job:** P9-OBS  
**Version:** 1.0.0  
**Last Updated:** 2025-11-02  
**Purpose:** Document observability infrastructure, dashboards, and operational procedures

---

## Overview

Prisma Glow implements comprehensive observability using:
- **Structured Logging:** JSON logs with correlation IDs
- **Error Tracking:** Sentry for error monitoring
- **Tracing:** OpenTelemetry for distributed tracing
- **Metrics:** Custom metrics and dashboards
- **Healthchecks:** Endpoint monitoring

---

## Logging Infrastructure

### Structured Logging

**Python (FastAPI):**

```python
# server/main.py
import structlog

logger = structlog.get_logger()

logger.info(
    "document_uploaded",
    doc_id=doc_id,
    user_id=user.id,
    org_id=org_id,
    file_size=file.size,
    request_id=request.state.request_id,
)
```

**Configuration:**
- **Format:** JSON
- **Fields:** timestamp, level, message, context
- **Correlation ID:** `x-request-id` header
- **PII Redaction:** Sensitive fields masked

### Log Levels

| Level | Usage |
|-------|-------|
| **DEBUG** | Detailed diagnostic information |
| **INFO** | General informational messages |
| **WARNING** | Warning messages (non-critical issues) |
| **ERROR** | Error messages (handled exceptions) |
| **CRITICAL** | Critical errors (system failures) |

### PII Redaction

**Sensitive Fields:**
- Email addresses
- Phone numbers
- SSNs/Tax IDs
- Passwords
- API keys

**Implementation:**
```python
# server/settings.py
REDACTED_FIELDS = [
    "password",
    "api_key",
    "token",
    "secret",
    "ssn",
    "tax_id",
]

def redact_pii(log_data: dict) -> dict:
    """Redact PII from log data."""
    for field in REDACTED_FIELDS:
        if field in log_data:
            log_data[field] = "***REDACTED***"
    return log_data
```

---

## Error Tracking

### Sentry Integration

**Configuration:**

```python
# server/main.py
import sentry_sdk

SENTRY_DSN = os.getenv("SENTRY_DSN")
SENTRY_ENVIRONMENT = os.getenv("SENTRY_ENVIRONMENT", "development")
SENTRY_RELEASE = os.getenv("SENTRY_RELEASE")

if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        environment=SENTRY_ENVIRONMENT,
        release=SENTRY_RELEASE,
        traces_sample_rate=1.0,
    )
```

**Environment Variables:**

```env
# Global fallback
SENTRY_DSN="https://public-key@sentry.io/project-id"

# Service-specific DSNs
WEB_SENTRY_DSN="https://..."          # Next.js server
NEXT_PUBLIC_SENTRY_DSN="https://..."  # Next.js client
GATEWAY_SENTRY_DSN="https://..."      # Gateway service

# Environment and release
SENTRY_ENVIRONMENT="production"
SENTRY_RELEASE="v1.2.3"
```

### Error Context

**Attach context to errors:**

```python
with sentry_sdk.configure_scope() as scope:
    scope.set_user({
        "id": user.id,
        "email": user.email,
        "org_id": org_id,
    })
    scope.set_tag("request_id", request_id)
    scope.set_extra("document_id", doc_id)
```

### Release Tracking

**Process:**
1. Build application with version tag
2. Set `SENTRY_RELEASE` environment variable
3. Upload source maps (if applicable)
4. Create Sentry release and associate commits

```bash
# Create Sentry release
sentry-cli releases new "$SENTRY_RELEASE"
sentry-cli releases set-commits "$SENTRY_RELEASE" --auto
sentry-cli releases finalize "$SENTRY_RELEASE"
```

---

## Distributed Tracing

### OpenTelemetry Integration

**Configuration:**

```python
# server/telemetry.py
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource

SERVICE_NAME = os.getenv("OTEL_SERVICE_NAME", "gateway")
OTEL_ENDPOINT = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT")

resource = Resource.create({"service.name": SERVICE_NAME})
provider = TracerProvider(resource=resource)

if OTEL_ENDPOINT:
    exporter = OTLPSpanExporter(endpoint=OTEL_ENDPOINT)
    provider.add_span_processor(BatchSpanProcessor(exporter))

trace.set_tracer_provider(provider)
```

**Environment Variables:**

```env
OTEL_SERVICE_NAME="gateway"
OTEL_EXPORTER_OTLP_ENDPOINT="https://otel-collector.example.com"
```

### Trace Context Propagation

**Correlation ID propagation:**

```python
# Middleware adds trace context to logs
logger = logger.bind(
    trace_id=trace.get_current_span().get_span_context().trace_id,
    span_id=trace.get_current_span().get_span_context().span_id,
)
```

---

## Metrics & Dashboards

### Required Dashboards (per Playbook)

#### 1. Assistant Adoption

**Metrics:**
- Total conversations
- Active users
- Average messages per conversation
- Tool invocations
- Response time (p50, p95, p99)

**Implementation:**
```python
# Track assistant usage
metrics.counter("assistant.conversations.total", tags={"org_id": org_id})
metrics.histogram("assistant.response_time", duration_ms)
metrics.counter("assistant.tool_invocations", tags={"tool": tool_name})
```

#### 2. Document Pipeline

**Stages:**
1. Upload
2. Extract (OCR/parsing)
3. Accept (user review)
4. Commit (finalize)

**Metrics:**
- Documents at each stage
- Processing time per stage
- Success/failure rates
- Throughput (docs/hour)

```python
metrics.counter("documents.uploaded", tags={"org_id": org_id})
metrics.histogram("documents.extract_time", duration_ms)
metrics.counter("documents.extract_errors", tags={"error_type": error_type})
```

#### 3. Approvals SLA

**Metrics:**
- Pending approvals
- Approval time (creation → decision)
- MFA completion rate
- Overdue approvals

```python
metrics.gauge("approvals.pending", count, tags={"org_id": org_id})
metrics.histogram("approvals.decision_time", duration_hours)
metrics.counter("approvals.mfa_required")
metrics.counter("approvals.overdue", tags={"severity": "high"})
```

#### 4. Security Denials

**Metrics:**
- RLS policy violations
- Permission check failures
- Failed authentication attempts
- Suspicious activity

```python
metrics.counter("security.rls_denied", tags={"table": table_name})
metrics.counter("security.permission_denied", tags={"action": action})
metrics.counter("security.auth_failed", tags={"reason": reason})
```

### Dashboard Tools

**Options:**
- Grafana (self-hosted)
- Datadog
- New Relic
- Custom dashboards (Next.js/React)

**Recommended:** Grafana with Prometheus or InfluxDB backend

---

## Health Checks

### Endpoints

**FastAPI Health Check:**

```python
# server/main.py
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "version": SERVICE_VERSION,
        "timestamp": datetime.utcnow().isoformat(),
    }

@app.get("/health/db")
async def database_health():
    """Database health check."""
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        raise HTTPException(500, f"Database unhealthy: {str(e)}")

@app.get("/health/dependencies")
async def dependencies_health():
    """Check external dependencies."""
    checks = {
        "database": await check_database(),
        "redis": await check_redis(),
        "supabase": await check_supabase(),
        "openai": await check_openai(),
    }
    
    all_healthy = all(checks.values())
    status_code = 200 if all_healthy else 503
    
    return Response(
        content=json.dumps({"status": "healthy" if all_healthy else "degraded", "checks": checks}),
        status_code=status_code,
        media_type="application/json",
    )
```

### Monitoring

**Tools:**
- Uptime monitors (UptimeRobot, Pingdom)
- Synthetic monitoring (Datadog, New Relic)
- Custom health check scripts

**Frequency:**
- `/health` - Every 30 seconds
- `/health/db` - Every 60 seconds
- `/health/dependencies` - Every 120 seconds

---

## Backup & Restore

### Database Backups

**Automated Backups:**
- Supabase: Daily automatic backups (7-30 day retention)
- Additional backups: Weekly full dumps

**Manual Backup:**
```bash
# Full database dump
pg_dump "$DATABASE_URL" > backup-$(date +%Y%m%d-%H%M%S).sql.gz

# Compressed
pg_dump "$DATABASE_URL" | gzip > backup-$(date +%Y%m%d).sql.gz
```

**Backup Schedule:**
- Daily: Automated via Supabase
- Weekly: Manual full dump to S3/backup storage
- Monthly: Archive for long-term retention

### Restore Procedures

**From Supabase Backup:**
1. Navigate to Supabase Dashboard → Database → Backups
2. Select backup point
3. Click "Restore"
4. Confirm restoration

**From Manual Dump:**
```bash
# Restore from backup
psql "$DATABASE_URL" < backup-20251102.sql

# Or from compressed
gunzip -c backup-20251102.sql.gz | psql "$DATABASE_URL"
```

**Testing:**
- Test restores monthly in staging
- Document restore time
- Verify data integrity

**Runbook:** `GO-LIVE/RELEASE_RUNBOOK.md` includes restore procedures

---

## Alerting

### Alert Channels

**Configured via environment variables:**

```env
# Webhooks for alerts
ERROR_NOTIFY_WEBHOOK="https://hooks.example.com/error"
TELEMETRY_ALERT_WEBHOOK="https://hooks.example.com/telemetry"
RATE_LIMIT_ALERT_WEBHOOK="https://hooks.example.com/rate-limit"
EMBEDDING_ALERT_WEBHOOK="https://hooks.example.com/embedding"
```

### Alert Rules

**Critical Alerts:**
- Error rate > 5% (5 min window)
- Response time p99 > 5s (5 min window)
- Database connection failures
- Authentication service down
- Storage full (>90%)

**Warning Alerts:**
- Error rate > 2% (15 min window)
- Response time p95 > 2s (15 min window)
- Queue depth > 1000
- Cache hit rate < 80%

**Example Alert:**
```python
# server/telemetry.py
async def check_error_rate():
    """Alert if error rate exceeds threshold."""
    error_rate = calculate_error_rate(window_minutes=5)
    
    if error_rate > 0.05:  # 5%
        await send_alert(
            channel=TELEMETRY_ALERT_WEBHOOK,
            severity="critical",
            message=f"Error rate {error_rate*100:.1f}% exceeds 5% threshold",
            metrics={"error_rate": error_rate},
        )
```

---

## Operational Runbooks

### Common Operations

**Location:** `docs/runbooks/`

1. **Deployment** - `GO-LIVE/RELEASE_RUNBOOK.md`
2. **Rollback** - `GO-LIVE/ROLLBACK_PLAN.md`
3. **Database Migration** - `supabase/README.md`
4. **Key Rotation** - `SECURITY/keys_rotation.md`
5. **Incident Response** - (needs creation)
6. **Performance Troubleshooting** - (needs creation)

### On-Call Procedures

**Response Times:**
- P0 (Critical): 15 minutes
- P1 (High): 1 hour
- P2 (Medium): 4 hours
- P3 (Low): Next business day

**Escalation:**
1. On-call engineer
2. Team lead
3. Engineering manager
4. CTO

---

## Action Items

### Priority 1: Dashboard Implementation

- [ ] **Create Grafana dashboards:**
  - Assistant adoption
  - Document pipeline
  - Approvals SLA
  - Security denials

- [ ] **Implement metrics collection:**
  - Instrument key operations
  - Set up Prometheus/InfluxDB
  - Configure Grafana data sources

### Priority 2: Alerting

- [ ] **Configure alert rules:**
  - Critical: Error rate, downtime
  - Warning: Performance degradation
  - Info: Scheduled maintenance

- [ ] **Set up alert routing:**
  - Slack/Teams integration
  - PagerDuty for critical alerts
  - Email for non-urgent

### Priority 3: Runbooks

- [ ] **Create missing runbooks:**
  - Incident response
  - Performance troubleshooting
  - Disaster recovery
  - Security incident response

- [ ] **Document playbooks:**
  - Common issues and solutions
  - Debugging procedures
  - Escalation paths

### Priority 4: Backup & Restore

- [ ] **Test restore procedures:**
  - Monthly test restores
  - Document restore time
  - Automate backup verification

- [ ] **Implement backup monitoring:**
  - Alert on backup failures
  - Track backup size trends
  - Monitor retention compliance

---

## Summary

### Current Infrastructure

✅ **Logging:** Structured JSON logs with correlation IDs  
✅ **Error Tracking:** Sentry integration configured  
✅ **Tracing:** OpenTelemetry configured  
✅ **Health Checks:** `/health` endpoints implemented  
✅ **Backups:** Automated Supabase backups  

### Gaps

🔄 **Dashboards:** Need implementation (Grafana)  
🔄 **Metrics:** Need systematic instrumentation  
🔄 **Alerting:** Basic webhooks configured, need full alert rules  
🔄 **Runbooks:** Some exist, need incident response and troubleshooting guides  

### Recommendations

1. **Implement comprehensive dashboards** using Grafana
2. **Instrument key operations** with metrics
3. **Set up production alerting** with PagerDuty
4. **Create operational runbooks** for common scenarios
5. **Test backup/restore** procedures regularly

---

**Last Updated:** 2025-11-02  
**Maintainer:** Operations Team  
**Related:** `ENV_GUIDE.md`, `GO-LIVE/RELEASE_RUNBOOK.md`, `GO-LIVE/ROLLBACK_PLAN.md`
