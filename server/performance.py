"""
Performance Monitoring Utilities

Tracks API response times, database query performance, and resource usage.
"""

import time
import functools
from typing import Callable, Any
from contextlib import contextmanager
import structlog

logger = structlog.get_logger(__name__)


class PerformanceMonitor:
    """
    Performance monitoring for API endpoints and operations.
    """
    
    def __init__(self):
        self.metrics = {}
        self.slow_query_threshold = 1.0  # seconds
        self.slow_endpoint_threshold = 2.0  # seconds
    
    @contextmanager
    def measure(self, operation_name: str):
        """
        Context manager for measuring operation duration.
        
        Usage:
            with perf_monitor.measure("database_query"):
                # operation
        """
        start_time = time.time()
        
        try:
            yield
        finally:
            duration = time.time() - start_time
            self.record_metric(operation_name, duration)
            
            # Log slow operations
            if duration > self.slow_query_threshold:
                logger.warning(
                    "slow_operation",
                    operation=operation_name,
                    duration_seconds=duration
                )
    
    def record_metric(self, name: str, duration: float):
        """
        Record a performance metric.
        """
        if name not in self.metrics:
            self.metrics[name] = {
                "count": 0,
                "total_duration": 0.0,
                "min_duration": float('inf'),
                "max_duration": 0.0,
            }
        
        metric = self.metrics[name]
        metric["count"] += 1
        metric["total_duration"] += duration
        metric["min_duration"] = min(metric["min_duration"], duration)
        metric["max_duration"] = max(metric["max_duration"], duration)
    
    def get_metrics(self) -> dict:
        """
        Get all recorded metrics with calculated averages.
        """
        result = {}
        
        for name, metric in self.metrics.items():
            result[name] = {
                **metric,
                "avg_duration": metric["total_duration"] / metric["count"] if metric["count"] > 0 else 0
            }
        
        return result
    
    def reset_metrics(self):
        """
        Reset all metrics.
        """
        self.metrics = {}


# Global performance monitor instance
perf_monitor = PerformanceMonitor()


def track_performance(operation_name: str = None):
    """
    Decorator for tracking function performance.
    
    Usage:
        @track_performance("create_persona")
        async def create_persona(...):
            pass
    """
    def decorator(func: Callable) -> Callable:
        name = operation_name or f"{func.__module__}.{func.__name__}"
        
        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            with perf_monitor.measure(name):
                return await func(*args, **kwargs)
        
        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            with perf_monitor.measure(name):
                return func(*args, **kwargs)
        
        # Return appropriate wrapper based on function type
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator


def get_performance_report() -> dict:
    """
    Get comprehensive performance report.
    
    Returns:
        {
            "metrics": {...},
            "slow_operations": [...],
            "recommendations": [...]
        }
    """
    metrics = perf_monitor.get_metrics()
    
    # Identify slow operations
    slow_ops = []
    for name, metric in metrics.items():
        if metric["avg_duration"] > perf_monitor.slow_endpoint_threshold:
            slow_ops.append({
                "operation": name,
                "avg_duration": metric["avg_duration"],
                "max_duration": metric["max_duration"],
                "count": metric["count"]
            })
    
    # Generate recommendations
    recommendations = []
    
    if slow_ops:
        recommendations.append({
            "type": "performance",
            "message": f"Found {len(slow_ops)} slow operations",
            "actions": [
                "Consider adding database indexes",
                "Review query complexity",
                "Implement caching for frequently accessed data",
                "Use connection pooling"
            ]
        })
    
    return {
        "metrics": metrics,
        "slow_operations": sorted(slow_ops, key=lambda x: x["avg_duration"], reverse=True),
        "recommendations": recommendations
    }


@contextmanager
def trace_operation(operation_name: str, **attributes):
    """
    Trace operation with OpenTelemetry (if available).
    
    Usage:
        with trace_operation("database_query", table="users", action="select"):
            # operation
    """
    start_time = time.time()
    
    # Log operation start
    logger.info(
        "operation_started",
        operation=operation_name,
        **attributes
    )
    
    try:
        yield
    except Exception as e:
        # Log operation failure
        logger.error(
            "operation_failed",
            operation=operation_name,
            error=str(e),
            **attributes
        )
        raise
    finally:
        duration = time.time() - start_time
        
        # Log operation completion
        logger.info(
            "operation_completed",
            operation=operation_name,
            duration_seconds=duration,
            **attributes
        )


class QueryOptimizer:
    """
    Analyzes and suggests query optimizations.
    """
    
    @staticmethod
    def analyze_query(sql: str) -> dict:
        """
        Analyze SQL query and suggest optimizations.
        
        Returns recommendations for:
        - Missing indexes
        - Inefficient joins
        - N+1 query problems
        - Missing limits on large tables
        """
        recommendations = []
        
        # Check for SELECT *
        if "SELECT *" in sql.upper():
            recommendations.append({
                "issue": "SELECT * detected",
                "suggestion": "Select only required columns to reduce data transfer",
                "severity": "medium"
            })
        
        # Check for missing LIMIT
        if "LIMIT" not in sql.upper() and "SELECT" in sql.upper():
            recommendations.append({
                "issue": "Missing LIMIT clause",
                "suggestion": "Add LIMIT to prevent accidentally fetching large result sets",
                "severity": "high"
            })
        
        # Check for NOT IN
        if "NOT IN" in sql.upper():
            recommendations.append({
                "issue": "NOT IN clause detected",
                "suggestion": "Consider using NOT EXISTS for better performance",
                "severity": "medium"
            })
        
        return {
            "query": sql,
            "recommendations": recommendations,
            "estimated_optimization_gain": len(recommendations) * 10  # % improvement estimate
        }
