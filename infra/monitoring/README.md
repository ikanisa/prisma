# Learning System Monitoring & Alerting

Complete monitoring setup for the AI Agent Learning System using Prometheus, Grafana, and Alertmanager.

## Overview

This directory contains:
- Prometheus metrics configuration
- Grafana dashboard JSON
- Alert rules for critical conditions
- Docker Compose monitoring stack

## Quick Start

### 1. Start Monitoring Stack

```bash
cd infra/monitoring
docker-compose up -d
```

This starts:
- Prometheus (http://localhost:9090)
- Grafana (http://localhost:3001) - admin/admin
- Alertmanager (http://localhost:9093)
- Redis Exporter (for RQ metrics)

### 2. Import Grafana Dashboard

1. Open Grafana at http://localhost:3001
2. Login with admin/admin
3. Go to Dashboards → Import
4. Upload `grafana-learning-dashboard.json`
5. Select Prometheus datasource
6. Click Import

### 3. Configure Alerts

Alerts are automatically loaded from `prometheus-alerts.yml`:
- High queue length
- Worker down
- Low feedback rate
- High job failure rate

## Metrics Exposed

### Application Metrics

The learning system exposes these metrics:

```python
# Feedback metrics
agent_feedback_total{feedback_type, agent_id}
agent_feedback_rating{agent_id}

# Learning examples
learning_examples_pending
learning_examples_approved
learning_examples_rejected

# Job metrics (via RQ exporter)
rq_queue_length{queue}
rq_jobs_total{status, job_type}
rq_job_duration_seconds{job_type}
rq_workers_total{state}
```

### Adding Metrics to Your Code

In `server/api/learning.py`:

```python
from prometheus_client import Counter, Histogram, Gauge

# Define metrics
feedback_counter = Counter(
    'agent_feedback_total',
    'Total feedback submissions',
    ['feedback_type', 'agent_id']
)

feedback_rating = Gauge(
    'agent_feedback_rating',
    'Current feedback rating',
    ['agent_id']
)

# Use in endpoints
@router.post("/feedback")
async def submit_feedback(feedback: FeedbackSubmit):
    feedback_counter.labels(
        feedback_type=feedback.feedback_type,
        agent_id=feedback.agent_id
    ).inc()
    
    # ... rest of code
```

## Alert Rules

### Critical Alerts

1. **Worker Down**
   - Triggers: Worker offline for 5 minutes
   - Severity: Critical
   - Action: Page on-call

2. **High Queue Length**
   - Triggers: Queue > 100 jobs for 10 minutes
   - Severity: Warning
   - Action: Slack notification

3. **High Job Failure Rate**
   - Triggers: > 10% jobs failing
   - Severity: Warning
   - Action: Slack notification

4. **Low Feedback Rate**
   - Triggers: < 5% feedback rate for 24 hours
   - Severity: Info
   - Action: Email team

### Configuring Alert Destinations

Edit `alertmanager.yml`:

```yaml
receivers:
  - name: 'slack'
    slack_configs:
      - api_url: 'YOUR_SLACK_WEBHOOK_URL'
        channel: '#learning-alerts'
        
  - name: 'email'
    email_configs:
      - to: 'team@example.com'
        from: 'alerts@example.com'
        smarthost: 'smtp.gmail.com:587'
```

## Dashboard Panels

The Grafana dashboard includes:

1. **KPIs** (Top Row)
   - Feedback submissions (1h)
   - Average rating
   - Pending annotations
   - Approved examples
   - Worker status

2. **Trends** (Middle Row)
   - Feedback collection rate
   - Feedback by type
   - Queue length over time
   - Job duration p95

3. **Details** (Bottom Row)
   - Job status breakdown
   - Top agents by feedback
   - Failed jobs table

## Prometheus Queries

Useful queries for troubleshooting:

```promql
# Feedback rate by agent
rate(agent_feedback_total[5m])

# Average rating trend
avg_over_time(agent_feedback_rating[1h])

# Queue backlog
sum by(queue) (rq_queue_length)

# Job success rate
sum(rate(rq_jobs_total{status="completed"}[5m])) 
  / 
sum(rate(rq_jobs_total[5m]))

# P95 job duration
histogram_quantile(0.95, 
  sum(rate(rq_job_duration_seconds_bucket[5m])) by (le, job_type)
)
```

## Production Setup

### 1. External Prometheus

Point to your existing Prometheus:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'learning-api'
    static_configs:
      - targets: ['api:8000']
    metrics_path: '/metrics'
    
  - job_name: 'learning-worker'
    static_configs:
      - targets: ['worker:9121']  # RQ exporter
```

### 2. Long-term Storage

Configure Prometheus remote write to:
- Thanos
- Cortex
- VictoriaMetrics
- AWS Timestream

### 3. HA Setup

Run multiple instances:
- 2+ Prometheus instances
- 2+ Alertmanager instances (clustered)
- Load balanced Grafana

## Troubleshooting

### No Metrics Showing

1. Check Prometheus targets: http://localhost:9090/targets
2. Verify app is exposing `/metrics` endpoint
3. Check firewall rules

### Alerts Not Firing

1. Check Alertmanager: http://localhost:9093
2. Verify routes in `alertmanager.yml`
3. Check notification channel config

### Dashboard Not Loading

1. Verify Prometheus datasource configured
2. Check Grafana logs: `docker logs grafana`
3. Reimport dashboard JSON

## Cost Optimization

### Reduce Metrics Cardinality

Avoid high-cardinality labels:

```python
# ❌ BAD - user_id is high cardinality
feedback_counter.labels(user_id=user_id).inc()

# ✅ GOOD - aggregate by agent
feedback_counter.labels(agent_id=agent_id).inc()
```

### Adjust Retention

In `prometheus.yml`:

```yaml
global:
  # Keep 30 days instead of default 15
  storage_tsdb_retention_time: 30d
  
  # Scrape less frequently for non-critical metrics
  scrape_interval: 60s
```

## Files

```
infra/monitoring/
├── README.md                           # This file
├── docker-compose.yml                  # Monitoring stack
├── prometheus.yml                      # Prometheus config
├── prometheus-alerts.yml               # Alert rules
├── alertmanager.yml                    # Alert routing
├── grafana-learning-dashboard.json    # Grafana dashboard
└── redis-exporter.conf                # RQ metrics config
```

## Next Steps

1. ✅ Import Grafana dashboard
2. ⚠️ Configure Slack/email alerts
3. ⚠️ Set up on-call rotation
4. ⚠️ Create runbooks for alerts
5. ⚠️ Setup log aggregation (ELK/Loki)
6. ⚠️ Configure distributed tracing (Jaeger)

---

**Status**: Ready for deployment
**Last Updated**: 2025-11-28
