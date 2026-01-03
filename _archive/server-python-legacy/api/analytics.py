"""
Analytics API Endpoints
FastAPI routes for agent analytics.
"""
from fastapi import APIRouter, Query
from typing import Optional
from datetime import datetime
from server.analytics.agent_analytics import get_analytics

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/dashboard")
async def get_dashboard():
    """Get comprehensive analytics dashboard data"""
    analytics = get_analytics()
    return analytics.get_dashboard_data()


@router.get("/usage")
async def get_usage_stats(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None)
):
    """Get usage statistics for a time period"""
    analytics = get_analytics()
    
    start = datetime.fromisoformat(start_date) if start_date else None
    end = datetime.fromisoformat(end_date) if end_date else None
    
    return analytics.get_usage_stats(start, end)


@router.get("/performance/{agent_id}")
async def get_agent_performance(agent_id: str):
    """Get performance metrics for a specific agent"""
    analytics = get_analytics()
    return analytics.get_performance_metrics(agent_id)


@router.get("/performance")
async def get_all_performance():
    """Get performance metrics for all agents"""
    analytics = get_analytics()
    return analytics.get_performance_metrics()


@router.get("/popular-queries")
async def get_popular_queries(limit: int = Query(10, ge=1, le=100)):
    """Get most popular queries"""
    analytics = get_analytics()
    return analytics.get_popular_queries(limit)


@router.get("/comparison")
async def get_agent_comparison():
    """Compare all agents by performance and usage"""
    analytics = get_analytics()
    return analytics.get_agent_comparison()
