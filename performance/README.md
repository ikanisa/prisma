# Performance Testing Guide

## Quick Start

```bash
# Install Artillery
npm install -g artillery

# Run load test against staging
TARGET_URL=https://prisma.ikanisa.com npx artillery run performance/load-test.yml

# Run with report
TARGET_URL=https://prisma.ikanisa.com npx artillery run performance/load-test.yml --output report.json
npx artillery report report.json
```

## Test Scenarios

| Scenario | Weight | Description |
|----------|--------|-------------|
| Health Check | 10% | Baseline health endpoint |
| Dashboard Flow | 30% | Login → Dashboard navigation |
| AI Status Check | 20% | AI service availability |
| Metrics Check | 10% | Prometheus metrics endpoint |
| Static Assets | 30% | Homepage and login page |

## Performance Targets

| Metric | Target | Threshold |
|--------|--------|-----------|
| p50 Latency | < 100ms | Warning if exceeded |
| p95 Latency | < 500ms | **SLO Requirement** |
| p99 Latency | < 1000ms | Critical if exceeded |
| Error Rate | < 1% | **SLO Requirement** |
| Concurrent Users | 100 | Load test capacity |

## Load Phases

1. **Warm up** (60s): 5 users/sec
2. **Ramp up** (60s): 5 → 50 users/sec
3. **Sustained** (300s): 50 users/sec
4. **Cool down** (60s): 50 → 5 users/sec

## Running Tests

### Local Development
```bash
TARGET_URL=http://localhost:3000 npx artillery run performance/load-test.yml
```

### Staging Environment
```bash
TARGET_URL=https://staging.prisma.ikanisa.com npx artillery run performance/load-test.yml
```

### Production (Read-Only Tests)
```bash
# Only run non-destructive tests in production
TARGET_URL=https://prisma.ikanisa.com npx artillery run performance/load-test.yml
```

## Interpreting Results

### Good Results
```
Summary report @ 10:00:00
  Scenarios launched:  3000
  Scenarios completed: 3000
  Requests completed:  6000
  Mean response/sec:   50
  Response time (msec):
    p50: 45
    p95: 250
    p99: 450
```

### Concerning Results
- p95 > 500ms: Investigate slow endpoints
- Error rate > 1%: Check for failures
- Request completions < 95%: Network or capacity issues

## CI/CD Integration

Add to GitHub Actions workflow:
```yaml
- name: Load Test
  run: |
    npm install -g artillery
    TARGET_URL=${{ secrets.STAGING_URL }} npx artillery run performance/load-test.yml --output report.json
    
- name: Upload Report
  uses: actions/upload-artifact@v3
  with:
    name: artillery-report
    path: report.json
```

---

## Production-Scale Testing

For full production-scale validation (100 concurrent users):

```bash
# Run production load test
TARGET_URL=https://prisma.ikanisa.com npx artillery run performance/production-load-test.yml

# This test includes:
# - 100 concurrent users sustained
# - p50 < 100ms, p95 < 500ms, p99 < 1000ms thresholds
# - Full scenario coverage (dashboard, AI, settings)
# - 5+ minute sustained load phase
```

### Bottleneck Identification

After running load tests, analyze:
1. **Response time distribution** - Identify slow endpoints
2. **Error rates by endpoint** - Find failing routes
3. **Resource utilization** - Check CPU/memory in Cloudflare
4. **Database query times** - Monitor Supabase dashboard

### Optimization Checklist

- [ ] Enable edge caching for static assets
- [ ] Optimize database queries (add indexes)
- [ ] Implement response caching where appropriate
- [ ] Review rate limits for production scale
