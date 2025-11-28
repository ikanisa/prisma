from __future__ import annotations

import json
import os
from typing import Any, Dict, Optional

import httpx
import structlog
from sqlalchemy import text

from .db import AsyncSessionLocal

logger = structlog.get_logger(__name__)

OPENAI_DEBUG_LOGGING = (os.getenv("OPENAI_DEBUG_LOGGING", "false").lower() == "true")
OPENAI_DEBUG_FETCH_DETAILS = (os.getenv("OPENAI_DEBUG_FETCH_DETAILS", "false").lower() == "true")


async def _fetch_debug_details(response_id: str) -> Optional[Dict[str, Any]]:
    if not OPENAI_DEBUG_FETCH_DETAILS:
        return None
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        logger.warning("openai.debug_fetch.skipped", reason="missing_api_key")
        return None
    base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com")
    if base_url.endswith("/v1"):
        base_url = base_url[:-3]
    url = f"{base_url}/v1/requests/{response_id}/debug"
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            res = await client.get(url, headers={"Authorization": f"Bearer {api_key}"})
        if res.status_code >= 400:
            logger.warning(
                "openai.debug_fetch.failed",
                status_code=res.status_code,
                response_text=res.text,
            )
            return None
        return res.json()
    except Exception as exc:  # pragma: no cover - network failure path
        logger.exception("openai.debug_fetch.exception", exc_info=exc)
        return None


async def log_openai_debug_event(
    *,
    endpoint: str,
    response: Dict[str, Any],
    request_payload: Optional[Dict[str, Any]] = None,
    metadata: Optional[Dict[str, Any]] = None,
    org_id: Optional[str] = None,
) -> None:
    if not OPENAI_DEBUG_LOGGING:
        return
    response_id = response.get("id")
    if not response_id:
        return

    debug_details = await _fetch_debug_details(response_id)
    payload = {
        "request_id": response_id,
        "model": response.get("model"),
        "endpoint": endpoint,
        "status_code": (debug_details or {}).get("response", {}).get("status_code"),
        "org_id": org_id,
        "metadata": {
            "usage": response.get("usage"),
            "request": request_payload,
            "extras": metadata,
        },
        "debug": debug_details,
    }

    async with AsyncSessionLocal() as session:
        try:
            await session.execute(
                text(
                    """
                    INSERT INTO openai_debug_events
                      (request_id, model, endpoint, status_code, org_id, metadata, debug)
                    VALUES
                      (:request_id, :model, :endpoint, :status_code, :org_id, :metadata::jsonb, :debug::jsonb)
                    ON CONFLICT (request_id) DO UPDATE SET
                      model = EXCLUDED.model,
                      endpoint = EXCLUDED.endpoint,
                      status_code = EXCLUDED.status_code,
                      org_id = EXCLUDED.org_id,
                      metadata = EXCLUDED.metadata,
                      debug = EXCLUDED.debug
                    """
                ),
                {
                    "request_id": payload["request_id"],
                    "model": payload["model"],
                    "endpoint": payload["endpoint"],
                    "status_code": payload["status_code"],
                    "org_id": payload["org_id"],
                    "metadata": json.dumps(payload["metadata"]),
                    "debug": json.dumps(payload["debug"]) if payload["debug"] is not None else json.dumps(None),
                },
            )
            await session.commit()
        except Exception as exc:
            await session.rollback()
            logger.exception("openai.debug_event.persist_failed", exc_info=exc, request_id=response_id)
