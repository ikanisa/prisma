"""
Health Check API Router
Handles health, readiness, and liveness endpoints

Migrated from server/main.py lines 7696-7710
"""
from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from typing import Dict, Any
import redis

from ..health import build_readiness_report
from ..db import AsyncSessionLocal

router = APIRouter(tags=["observability"])


@router.get("/health")
async def health() -> Dict[str, str]:
    """
    Basic health check endpoint
    Returns 200 if service is running
    
    Migrated from main.py line 7696
    """
    return {"status": "ok"}


@router.get("/healthz")
async def healthz() -> Dict[str, str]:
    """
    Kubernetes health check endpoint
    Returns 200 if service is running
    
    Migrated from main.py line 7701
    """
    return {"status": "ok"}


@router.get("/readiness")
async def readiness_probe():
    """
    Readiness check endpoint
    Returns 200 if service is ready to handle requests
    Checks database, cache, and external dependencies
    
    Migrated from main.py line 7706
    """
    # Get redis connection from main app context
    # TODO: Inject redis_conn as dependency instead of importing
    from ..main import redis_conn
    
    report = await build_readiness_report(AsyncSessionLocal, redis_conn)
    status_code = status.HTTP_200_OK if report["status"] == "ok" else status.HTTP_503_SERVICE_UNAVAILABLE
    return JSONResponse(report, status_code=status_code)
