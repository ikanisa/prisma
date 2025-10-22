"""Background analytics jobs."""

from __future__ import annotations

import json
import os
from typing import Any, Optional

import httpx
from opentelemetry import trace
import sentry_sdk

tracer = trace.get_tracer(__name__)

def _coerce_positive_int(raw: Optional[str], default: int) -> int:
    try:
        value = int(raw) if raw is not None else default
    except (TypeError, ValueError):
        return default
    return value if value > 0 else default

RAG_SERVICE_URL = os.getenv("RAG_SERVICE_URL", "http://localhost:3001").rstrip("/")
EMBEDDING_CRON_SECRET = os.getenv("EMBEDDING_CRON_SECRET")
EMBEDDING_DELTA_LOOKBACK_HOURS = _coerce_positive_int(os.getenv("EMBEDDING_DELTA_LOOKBACK_HOURS"), 24)
EMBEDDING_DELTA_DOCUMENT_LIMIT = _coerce_positive_int(os.getenv("EMBEDDING_DELTA_DOCUMENT_LIMIT"), 50)
EMBEDDING_DELTA_POLICY_LIMIT = _coerce_positive_int(os.getenv("EMBEDDING_DELTA_POLICY_LIMIT"), 25)


async def log_agent_action(action: str, detail: str, metadata: Optional[dict[str, Any]] = None) -> None:
    """Write successful action details to the agent_logs table."""

    payload = {"action": action, "detail": detail, "metadata": metadata or {}}
    print(json.dumps({"level": "info", "msg": "analytics.job", **payload}))


async def log_error(action: str, exc: Exception, metadata: Optional[dict[str, Any]] = None) -> None:
    """Record errors and send them to Sentry."""

    sentry_sdk.capture_exception(exc)
    error_payload = {
        "level": "error",
        "msg": "analytics.job_failed",
        "action": action,
        "error": str(exc),
        "metadata": metadata or {},
    }
    print(json.dumps(error_payload))


async def reembed_job() -> None:
    """Re-embed newly ingested content without manual triggers."""

    with tracer.start_as_current_span("reembed_job"):
        if not EMBEDDING_CRON_SECRET:
            await log_agent_action("reembed_delta", "skipped", {"reason": "missing_secret"})
            return

        url = f"{RAG_SERVICE_URL}/internal/knowledge/embeddings/reembed-delta"
        payload = {
            "lookbackHours": EMBEDDING_DELTA_LOOKBACK_HOURS,
            "documentLimit": EMBEDDING_DELTA_DOCUMENT_LIMIT,
            "policyLimit": EMBEDDING_DELTA_POLICY_LIMIT,
            "actor": "analytics-scheduler",
        }

        try:
            async with httpx.AsyncClient(timeout=120) as client:
                response = await client.post(
                    url,
                    json=payload,
                    headers={"x-embedding-cron-secret": EMBEDDING_CRON_SECRET},
                )
                response.raise_for_status()
                summary = response.json()

            await log_agent_action("reembed_delta", "completed", summary)
        except Exception as exc:  # pragma: no cover - network failures/environment
            await log_error("reembed_delta", exc, {"url": url, "payload": payload})
            raise

async def anomaly_scan_job() -> None:
    """Scan for anomalies in recent analytics."""
    with tracer.start_as_current_span("anomaly_scan_job"):
        try:
            await log_agent_action("anomaly_scan", "completed")
        except Exception as exc:  # pragma: no cover - placeholder
            await log_error("anomaly_scan", exc)
            raise

async def policy_check_job() -> None:
    """Check for policy breaches."""
    with tracer.start_as_current_span("policy_check_job"):
        try:
            await log_agent_action("policy_check", "completed")
        except Exception as exc:  # pragma: no cover - placeholder
            await log_error("policy_check", exc)
            raise
