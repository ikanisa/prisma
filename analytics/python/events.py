from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class AnalyticsContextModel(BaseModel):
    """Optional trace context bundled with analytics events."""

    request_id: Optional[str] = Field(default=None, alias="requestId")
    trace_id: Optional[str] = Field(default=None, alias="traceId")
    span_id: Optional[str] = Field(default=None, alias="spanId")

    model_config = ConfigDict(populate_by_name=True, alias_generator=None, extra="forbid")


class AnalyticsEventModel(BaseModel):
    """Structured analytics event conforming to the shared schema."""

    event: str = Field(..., min_length=1)
    service: Optional[str] = Field(default=None, min_length=1)
    source: str = Field(..., min_length=1)
    org_id: Optional[UUID] = Field(default=None, alias="orgId")
    actor_id: Optional[UUID] = Field(default=None, alias="actorId")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    tags: List[str] = Field(default_factory=list)
    properties: Dict[str, Any] = Field(default_factory=dict)
    context: AnalyticsContextModel = Field(default_factory=AnalyticsContextModel)
    metadata: Dict[str, Any] = Field(default_factory=dict)

    model_config = ConfigDict(populate_by_name=True, alias_generator=None, extra="forbid")


__all__ = ["AnalyticsEventModel", "AnalyticsContextModel"]
