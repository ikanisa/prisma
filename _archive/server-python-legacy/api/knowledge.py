"""
Knowledge Base Management API Endpoints

Provides CRUD operations for knowledge sources, including document upload,
vector indexing, and knowledge assignment to agents.
"""

from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from uuid import UUID, uuid4

router = APIRouter(prefix="/api/v1/knowledge", tags=["knowledge"])


# Pydantic Models
class KnowledgeSourceBase(BaseModel):
    name: str = Field(..., description="Knowledge source name")
    description: Optional[str] = Field(None, description="Source description")
    source_type: str = Field(..., description="Source type: document, api, database, manual")
    content_type: str = Field(..., description="Content type: text, pdf, json, csv, etc.")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")
    is_active: bool = Field(True, description="Whether source is active")


class KnowledgeSourceCreate(KnowledgeSourceBase):
    organization_id: UUID = Field(..., description="Organization ID that owns this knowledge")
    content: Optional[str] = Field(None, description="Raw content (for text/manual entry)")
    file_url: Optional[str] = Field(None, description="URL to file (for documents)")


class KnowledgeSourceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    content: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None


class KnowledgeSourceResponse(KnowledgeSourceBase):
    id: UUID
    organization_id: UUID
    file_url: Optional[str]
    vector_indexed: bool
    chunk_count: int
    created_at: datetime
    updated_at: datetime
    indexed_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class KnowledgeAssignment(BaseModel):
    agent_id: UUID
    knowledge_id: UUID
    priority: int = Field(1, ge=1, le=10, description="Search priority (1=highest)")
    is_enabled: bool = True


class SearchQuery(BaseModel):
    query: str = Field(..., description="Search query text")
    agent_id: Optional[UUID] = Field(None, description="Filter by agent's assigned knowledge")
    limit: int = Field(10, ge=1, le=100, description="Max results to return")
    min_score: float = Field(0.7, ge=0.0, le=1.0, description="Minimum similarity score")


# Mock database
_knowledge_db: dict[UUID, dict] = {}
_knowledge_assignments_db: dict[UUID, dict] = {}


@router.post("", response_model=KnowledgeSourceResponse, status_code=201)
async def create_knowledge_source(knowledge: KnowledgeSourceCreate):
    """
    Create a new knowledge source.
    
    Knowledge sources can be:
    - Documents (PDF, Word, etc.)
    - Text content (manual entries)
    - API endpoints (for dynamic data)
    - Database connections
    """
    knowledge_id = uuid4()
    now = datetime.utcnow()
    
    knowledge_data = {
        "id": knowledge_id,
        **knowledge.model_dump(),
        "vector_indexed": False,
        "chunk_count": 0,
        "created_at": now,
        "updated_at": now,
        "indexed_at": None,
    }
    
    _knowledge_db[knowledge_id] = knowledge_data
    
    # In production, trigger async vectorization job here
    
    return KnowledgeSourceResponse(**knowledge_data)


@router.post("/upload", response_model=KnowledgeSourceResponse, status_code=201)
async def upload_knowledge_file(
    file: UploadFile = File(...),
    name: str = Query(..., description="Knowledge source name"),
    description: Optional[str] = Query(None),
    organization_id: UUID = Query(..., description="Organization ID"),
):
    """
    Upload a file as a knowledge source.
    
    Supported formats: PDF, TXT, MD, JSON, CSV, DOCX
    """
    # Read file content
    content = await file.read()
    
    knowledge_id = uuid4()
    now = datetime.utcnow()
    
    knowledge_data = {
        "id": knowledge_id,
        "name": name,
        "description": description,
        "source_type": "document",
        "content_type": file.content_type or "application/octet-stream",
        "file_url": f"/storage/knowledge/{knowledge_id}/{file.filename}",
        "metadata": {
            "filename": file.filename,
            "size_bytes": len(content),
        },
        "is_active": True,
        "organization_id": organization_id,
        "vector_indexed": False,
        "chunk_count": 0,
        "created_at": now,
        "updated_at": now,
        "indexed_at": None,
    }
    
    _knowledge_db[knowledge_id] = knowledge_data
    
    # In production:
    # 1. Save file to storage
    # 2. Extract text content
    # 3. Chunk content
    # 4. Generate embeddings
    # 5. Store in vector database
    
    return KnowledgeSourceResponse(**knowledge_data)


