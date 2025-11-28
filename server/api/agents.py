"""
Agent Management API Endpoints

Provides CRUD operations for AI agents, including creation, retrieval,
updating, and deletion of agent configurations.
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from uuid import UUID, uuid4

router = APIRouter(prefix="/api/agents", tags=["agents"])


# Pydantic Models
class AgentBase(BaseModel):
    slug: str = Field(..., description="Unique agent identifier (e.g., tax-corp-eu-022)")
    name: str = Field(..., description="Human-readable agent name")
    description: Optional[str] = Field(None, description="Agent description")
    category: str = Field(..., description="Agent category (tax, accounting, audit, etc.)")
    type: str = Field(..., description="Agent type (assistant, specialist, orchestrator, etc.)")
    is_active: bool = Field(True, description="Whether agent is active")
    config: Optional[dict] = Field(None, description="Agent configuration JSON")


class AgentCreate(AgentBase):
    organization_id: UUID = Field(..., description="Organization ID that owns this agent")


class AgentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    config: Optional[dict] = None


class AgentResponse(AgentBase):
    id: UUID
    organization_id: UUID
    version: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# Mock database (will be replaced with actual Supabase queries)
_agents_db: dict[UUID, dict] = {}


@router.get("", response_model=List[AgentResponse])
async def list_agents(
    organization_id: Optional[UUID] = Query(None, description="Filter by organization"),
    category: Optional[str] = Query(None, description="Filter by category"),
    type: Optional[str] = Query(None, description="Filter by type"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Max records to return")
):
    """
    List all agents with optional filters.
    
    Supports filtering by:
    - Organization ID
    - Category (tax, accounting, audit, etc.)
    - Type (assistant, specialist, orchestrator, etc.)
    - Active status
    
    Returns paginated results.
    """
    # TODO: Replace with actual Supabase query
    # For now, return mock data
    
    agents = []
    
    # Add all 12 tax agents as mock data
    tax_agents = [
        {"slug": "tax-corp-eu-022", "name": "EU Corporate Tax Specialist", "category": "tax"},
        {"slug": "tax-corp-us-023", "name": "US Corporate Tax Specialist", "category": "tax"},
        {"slug": "tax-corp-uk-024", "name": "UK Corporate Tax Specialist", "category": "tax"},
        {"slug": "tax-corp-ca-025", "name": "Canadian Corporate Tax Specialist", "category": "tax"},
        {"slug": "tax-corp-mt-026", "name": "Malta Corporate Tax Specialist", "category": "tax"},
        {"slug": "tax-corp-rw-027", "name": "Rwanda Corporate Tax Specialist", "category": "tax"},
        {"slug": "tax-vat-028", "name": "VAT/GST Specialist", "category": "tax"},
        {"slug": "tax-tp-029", "name": "Transfer Pricing Specialist", "category": "tax"},
        {"slug": "tax-personal-030", "name": "Personal Tax Specialist", "category": "tax"},
        {"slug": "tax-provision-031", "name": "Tax Provision Specialist", "category": "tax"},
        {"slug": "tax-contro-032", "name": "Tax Controversy Specialist", "category": "tax"},
        {"slug": "tax-research-033", "name": "Tax Research Specialist", "category": "tax"},
    ]
    
    for agent_data in tax_agents:
        if category and agent_data["category"] != category:
            continue
            
        agents.append(AgentResponse(
            id=uuid4(),
            organization_id=organization_id or uuid4(),
            slug=agent_data["slug"],
            name=agent_data["name"],
            description=f"Specialized AI agent for {agent_data['name'].lower()}",
            category=agent_data["category"],
            type="specialist",
            is_active=True,
            version=1,
            config={},
            created_at=datetime.now(),
            updated_at=datetime.now()
        ))
    
    return agents[skip:skip+limit]


@router.get("/{slug}", response_model=AgentResponse)
async def get_agent(slug: str):
    """
    Get agent details by slug.
    
    Returns complete agent configuration including:
    - Metadata (name, description, category, type)
    - Configuration
    - Version information
    - Timestamps
    """
    # TODO: Replace with actual Supabase query
    # SELECT * FROM agents WHERE slug = $1 AND organization_id = $2
    
    # Mock response
    agent_names = {
        "tax-corp-eu-022": "EU Corporate Tax Specialist",
        "tax-corp-us-023": "US Corporate Tax Specialist",
        "tax-corp-uk-024": "UK Corporate Tax Specialist",
        "tax-corp-ca-025": "Canadian Corporate Tax Specialist",
        "tax-corp-mt-026": "Malta Corporate Tax Specialist",
        "tax-corp-rw-027": "Rwanda Corporate Tax Specialist",
        "tax-vat-028": "VAT/GST Specialist",
        "tax-tp-029": "Transfer Pricing Specialist",
        "tax-personal-030": "Personal Tax Specialist",
        "tax-provision-031": "Tax Provision Specialist",
        "tax-contro-032": "Tax Controversy Specialist",
        "tax-research-033": "Tax Research Specialist",
    }
    
    if slug not in agent_names:
        raise HTTPException(status_code=404, detail=f"Agent not found: {slug}")
    
    return AgentResponse(
        id=uuid4(),
        organization_id=uuid4(),
        slug=slug,
        name=agent_names[slug],
        description=f"Specialized AI agent for {agent_names[slug].lower()}",
        category="tax",
        type="specialist",
        is_active=True,
        version=1,
        config={
            "model": "gpt-4",
            "temperature": 0.7,
            "max_tokens": 2000
        },
        created_at=datetime.now(),
        updated_at=datetime.now()
    )


@router.post("", response_model=AgentResponse, status_code=201)
async def create_agent(agent: AgentCreate):
    """
    Create a new agent.
    
    Required fields:
    - slug: Unique identifier
    - name: Human-readable name
    - organization_id: Owner organization
    - category: Agent category
    - type: Agent type
    
    Returns the created agent with generated ID and timestamps.
    """
    # TODO: Replace with actual Supabase insert
    # INSERT INTO agents (...) VALUES (...) RETURNING *
    
    # Check if slug already exists
    # This would be a database constraint in production
    for existing_agent in _agents_db.values():
        if existing_agent.get("slug") == agent.slug:
            raise HTTPException(
                status_code=400,
                detail=f"Agent with slug '{agent.slug}' already exists"
            )
    
    agent_id = uuid4()
    now = datetime.now()
    
    new_agent = AgentResponse(
        id=agent_id,
        organization_id=agent.organization_id,
        slug=agent.slug,
        name=agent.name,
        description=agent.description,
        category=agent.category,
        type=agent.type,
        is_active=agent.is_active,
        version=1,
        config=agent.config or {},
        created_at=now,
        updated_at=now
    )
    
    _agents_db[agent_id] = new_agent.model_dump()
    
    return new_agent


@router.put("/{agent_id}", response_model=AgentResponse)
async def update_agent(agent_id: UUID, updates: AgentUpdate):
    """
    Update an existing agent.
    
    Supports partial updates of:
    - name
    - description
    - is_active
    - config
    
    Version number is automatically incremented.
    """
    # TODO: Replace with actual Supabase update
    # UPDATE agents SET ... WHERE id = $1 AND organization_id = $2 RETURNING *
    
    if agent_id not in _agents_db:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    agent_data = _agents_db[agent_id]
    
    # Apply updates
    update_data = updates.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        agent_data[field] = value
    
    # Increment version and update timestamp
    agent_data["version"] = agent_data.get("version", 1) + 1
    agent_data["updated_at"] = datetime.now()
    
    return AgentResponse(**agent_data)


@router.delete("/{agent_id}", status_code=204)
async def delete_agent(agent_id: UUID):
    """
    Delete an agent (soft delete).
    
    Sets is_active to False and adds deleted_at timestamp.
    Agent data is retained for audit purposes.
    """
    # TODO: Replace with actual Supabase soft delete
    # UPDATE agents SET is_active = false, deleted_at = NOW() 
    # WHERE id = $1 AND organization_id = $2
    
    if agent_id not in _agents_db:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    agent_data = _agents_db[agent_id]
    agent_data["is_active"] = False
    agent_data["deleted_at"] = datetime.now()
    
    return None


@router.get("/{slug}/capabilities")
async def get_agent_capabilities(slug: str):
    """
    Get agent capabilities and supported features.
    
    Returns:
    - List of capabilities
    - Supported jurisdictions (for tax agents)
    - Available tools/functions
    - Integration points
    """
    # TODO: This would query the TypeScript agent directly
    # or retrieve from a cached capabilities table
    
    capabilities_map = {
        "tax-corp-eu-022": [
            "EU-27 corporate tax rates and regulations",
            "ATAD I/II compliance checking",
            "DAC6 mandatory disclosure guidance",
            "Transfer pricing within EU",
            "EU tax directive interpretation"
        ],
        "tax-corp-us-023": [
            "Federal corporate income tax (IRC)",
            "State corporate taxes (all 50 states)",
            "TCJA compliance and planning",
            "International tax (GILTI, FDII, Subpart F)",
            "Tax credits (R&D, foreign, energy)"
        ],
        # Add more as needed
    }
    
    if slug not in capabilities_map:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    return {
        "slug": slug,
        "capabilities": capabilities_map.get(slug, []),
        "status": "active",
        "version": "1.0.0"
    }
