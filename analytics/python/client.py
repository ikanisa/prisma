from __future__ import annotations

import json
import os
from typing import Any, Mapping, Optional

import asyncpg
import httpx
from pydantic import ValidationError

from .events import AnalyticsEventModel


class AnalyticsIngestor:
    """Persist analytics events directly into Postgres."""

    def __init__(self, dsn: Optional[str] = None) -> None:
        self._dsn = dsn or os.getenv("ANALYTICS_DATABASE_URL") or os.getenv("DATABASE_URL")
        self._pool: Optional[asyncpg.Pool] = None

    async def start(self) -> None:
        if self._pool or not self._dsn:
            if not self._dsn:
                raise RuntimeError("DATABASE_URL or ANALYTICS_DATABASE_URL must be configured for ingestion")
            return
        self._pool = await asyncpg.create_pool(self._dsn, min_size=1, max_size=4)

    async def stop(self) -> None:
        if self._pool:
            await self._pool.close()
            self._pool = None

    async def insert(self, event: AnalyticsEventModel) -> None:
        if not self._pool:
            await self.start()
        assert self._pool is not None
        payload = event.model_dump(by_alias=True)
        properties = json.dumps(payload.get("properties") or {})
        context = json.dumps(payload.get("context") or {})
        metadata = json.dumps(payload.get("metadata") or {})
        tags = payload.get("tags") or []
        async with self._pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO analytics_events (
                    event, service, source, org_id, actor_id, properties, tags, context, metadata, occurred_at, ingested_at
                ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::text[], $8::jsonb, $9::jsonb, $10::timestamptz, now())
                """,
                payload["event"],
                payload.get("service"),
                payload["source"],
                payload.get("orgId"),
                payload.get("actorId"),
                properties,
                tags,
                context,
                metadata,
                payload.get("timestamp"),
            )


class AnalyticsHttpClient:
    """Send analytics events to the ingestion service via HTTP."""

    def __init__(
        self,
        base_url: Optional[str] = None,
        api_key: Optional[str] = None,
        timeout: float = 5.0,
    ) -> None:
        configured = base_url or os.getenv("ANALYTICS_SERVICE_URL") or ""
        self._base_url = configured.rstrip("/")
        self._api_key = api_key or os.getenv("ANALYTICS_SERVICE_TOKEN") or None
        self._timeout = timeout

    async def record_event(self, event: AnalyticsEventModel | Mapping[str, Any]) -> None:
        if not self._base_url:
            return

        try:
            model = event if isinstance(event, AnalyticsEventModel) else AnalyticsEventModel.model_validate(event)
        except ValidationError:
            raise

        payload = model.model_dump(by_alias=True)
        if "timestamp" not in payload:
            payload["timestamp"] = model.timestamp.isoformat()

        headers = {"content-type": "application/json"}
        if self._api_key:
            headers["authorization"] = f"Bearer {self._api_key}"

        url = f"{self._base_url}/v1/analytics/events"
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()


__all__ = ["AnalyticsIngestor", "AnalyticsHttpClient"]
