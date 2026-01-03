"""
Persona Management API Endpoints

Provides CRUD operations for agent personas, including personality traits,
communication styles, and behavioral configurations.
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from uuid import UUID, uuid4

router = APIRouter(prefix="/api/v1/personas", tags=["personas"])


# Pydantic Models
class PersonaBase(BaseModel):
    name: str = Field(..., description="Persona name")
    role: Optional[str] = Field(None, description="Persona role/title")
    system_prompt: str = Field(..., description="System prompt template")
    personality_traits: List[str] = Field(default_factory=list, description="Personality traits list")
    communication_style: str = Field("professional", description="Communication style: professional, friendly, concise, detailed, technical")
    temperature: float = Field(0.7, ge=0.0, le=2.0, description="Model temperature setting")
    pii_handling: str = Field("redact", description="PII handling: redact, mask, warn, allow")
    is_active: bool = Field(True, description="Whether persona is active")


class PersonaCreate(PersonaBase):
    agent_id: UUID = Field(..., description="Agent ID this persona belongs to")


class PersonaUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    system_prompt: Optional[str] = None
    personality_traits: Optional[List[str]] = None
    communication_style: Optional[str] = None
    temperature: Optional[float] = None
    pii_handling: Optional[str] = None
    is_active: Optional[bool] = None


class PersonaResponse(PersonaBase):
    id: UUID
    agent_id: UUID
    version: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# Mock database
_personas_db: dict[UUID, dict] = {}


@router.post("", response_model=PersonaResponse, status_code=201)
async def create_persona(persona: PersonaCreate):
    """
    Create a new persona for an agent.
    
    A persona defines how an agent communicates and behaves, including:
    - Personality traits (professional, empathetic, analytical, etc.)
    - Communication style preferences
    - System prompt template
    - PII handling policies
    """
    persona_id = uuid4()
    now = datetime.utcnow()
    
    persona_data = {
        "id": persona_id,
        **persona.model_dump(),
        "version": 1,
        "created_at": now,
        "updated_at": now,
    }
    
    _personas_db[persona_id] = persona_data
    
    return PersonaResponse(**persona_data)


@router.get("", response_model=List[PersonaResponse])
async def list_personas(
    agent_id: Optional[UUID] = Query(None, description="Filter by agent ID"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000)
):
    """
    List all personas with optional filters.
    
    Can filter by:
    - Agent ID
    - Active status
    """
    personas = list(_personas_db.values())
    
    # Apply filters
    if agent_id:
        personas = [p for p in personas if p["agent_id"] == agent_id]
    if is_active is not None:
        personas = [p for p in personas if p["is_active"] == is_active]
    
    # Apply pagination
    personas = personas[skip:skip + limit]
    
    return [PersonaResponse(**p) for p in personas]


@router.get("/{persona_id}", response_model=PersonaResponse)
async def get_persona(persona_id: UUID):
    """
    Get a specific persona by ID.
    """
    if persona_id not in _personas_db:
        raise HTTPException(status_code=404, detail="Persona not found")
    
    return PersonaResponse(**_personas_db[persona_id])


@router.put("/{persona_id}", response_model=PersonaResponse)
async def update_persona(persona_id: UUID, persona_update: PersonaUpdate):
    """
    Update an existing persona.
    
    Increments version number on successful update.
    """
    if persona_id not in _personas_db:
        raise HTTPException(status_code=404, detail="Persona not found")
    
    persona_data = _personas_db[persona_id]
    
    # Update fields
    update_data = persona_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        persona_data[field] = value
    
    # Increment version and update timestamp
    persona_data["version"] += 1
    persona_data["updated_at"] = datetime.utcnow()
    
    return PersonaResponse(**persona_data)


@router.delete("/{persona_id}", status_code=204)
async def delete_persona(persona_id: UUID):
    """
    Delete a persona.
    
    This is a hard delete. Consider soft delete (is_active=False) for production.
    """
    if persona_id not in _personas_db:
        raise HTTPException(status_code=404, detail="Persona not found")
    
    del _personas_db[persona_id]
    
    return None


@router.post("/{persona_id}/activate", response_model=PersonaResponse)
async def activate_persona(persona_id: UUID):
    """
    Activate a persona (set as default for the agent).
    
    This will deactivate other personas for the same agent.
    """
    if persona_id not in _personas_db:
        raise HTTPException(status_code=404, detail="Persona not found")
    
    persona_data = _personas_db[persona_id]
    agent_id = persona_data["agent_id"]
    
    # Deactivate all personas for this agent
    for pid, pdata in _personas_db.items():
        if pdata["agent_id"] == agent_id:
            pdata["is_active"] = False
    
    # Activate this persona
    persona_data["is_active"] = True
    persona_data["updated_at"] = datetime.utcnow()
    
    return PersonaResponse(**persona_data)


@router.post("/{persona_id}/test", response_model=dict)
async def test_persona(persona_id: UUID, test_input: str = Query(..., description="Test input message")):
    """
    Test a persona with sample input.
    
    Returns a preview of how the persona would respond.
    """
    if persona_id not in _personas_db:
        raise HTTPException(status_code=404, detail="Persona not found")
    
    persona_data = _personas_db[persona_id]
    
    # Mock response (in production, this would call the LLM)
    return {
        "persona_id": persona_id,
        "persona_name": persona_data["name"],
        "test_input": test_input,
        "system_prompt": persona_data["system_prompt"],
        "temperature": persona_data["temperature"],
        "preview_response": f"[Preview using {persona_data['communication_style']} style with {persona_data['temperature']} temperature]"
    }
