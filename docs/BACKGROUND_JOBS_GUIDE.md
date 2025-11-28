# Learning System Background Jobs - Setup Guide

## Overview

The learning system uses **RQ (Redis Queue)** for background job processing with the following periodic tasks:

1. **Prompt Optimization** - Weekly (Monday 2 AM)
2. **RAG Training** - Daily (3 AM)
3. **A/B Test Analysis** - Hourly
4. **Cleanup** - Weekly (Sunday 1 AM)
5. **Learning Report** - Weekly (Monday 9 AM)

## Prerequisites

- Redis server running
- Python dependencies installed: `rq`, `rq-scheduler`

```bash
pip install rq rq-scheduler
```

## Quick Start

### 1. Start Redis (if not already running)

```bash
# Using Docker
docker run -d -p 6379:6379 redis:7-alpine

# Or if you have Redis installed locally
redis-server
```

### 2. Start the RQ Worker

```bash
# In one terminal
python -m server.worker

# The worker will process jobs from: reembed, learning, optimization queues
```

### 3. Start the Scheduler

```bash
# In another terminal
python -m server.learning_scheduler setup

# This will configure all periodic jobs
# Keep this process running
```

## Manual Job Execution

You can trigger jobs manually for testing:

```bash
# Run prompt optimization now
python -m server.learning_jobs optimize_prompts

# Run RAG training
python -m server.learning_jobs train_rag

# Run A/B test analysis
python -m server.learning_jobs analyze_tests

# Run cleanup
python -m server.learning_jobs cleanup

# Generate learning report
python -m server.learning_jobs report
```

## Scheduler Commands

```bash
# Setup all scheduled jobs
python -m server.learning_scheduler setup

# Check job status
python -m server.learning_scheduler status

# Trigger specific job immediately
python -m server.learning_scheduler run prompt_optimization
python -m server.learning_scheduler run rag_training
python -m server.learning_scheduler run ab_test_analysis
```

## Job Schedules

| Job | Schedule | Queue | Timeout |
|-----|----------|-------|---------|
| Prompt Optimization | Monday 2 AM | optimization | 1 hour |
| RAG Training | Daily 3 AM | learning | 2 hours |
| A/B Test Analysis | Every hour | learning | 30 min |
| Cleanup | Sunday 1 AM | learning | 30 min |
| Learning Report | Monday 9 AM | learning | 10 min |

## Docker Compose Setup

Add to your `docker-compose.yml`:

```yaml
services:
  # ... existing services ...

  learning-worker:
    build: .
    command: python -m server.worker
    environment:
      - REDIS_URL=redis://redis:6379/0
      - DATABASE_URL=${DATABASE_URL}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on:
      - redis
      - db
    restart: unless-stopped

  learning-scheduler:
    build: .
    command: python -m server.learning_scheduler setup
    environment:
      - REDIS_URL=redis://redis:6379/0
      - DATABASE_URL=${DATABASE_URL}
    depends_on:
      - redis
      - db
      - learning-worker
    restart: unless-stopped
```

## Environment Variables

```bash
# Redis
REDIS_URL=redis://localhost:6379/0

# Learning System
RAG_TRAINING_MIN_SAMPLES=1000          # Minimum samples before RAG training
FEEDBACK_RETENTION_DAYS=180            # Feedback retention period
AB_TEST_MIN_SAMPLE_SIZE=1000           # Minimum A/B test samples
AB_TEST_SIGNIFICANCE_LEVEL=0.95        # Statistical significance threshold

# Database
DATABASE_URL=postgresql://...

# OpenAI (for prompt optimization)
OPENAI_API_KEY=sk-...
```

## Monitoring Jobs

### View Job Queue

```python
from rq import Queue
import redis

conn = redis.from_url('redis://localhost:6379/0')
queue = Queue('learning', connection=conn)

print(f"Jobs in queue: {len(queue)}")
for job in queue.jobs:
    print(f"  - {job.func_name}: {job.get_status()}")
```

### View Failed Jobs

```python
from rq import Queue
from rq.job import Job
import redis

conn = redis.from_url('redis://localhost:6379/0')
queue = Queue('learning', connection=conn)

failed = queue.failed_job_registry
print(f"Failed jobs: {len(failed)}")
for job_id in failed.get_job_ids():
    job = Job.fetch(job_id, connection=conn)
    print(f"  - {job.func_name}: {job.exc_info}")
```

## Job Details

### 1. Prompt Optimization

