"""Lightweight FastAPI app exposing health/readiness endpoints for CI smoke.

This avoids importing the full server.main module (which has heavier
dependencies and optional integrations), but uses the same readiness
checks so we still validate DB/Redis connectivity.
"""
from __future__ import annotations

import os
from fastapi import FastAPI, status
from fastapi.responses import JSONResponse
import redis

from .db import AsyncSessionLocal
from .health import build_readiness_report


app = FastAPI()


@app.get("/health", tags=["observability"])
async def health():
    return {"status": "ok"}


@app.get("/readiness", tags=["observability"])
async def readiness_probe():
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    try:
        redis_conn = redis.from_url(redis_url)
    except Exception:  # pragma: no cover - defensive fallback
        redis_conn = None
    report = await build_readiness_report(AsyncSessionLocal, redis_conn)
    status_code = status.HTTP_200_OK if report["status"] == "ok" else status.HTTP_503_SERVICE_UNAVAILABLE
    return JSONResponse(report, status_code=status_code)

