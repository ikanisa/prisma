"""
Tool Management API Endpoints

Provides CRUD operations for agent tools, including tool registration,
configuration, and assignment to agents.
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from uuid import UUID, uuid4

router = APIRouter(prefix="/api/v1/tools", tags=["tools"])


# Pydantic Models
class ToolBase(BaseModel):
    name: str = Field(..., description="Tool name")
    description: str = Field(..., description="Tool description")
    category: str = Field(..., description="Tool category: calculation, data-retrieval, transformation, validation, etc.")
    schema_definition: Dict[str, Any] = Field(..., description="JSON schema for tool parameters")
    endpoint_url: Optional[str] = Field(None, description="External API endpoint URL")
    is_public: bool = Field(False, description="Whether tool is available to all agents")
    requires_approval: bool = Field(False, description="Whether tool execution requires human approval")


class ToolCreate(ToolBase):
    organization_id: UUID = Field(..., description="Organization ID that owns this tool")


class ToolUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    schema_definition: Optional[Dict[str, Any]] = None
    endpoint_url: Optional[str] = None
    is_public: Optional[bool] = None
    requires_approval: Optional[bool] = None


class ToolResponse(ToolBase):
    id: UUID
    organization_id: UUID
    version: int
    usage_count: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class ToolAssignment(BaseModel):
    agent_id: UUID
    tool_id: UUID
    is_enabled: bool = True
    config_override: Optional[Dict[str, Any]] = None


# Mock database
_tools_db: dict[UUID, dict] = {}
_tool_assignments_db: dict[UUID, dict] = {}


@router.post("", response_model=ToolResponse, status_code=201)
async def create_tool(tool: ToolCreate):
    """
    Register a new tool.
    
    Tools can be:
    - Calculation tools (tax calculations, financial modeling)
    - Data retrieval tools (database queries, API calls)
    - Transformation tools (data formatting, conversions)
    - Validation tools (compliance checks, data validation)
    """
    tool_id = uuid4()
    now = datetime.utcnow()
    
    tool_data = {
        "id": tool_id,
        **tool.model_dump(),
        "version": 1,
        "usage_count": 0,
        "created_at": now,
        "updated_at": now,
    }
    
    _tools_db[tool_id] = tool_data
    
    return ToolResponse(**tool_data)


@router.get("", response_model=List[ToolResponse])
async def list_tools(
    organization_id: Optional[UUID] = Query(None, description="Filter by organization"),
    category: Optional[str] = Query(None, description="Filter by category"),
    is_public: Optional[bool] = Query(None, description="Filter by public status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000)
):
    """
    List all tools with optional filters.
    
    Can filter by:
    - Organization ID
    - Category
    - Public status
    """
    tools = list(_tools_db.values())
    
    # Apply filters
    if organization_id:
        tools = [t for t in tools if t["organization_id"] == organization_id or t["is_public"]]
    if category:
        tools = [t for t in tools if t["category"] == category]
    if is_public is not None:
        tools = [t for t in tools if t["is_public"] == is_public]
    
    # Apply pagination
    tools = tools[skip:skip + limit]
    
    return [ToolResponse(**t) for t in tools]


@router.get("/{tool_id}", response_model=ToolResponse)
async def get_tool(tool_id: UUID):
    """
    Get a specific tool by ID.
    """
    if tool_id not in _tools_db:
        raise HTTPException(status_code=404, detail="Tool not found")
    
    return ToolResponse(**_tools_db[tool_id])


@router.put("/{tool_id}", response_model=ToolResponse)
async def update_tool(tool_id: UUID, tool_update: ToolUpdate):
    """
    Update an existing tool.
    
    Increments version number on successful update.
    """
    if tool_id not in _tools_db:
        raise HTTPException(status_code=404, detail="Tool not found")
    
    tool_data = _tools_db[tool_id]
    
    # Update fields
    update_data = tool_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        tool_data[field] = value
    
    # Increment version and update timestamp
    tool_data["version"] += 1
    tool_data["updated_at"] = datetime.utcnow()
    
    return ToolResponse(**tool_data)


@router.delete("/{tool_id}", status_code=204)
async def delete_tool(tool_id: UUID):
    """
    Delete a tool.
    
    This will also remove all agent assignments for this tool.
    """
    if tool_id not in _tools_db:
        raise HTTPException(status_code=404, detail="Tool not found")
    
    # Remove tool assignments
    assignments_to_remove = [
        aid for aid, adata in _tool_assignments_db.items()
        if adata["tool_id"] == tool_id
    ]
    for aid in assignments_to_remove:
        del _tool_assignments_db[aid]
    
    # Remove tool
    del _tools_db[tool_id]
    
    return None


@router.post("/{tool_id}/test", response_model=dict)
async def test_tool(tool_id: UUID, parameters: Dict[str, Any] = {}):
    """
    Test a tool with sample parameters.
    
    Validates parameters against schema and returns preview.
    """
    if tool_id not in _tools_db:
        raise HTTPException(status_code=404, detail="Tool not found")
    
    tool_data = _tools_db[tool_id]
    
    # In production, this would:
    # 1. Validate parameters against schema
    # 2. Execute the tool (or simulate execution)
    # 3. Return results
    
    return {
        "tool_id": tool_id,
        "tool_name": tool_data["name"],
        "parameters": parameters,
        "schema": tool_data["schema_definition"],
        "test_result": {
            "status": "success",
            "message": "Tool test simulation successful",
            "execution_time_ms": 42
        }
    }


@router.post("/{tool_id}/assign", response_model=dict, status_code=201)
async def assign_tool_to_agent(tool_id: UUID, assignment: ToolAssignment):
    """
    Assign a tool to an agent.
    
    Allows per-agent configuration overrides.
    """
    if tool_id not in _tools_db:
        raise HTTPException(status_code=404, detail="Tool not found")
    
    assignment_id = uuid4()
    now = datetime.utcnow()
    
    assignment_data = {
        "id": assignment_id,
        "tool_id": tool_id,
        "agent_id": assignment.agent_id,
        "is_enabled": assignment.is_enabled,
        "config_override": assignment.config_override or {},
        "created_at": now,
        "updated_at": now,
    }
    
    _tool_assignments_db[assignment_id] = assignment_data
    
    return {
        "assignment_id": assignment_id,
        "tool_id": tool_id,
        "agent_id": assignment.agent_id,
        "status": "assigned"
    }


@router.get("/{tool_id}/assignments", response_model=List[dict])
async def get_tool_assignments(tool_id: UUID):
    """
    Get all agent assignments for a tool.
    """
    if tool_id not in _tools_db:
        raise HTTPException(status_code=404, detail="Tool not found")
    
    assignments = [
        {
            "id": aid,
            **adata
        }
        for aid, adata in _tool_assignments_db.items()
        if adata["tool_id"] == tool_id
    ]
    
    return assignments
