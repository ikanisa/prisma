"""
Health Check API Router
Handles health, readiness, and liveness endpoints
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Dict, Any
import asyncio

router = APIRouter(tags=["health"])


class HealthResponse(BaseModel):
    """Health check response model"""
    status: str
    version: str
    timestamp: str
    checks: Dict[str, Any]


@router.get("/health")
async def health_check() -> Dict[str, str]:
    """
    Basic health check endpoint
    Returns 200 if service is running
    """
    return {
        "status": "healthy",
        "service": "prisma-glow-api"
    }


@router.get("/readiness")
async def readiness_check() -> HealthResponse:
    """
    Readiness check endpoint
    Returns 200 if service is ready to handle requests
    Checks database, cache, and external dependencies
    """
    # TODO: Import actual health check from server.health
    # from server.health import build_readiness_report
    
    # Placeholder response
    from datetime import datetime, timezone
    
    checks = {
        "database": "healthy",
        "cache": "healthy",
        "external_apis": "healthy"
    }
    
    return HealthResponse(
        status="ready",
        version="1.0.0",
        timestamp=datetime.now(timezone.utc).isoformat(),
        checks=checks
    )


@router.get("/live")
async def liveness_check() -> Dict[str, str]:
    """
    Liveness check endpoint
    Returns 200 if service is alive (for Kubernetes liveness probes)
    """
    return {
        "status": "alive"
    }
