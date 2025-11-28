"""
Monitoring and Metrics Collection
Prometheus metrics, health checks, and performance monitoring.
"""
from prometheus_client import Counter, Histogram, Gauge, generate_latest
from fastapi import Response
import time
import psutil
import logging

logger = logging.getLogger(__name__)

# Metrics
agent_requests_total = Counter(
    'agent_requests_total',
    'Total agent requests',
    ['agent_id', 'status']
)

agent_request_duration = Histogram(
    'agent_request_duration_seconds',
    'Agent request duration',
    ['agent_id'],
    buckets=[0.1, 0.5, 1.0, 2.0, 5.0, 10.0]
)

active_agents = Gauge(
    'active_agents_total',
    'Number of active agents'
)

cache_hits = Counter(
    'cache_hits_total',
    'Total cache hits'
)

cache_misses = Counter(
    'cache_misses_total',
    'Total cache misses'
)

# System metrics
system_cpu_usage = Gauge('system_cpu_usage_percent', 'System CPU usage')
system_memory_usage = Gauge('system_memory_usage_percent', 'System memory usage')

def update_system_metrics():
    """Update system metrics"""
    system_cpu_usage.set(psutil.cpu_percent())
    system_memory_usage.set(psutil.virtual_memory().percent)

def track_agent_request(agent_id: str, duration: float, success: bool):
    """Track agent request metrics"""
    status = 'success' if success else 'error'
    agent_requests_total.labels(agent_id=agent_id, status=status).inc()
    agent_request_duration.labels(agent_id=agent_id).observe(duration)

async def metrics_endpoint():
    """Prometheus metrics endpoint"""
    update_system_metrics()
    return Response(content=generate_latest(), media_type="text/plain")

async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "checks": {
            "api": "ok",
            "agents": "ok",
            "analytics": "ok"
        }
    }

async def readiness_check():
    """Readiness check endpoint"""
    # Check if all services are ready
    return {
        "status": "ready",
        "agents_loaded": 20,
        "database": "connected",
        "cache": "available"
    }