@router.get("", response_model=List[KnowledgeSourceResponse])
async def list_knowledge_sources(
    organization_id: Optional[UUID] = Query(None, description="Filter by organization"),
    source_type: Optional[str] = Query(None, description="Filter by source type"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    vector_indexed: Optional[bool] = Query(None, description="Filter by indexing status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000)
):
    """
    List all knowledge sources with optional filters.
    """
    sources = list(_knowledge_db.values())
    
    # Apply filters
    if organization_id:
        sources = [s for s in sources if s["organization_id"] == organization_id]
    if source_type:
        sources = [s for s in sources if s["source_type"] == source_type]
    if is_active is not None:
        sources = [s for s in sources if s["is_active"] == is_active]
    if vector_indexed is not None:
        sources = [s for s in sources if s["vector_indexed"] == vector_indexed]
    
    # Apply pagination
    sources = sources[skip:skip + limit]
    
    return [KnowledgeSourceResponse(**s) for s in sources]


@router.get("/{knowledge_id}", response_model=KnowledgeSourceResponse)
async def get_knowledge_source(knowledge_id: UUID):
    """
    Get a specific knowledge source by ID.
    """
    if knowledge_id not in _knowledge_db:
        raise HTTPException(status_code=404, detail="Knowledge source not found")
    
    return KnowledgeSourceResponse(**_knowledge_db[knowledge_id])


@router.put("/{knowledge_id}", response_model=KnowledgeSourceResponse)
async def update_knowledge_source(knowledge_id: UUID, knowledge_update: KnowledgeSourceUpdate):
    """
    Update an existing knowledge source.
    
    Content updates will trigger re-indexing.
    """
    if knowledge_id not in _knowledge_db:
        raise HTTPException(status_code=404, detail="Knowledge source not found")
    
    knowledge_data = _knowledge_db[knowledge_id]
    
    # Update fields
    update_data = knowledge_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        knowledge_data[field] = value
    
    # If content changed, mark for re-indexing
    if "content" in update_data:
        knowledge_data["vector_indexed"] = False
        knowledge_data["indexed_at"] = None
    
    knowledge_data["updated_at"] = datetime.utcnow()
    
    return KnowledgeSourceResponse(**knowledge_data)


@router.delete("/{knowledge_id}", status_code=204)
async def delete_knowledge_source(knowledge_id: UUID):
    """
    Delete a knowledge source.
    
    This will also remove all agent assignments and vector embeddings.
    """
    if knowledge_id not in _knowledge_db:
        raise HTTPException(status_code=404, detail="Knowledge source not found")
    
    # Remove assignments
    assignments_to_remove = [
        aid for aid, adata in _knowledge_assignments_db.items()
        if adata["knowledge_id"] == knowledge_id
    ]
    for aid in assignments_to_remove:
        del _knowledge_assignments_db[aid]
    
    # Remove knowledge source
    del _knowledge_db[knowledge_id]
    
    # In production, also delete vector embeddings
    
    return None


@router.post("/{knowledge_id}/reindex", response_model=dict)
async def reindex_knowledge_source(knowledge_id: UUID):
    """
    Trigger re-indexing of a knowledge source.
    
    Regenerates vector embeddings for updated content.
    """
    if knowledge_id not in _knowledge_db:
        raise HTTPException(status_code=404, detail="Knowledge source not found")
    
    knowledge_data = _knowledge_db[knowledge_id]
    
    # In production, trigger async vectorization job
    knowledge_data["vector_indexed"] = True
    knowledge_data["indexed_at"] = datetime.utcnow()
    knowledge_data["chunk_count"] = 42  # Mock value
    
    return {
        "knowledge_id": knowledge_id,
        "status": "indexing",
        "message": "Vectorization job started",
        "estimated_time_seconds": 30
    }


@router.post("/search", response_model=List[dict])
async def search_knowledge(query: SearchQuery):
    """
    Semantic search across knowledge base.
    
    Uses vector similarity to find relevant content.
    """
    # In production, this would:
    # 1. Generate embedding for query
    # 2. Search vector database
    # 3. Return ranked results
    
    # Mock results
    results = [
        {
            "knowledge_id": uuid4(),
            "chunk_id": f"chunk_{i}",
            "content": f"Mock search result {i+1} for query: {query.query}",
            "score": 0.95 - (i * 0.1),
            "metadata": {
                "source": "tax_regulations_2024.pdf",
                "page": i + 1
            }
        }
        for i in range(min(query.limit, 5))
    ]
    
    # Filter by minimum score
    results = [r for r in results if r["score"] >= query.min_score]
    
    return results


@router.post("/{knowledge_id}/assign", response_model=dict, status_code=201)
async def assign_knowledge_to_agent(knowledge_id: UUID, assignment: KnowledgeAssignment):
    """
    Assign a knowledge source to an agent.
    
    Agents will search their assigned knowledge during RAG operations.
    """
    if knowledge_id not in _knowledge_db:
        raise HTTPException(status_code=404, detail="Knowledge source not found")
    
    assignment_id = uuid4()
    now = datetime.utcnow()
    
    assignment_data = {
        "id": assignment_id,
        "knowledge_id": knowledge_id,
        "agent_id": assignment.agent_id,
        "priority": assignment.priority,
        "is_enabled": assignment.is_enabled,
        "created_at": now,
        "updated_at": now,
    }
    
    _knowledge_assignments_db[assignment_id] = assignment_data
    
    return {
        "assignment_id": assignment_id,
        "knowledge_id": knowledge_id,
        "agent_id": assignment.agent_id,
        "status": "assigned"
    }


@router.get("/{knowledge_id}/assignments", response_model=List[dict])
async def get_knowledge_assignments(knowledge_id: UUID):
    """
    Get all agent assignments for a knowledge source.
    """
    if knowledge_id not in _knowledge_db:
        raise HTTPException(status_code=404, detail="Knowledge source not found")
    
    assignments = [
        {
            "id": aid,
            **adata
        }
        for aid, adata in _knowledge_assignments_db.items()
        if adata["knowledge_id"] == knowledge_id
    ]
    
    return assignments