**What it does:**
- Finds agents with 50+ executions in last 30 days
- Collects approved learning examples (max 100)
- Generates prompt variants (clarified, few-shot, restructured, combined)
- Evaluates variants against test examples
- Creates training run record for review

**Requirements:**
- At least 10 approved learning examples
- Agent must have system_prompt in config
- OpenAI API key configured

### 2. RAG Training

**What it does:**
- Checks for new embedding training pairs
- If >= min_samples (default 1000), prepares training
- Groups pairs into positive/negative examples
- Creates training run record
- *Note: Actual fine-tuning implementation pending*

**Requirements:**
- Minimum training pairs collected
- Training pairs from last 7 days

### 3. A/B Test Analysis

**What it does:**
- Finds experiments with enough samples and duration
- Calculates metrics for control and treatment
- Computes statistical significance
- Updates experiment status if significant

**Requirements:**
- Experiment in 'running' status
- Both variants have >= min_sample_size
- Minimum duration elapsed

### 4. Cleanup

**What it does:**
- Archives old feedback (default: older than 180 days)
- Keeps database size manageable
- Preserves data integrity

### 5. Learning Report

**What it does:**
- Generates weekly summary statistics
- Feedback collection metrics
- Learning example quality scores
- Approval/pending counts
- *Can be extended to send email reports*

## Troubleshooting

### Jobs not running

**Check Redis connection:**
```bash
redis-cli ping
# Should return: PONG
```

**Check worker is running:**
```bash
ps aux | grep "server.worker"
```

**Check scheduler is running:**
```bash
ps aux | grep "learning_scheduler"
```

### Jobs failing

**Check logs:**
```bash
# Worker logs
tail -f /var/log/rq-worker.log

# Check Redis queue
redis-cli LLEN rq:queue:learning
```

**Retry failed job:**
```python
from rq import Queue
from rq.job import Job
import redis

conn = redis.from_url('redis://localhost:6379/0')
job = Job.fetch('job-id', connection=conn)
job.retry()
```

### Database connection issues

Ensure `DATABASE_URL` is set correctly and database is accessible from worker.

### OpenAI API errors

Check that `OPENAI_API_KEY` is valid and has sufficient credits.

## Production Deployment

### Systemd Service (Linux)

Create `/etc/systemd/system/learning-worker.service`:

```ini
[Unit]
Description=Learning System Worker
After=network.target redis.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/app
Environment="REDIS_URL=redis://localhost:6379/0"
Environment="DATABASE_URL=postgresql://..."
ExecStart=/usr/bin/python3 -m server.worker
Restart=always

[Install]
WantedBy=multi-user.target
```

Create `/etc/systemd/system/learning-scheduler.service`:

```ini
[Unit]
Description=Learning System Scheduler
After=network.target redis.service learning-worker.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/app
Environment="REDIS_URL=redis://localhost:6379/0"
Environment="DATABASE_URL=postgresql://..."
ExecStart=/usr/bin/python3 -m server.learning_scheduler setup
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable learning-worker learning-scheduler
sudo systemctl start learning-worker learning-scheduler

# Check status
sudo systemctl status learning-worker
sudo systemctl status learning-scheduler
```

## Monitoring & Alerts

### Prometheus Metrics

Add RQ exporter to expose metrics:

```bash
pip install rq-exporter
rq-exporter --host 0.0.0.0 --port 9726
```

### Grafana Dashboard

Import RQ dashboard or create custom dashboard tracking:
- Queue length
- Job success/failure rate
- Job execution time
- Worker count

### Alerts

Set up alerts for:
- Queue length > 100 (backlog building)
- Failed job rate > 5%
- No jobs completed in last hour
- Worker down

## Performance Tuning

### Multiple Workers

Run multiple workers for better throughput:

```bash
# Start 3 workers
python -m server.worker &
python -m server.worker &
python -m server.worker &
```

### Queue Priorities

High priority jobs go to `optimization` queue, regular jobs to `learning` queue.

### Job Timeout

Adjust timeouts based on job complexity:

```python
queue.enqueue(optimize_agent_prompts, job_timeout='2h')  # Increase if needed
```

## Next Steps

1. ✅ Setup Redis and workers
2. ✅ Configure scheduler
3. ⚠️ Test each job manually
4. ⚠️ Deploy to staging
5. ⚠️ Monitor for 1 week
6. ⚠️ Deploy to production
7. ⚠️ Setup monitoring/alerts

---

**Status**: ✅ Background jobs system ready
**Documentation**: Complete
**Testing**: Manual testing available
**Production**: Ready for deployment with monitoring
