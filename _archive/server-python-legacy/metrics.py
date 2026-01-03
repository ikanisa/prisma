"""
Prometheus Metrics for Learning System
Exposes metrics for monitoring and alerting
"""

from prometheus_client import Counter, Histogram, Gauge, Info, generate_latest, REGISTRY
from fastapi import APIRouter
from fastapi.responses import Response

# Create metrics router
metrics_router = APIRouter()

# Feedback metrics
feedback_submissions = Counter(
    'agent_feedback_total',
    'Total number of feedback submissions',
    ['feedback_type', 'agent_id', 'organization_id']
)

feedback_rating = Gauge(
    'agent_feedback_rating',
    'Current average feedback rating',
    ['agent_id']
)

feedback_collection_rate = Gauge(
    'agent_feedback_collection_rate',
    'Percentage of executions with feedback',
    ['agent_id']
)

# Learning examples metrics
learning_examples_pending = Gauge(
    'learning_examples_pending',
    'Number of learning examples pending review',
    ['agent_id']
)

learning_examples_approved = Gauge(
    'learning_examples_approved',
    'Number of approved learning examples',
    ['agent_id']
)

learning_examples_rejected = Gauge(
    'learning_examples_rejected',
    'Number of rejected learning examples',
    ['agent_id']
)

learning_examples_quality = Histogram(
    'learning_examples_quality_score',
    'Quality scores of learning examples',
    ['agent_id'],
    buckets=[0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
)

# Annotation metrics
annotations_completed = Counter(
    'expert_annotations_total',
    'Total number of expert annotations completed',
    ['expert_id', 'annotation_type']
)

annotations_duration = Histogram(
    'expert_annotations_duration_seconds',
    'Time taken to complete annotations',
    ['annotation_type'],
    buckets=[10, 30, 60, 120, 300, 600, 1800]  # 10s to 30min
)

# Training run metrics
training_runs_total = Counter(
    'training_runs_total',
    'Total number of training runs',
    ['training_type', 'status']
)

training_run_duration = Histogram(
    'training_run_duration_seconds',
    'Duration of training runs',
    ['training_type'],
    buckets=[60, 300, 600, 1800, 3600, 7200]  # 1min to 2hours
)

training_run_improvement = Histogram(
    'training_run_improvement_percentage',
    'Improvement percentage from training runs',
    ['training_type'],
    buckets=[0, 5, 10, 15, 20, 25, 30, 40, 50]
)

# A/B test metrics
ab_tests_active = Gauge(
    'ab_tests_active',
    'Number of active A/B tests'
)

ab_test_samples = Gauge(
    'ab_test_samples_total',
    'Total samples collected for A/B test',
    ['experiment_id', 'variant']
)

ab_test_significance = Gauge(
    'ab_test_statistical_significance',
    'Statistical significance of A/B test',
    ['experiment_id']
)

# API performance metrics
api_requests_total = Counter(
    'learning_api_requests_total',
    'Total API requests',
    ['method', 'endpoint', 'status']
)

api_request_duration = Histogram(
    'learning_api_request_duration_seconds',
    'API request duration',
    ['method', 'endpoint'],
    buckets=[0.01, 0.05, 0.1, 0.5, 1.0, 2.0, 5.0, 10.0]
)

api_request_size = Histogram(
    'learning_api_request_size_bytes',
    'API request payload size',
    ['endpoint'],
    buckets=[100, 1000, 10000, 100000, 1000000]
)

api_response_size = Histogram(
    'learning_api_response_size_bytes',
    'API response payload size',
    ['endpoint'],
    buckets=[100, 1000, 10000, 100000, 1000000]
)

# Database metrics
db_query_duration = Histogram(
    'learning_db_query_duration_seconds',
    'Database query duration',
    ['operation', 'table'],
    buckets=[0.001, 0.01, 0.05, 0.1, 0.5, 1.0, 2.0, 5.0]
)

db_connections = Gauge(
    'learning_db_connections',
    'Number of active database connections'
)

# System info
system_info = Info(
    'learning_system',
    'Learning system information'
)

# Initialize system info
system_info.info({
    'version': '2.0.0',
    'component': 'learning-system',
    'python_version': '3.11'
})


@metrics_router.get("/metrics")
async def get_metrics():
    """
    Prometheus metrics endpoint
    """
    return Response(
        content=generate_latest(REGISTRY),
        media_type="text/plain; version=0.0.4; charset=utf-8"
    )


# Helper functions for updating metrics
async def update_feedback_metrics(db_session):
    """Update feedback-related metrics from database"""
    from server.db import AsyncSessionLocal
    
    # Update pending annotations count
    result = await db_session.execute("""
        SELECT agent_id, COUNT(*) as count
        FROM learning_examples
        WHERE review_status = 'pending'
        GROUP BY agent_id
    """)
    
    for row in result.fetchall():
        learning_examples_pending.labels(agent_id=str(row['agent_id'])).set(row['count'])
    
    # Update approved count
    result = await db_session.execute("""
        SELECT agent_id, COUNT(*) as count
        FROM learning_examples
        WHERE review_status = 'approved'
        GROUP BY agent_id
    """)
    
    for row in result.fetchall():
        learning_examples_approved.labels(agent_id=str(row['agent_id'])).set(row['count'])
    
    # Update average rating
    result = await db_session.execute("""
        SELECT agent_id, AVG(rating) as avg_rating
        FROM agent_feedback
        WHERE rating IS NOT NULL
          AND created_at > NOW() - INTERVAL '24 hours'
        GROUP BY agent_id
    """)
    
    for row in result.fetchall():
        if row['avg_rating']:
            feedback_rating.labels(agent_id=str(row['agent_id'])).set(float(row['avg_rating']))
    
    # Update collection rate
    result = await db_session.execute("""
        SELECT 
            e.agent_id,
            COUNT(DISTINCT f.execution_id)::float / NULLIF(COUNT(DISTINCT e.id), 0) as rate
        FROM agent_executions e
        LEFT JOIN agent_feedback f ON f.execution_id = e.id
        WHERE e.created_at > NOW() - INTERVAL '24 hours'
        GROUP BY e.agent_id
    """)
    
    for row in result.fetchall():
        if row['rate']:
            feedback_collection_rate.labels(agent_id=str(row['agent_id'])).set(float(row['rate']))


async def update_ab_test_metrics(db_session):
    """Update A/B test metrics from database"""
    # Count active tests
    result = await db_session.execute("""
        SELECT COUNT(*) as count
        FROM learning_experiments
        WHERE status = 'running'
    """)
    
    count = result.fetchone()['count']
    ab_tests_active.set(count)
    
    # Update sample counts
    result = await db_session.execute("""
        SELECT 
            id,
            current_control_samples,
            current_treatment_samples,
            statistical_significance
        FROM learning_experiments
        WHERE status = 'running'
    """)
    
    for row in result.fetchall():
        exp_id = str(row['id'])
        ab_test_samples.labels(experiment_id=exp_id, variant='control').set(row['current_control_samples'])
        ab_test_samples.labels(experiment_id=exp_id, variant='treatment').set(row['current_treatment_samples'])
        
        if row['statistical_significance']:
            ab_test_significance.labels(experiment_id=exp_id).set(float(row['statistical_significance']))


# Middleware for automatic metric collection
class MetricsMiddleware:
    """Middleware to automatically collect API metrics"""
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        import time
        from starlette.datastructures import Headers
        
        start_time = time.time()
        
        # Get request info
        method = scope["method"]
        path = scope["path"]
        
        # Measure request size
        headers = Headers(scope=scope)
        content_length = int(headers.get("content-length", 0))
        if content_length > 0:
            api_request_size.labels(endpoint=path).observe(content_length)
        
        # Track the response
        response_body = []
        
        async def send_wrapper(message):
            if message["type"] == "http.response.body":
                response_body.append(message.get("body", b""))
            await send(message)
        
        try:
            await self.app(scope, receive, send_wrapper)
            status = "success"
        except Exception:
            status = "error"
            raise
        finally:
            # Record metrics
            duration = time.time() - start_time
            
            # Only track learning API endpoints
            if path.startswith("/api/learning"):
                api_requests_total.labels(method=method, endpoint=path, status=status).inc()
                api_request_duration.labels(method=method, endpoint=path).observe(duration)
                
                # Track response size
                if response_body:
                    response_size = sum(len(b) for b in response_body)
                    api_response_size.labels(endpoint=path).observe(response_size)
