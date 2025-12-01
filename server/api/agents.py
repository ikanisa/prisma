"""Agent Management API Endpoints backed by Supabase."""

from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field
import structlog

from server.repositories.agent_repository import get_agent_repository

router = APIRouter(prefix="/api/v1/agents", tags=["agents"])
logger = structlog.get_logger(__name__)
agent_repo = get_agent_repository()


class AgentBase(BaseModel):
    slug: str = Field(..., description="Unique identifier (e.g. tax-corp-eu-022)")
    name: str = Field(..., description="Display name")
    description: Optional[str] = Field(None, description="Agent description")
    category: Optional[str] = Field(None, description="Business domain")
    type: str = Field(..., description="Agent classification")
    status: str = Field("draft", description="Lifecycle status")
    is_public: bool = Field(False, description="Whether agent is visible to all org members")
    avatar_url: Optional[str] = Field(None, description="Avatar URL for dashboards")


class AgentCreate(AgentBase):
    organization_id: UUID = Field(..., description="Owning organization ID")
    version: str = Field("1.0.0", description="Semantic version string")
    created_by: Optional[UUID] = Field(None, description="User who created the agent")
    parent_version_id: Optional[UUID] = Field(
        None, description="Parent agent version for rollups"
    )


class AgentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    type: Optional[str] = None
    status: Optional[str] = None
    is_public: Optional[bool] = None
    avatar_url: Optional[str] = None
    version: Optional[str] = None
    parent_version_id: Optional[UUID] = None


class AgentResponse(AgentBase):
    id: UUID
    organization_id: UUID
    version: str
    parent_version_id: Optional[UUID] = None
    created_by: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime
    published_at: Optional[datetime] = None
    is_active: bool = Field(True, description="Derived flag from status")


class AgentListResponse(BaseModel):
    agents: List[AgentResponse]
    total: int
    page: int
    page_size: int


def _status_is_active(status: Optional[str]) -> bool:
    return (status or "").lower() in {"active", "testing"}


def _map_agent(record: Dict[str, Any]) -> AgentResponse:
    return AgentResponse(
        id=record["id"],
        organization_id=record["organization_id"],
        slug=record.get("slug"),
        name=record.get("name"),
        description=record.get("description"),
        category=record.get("category"),
        type=record.get("type"),
        status=record.get("status", "draft"),
        is_public=bool(record.get("is_public")),
        avatar_url=record.get("avatar_url"),
        version=str(record.get("version") or "1.0.0"),
        parent_version_id=record.get("parent_version_id"),
        created_by=record.get("created_by"),
        created_at=record.get("created_at", datetime.utcnow()),
        updated_at=record.get("updated_at", datetime.utcnow()),
        published_at=record.get("published_at"),
        is_active=_status_is_active(record.get("status")),
    )


@router.get("", response_model=AgentListResponse)
async def list_agents(
    organization_id: Optional[UUID] = Query(
        None, description="Filter agents to a specific organization"
    ),
    category: Optional[str] = Query(None, description="Filter by category"),
    agent_type: Optional[str] = Query(None, alias="type", description="Filter by type"),
    lifecycle_status: Optional[str] = Query(None, alias="status", description="Filter by lifecycle status"),
    search: Optional[str] = Query(
        None, description="Filter by partial name match (case-insensitive)"
    ),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """List agents with pagination and filtering support."""

    offset = (page - 1) * page_size
    org_id = str(organization_id) if organization_id else None

    try:
        records, total = await agent_repo.get_all_agents(
            organization_id=org_id,
            category=category,
            agent_type=agent_type,
            status=lifecycle_status,
            search=search,
            limit=page_size,
            offset=offset,
            include_count=True,
        )
    except Exception as exc:  # pragma: no cover - handled upstream
        logger.error("agents.list_failed", error=str(exc))
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to load agents") from exc

    return AgentListResponse(
        agents=[_map_agent(agent) for agent in records],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{slug}", response_model=AgentResponse)
async def get_agent(slug: str, organization_id: Optional[UUID] = Query(None)):
    """Return a single agent by slug."""

    try:
        agent = await agent_repo.get_agent_by_slug(
            slug, organization_id=str(organization_id) if organization_id else None
        )
    except Exception as exc:  # pragma: no cover
        logger.error("agents.fetch_failed", slug=slug, error=str(exc))
        raise HTTPException(status_code=502, detail="Failed to fetch agent") from exc

    if not agent:
        raise HTTPException(status_code=404, detail=f"Agent not found: {slug}")

    return _map_agent(agent)


@router.post("", response_model=AgentResponse, status_code=201)
async def create_agent(agent: AgentCreate):
    """Create a new agent record in Supabase."""

    payload: Dict[str, Any] = agent.model_dump()
    payload["organization_id"] = str(agent.organization_id)
    if agent.created_by:
        payload["created_by"] = str(agent.created_by)
    if agent.parent_version_id:
        payload["parent_version_id"] = str(agent.parent_version_id)

    try:
        created = await agent_repo.create_agent(payload)
    except Exception as exc:  # pragma: no cover
        logger.error("agents.create_failed", slug=agent.slug, error=str(exc))
        raise HTTPException(status_code=502, detail="Failed to create agent") from exc

    return _map_agent(created)


@router.put("/{agent_id}", response_model=AgentResponse)
async def update_agent(agent_id: UUID, updates: AgentUpdate):
    """Update an existing agent."""

    update_data = updates.model_dump(exclude_unset=True)
    if updates.parent_version_id is not None:
        update_data["parent_version_id"] = str(updates.parent_version_id)

    try:
        updated = await agent_repo.update_agent(str(agent_id), update_data)
    except Exception as exc:  # pragma: no cover
        logger.error("agents.update_failed", agent_id=str(agent_id), error=str(exc))
        raise HTTPException(status_code=502, detail="Failed to update agent") from exc

    if not updated:
        raise HTTPException(status_code=404, detail="Agent not found")

    return _map_agent(updated)


@router.delete("/{agent_id}", status_code=204)
async def delete_agent(agent_id: UUID):
    """Soft-delete an agent by marking it archived."""

    try:
        deleted = await agent_repo.delete_agent(str(agent_id))
    except Exception as exc:  # pragma: no cover
        logger.error("agents.delete_failed", agent_id=str(agent_id), error=str(exc))
        raise HTTPException(status_code=502, detail="Failed to delete agent") from exc

    if not deleted:
        raise HTTPException(status_code=404, detail="Agent not found")


@router.get("/{slug}/capabilities")
async def get_agent_capabilities(slug: str):
    """Temporary capabilities endpoint until capability store lands."""

    capabilities_map = {
        "tax-corp-eu-022": [
            "EU-27 corporate tax rates and regulations",
            "ATAD I/II compliance checking",
            "DAC6 mandatory disclosure guidance",
            "Transfer pricing within EU",
            "EU tax directive interpretation",
        ],
        "tax-corp-us-023": [
            "Federal corporate income tax (IRC)",
            "State corporate taxes (all 50 states)",
            "TCJA compliance and planning",
            "International tax (GILTI, FDII, Subpart F)",
            "Tax credits (R&D, foreign, energy)",
        ],
    }

    if slug not in capabilities_map:
        raise HTTPException(status_code=404, detail="Agent not found")

    return {
        "slug": slug,
        "capabilities": capabilities_map.get(slug, []),
        "status": "active",
        "version": "1.0.0",
    }
