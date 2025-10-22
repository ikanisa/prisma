"""Pydantic models for release control endpoints."""
from __future__ import annotations

from typing import Any, Dict, Optional

from pydantic import AliasChoices, BaseModel, ConfigDict, Field


class ReleaseControlCheckRequest(BaseModel):
    """Request payload for /api/release-controls/check."""

    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    org_slug: str = Field(validation_alias=AliasChoices("orgSlug", "org_slug"))
    engagement_id: Optional[str] = Field(
        default=None, validation_alias=AliasChoices("engagementId", "engagement_id")
    )
    triggered_by: Optional[str] = Field(
        default=None, validation_alias=AliasChoices("triggeredBy", "triggered_by")
    )

    def normalized_org_slug(self) -> str:
        return self.org_slug.strip()

    def normalized_engagement_id(self) -> Optional[str]:
        if not self.engagement_id:
            return None
        candidate = self.engagement_id.strip()
        return candidate or None


class ReleaseControlCheckResponse(BaseModel):
    """Response payload for /api/release-controls/check."""

    requirements: Dict[str, Any]
    status: Dict[str, Any]
    environment: Dict[str, Any]
    generatedAt: str
