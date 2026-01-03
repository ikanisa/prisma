"""Pydantic schemas for knowledge management API."""
from datetime import datetime
from typing import List, Optional, Dict, Any
from uuid import UUID

from pydantic import BaseModel, Field


class KnowledgeSourceCreate(BaseModel):
    """Schema for creating a knowledge source."""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    slug: str = Field(..., min_length=1, max_length=100)
    source_type: str = Field(..., pattern="^(document|database|api|website|manual|integration)$")
    source_config: Dict[str, Any] = Field(default_factory=dict)
    embedding_model: str = "text-embedding-3-small"
    chunk_size: int = Field(default=1000, ge=100, le=4000)
    chunk_overlap: int = Field(default=200, ge=0, le=1000)
    chunking_strategy: str = "recursive"
    sync_frequency: str = "manual"
    auto_sync: bool = False
    tags: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class KnowledgeSourceUpdate(BaseModel):
    """Schema for updating a knowledge source."""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    source_config: Optional[Dict[str, Any]] = None
    embedding_model: Optional[str] = None
    chunk_size: Optional[int] = Field(None, ge=100, le=4000)
    chunk_overlap: Optional[int] = Field(None, ge=0, le=1000)
    chunking_strategy: Optional[str] = None
    sync_frequency: Optional[str] = None
    auto_sync: Optional[bool] = None
    status: Optional[str] = None
    tags: Optional[List[str]] = None
    metadata: Optional[Dict[str, Any]] = None


class KnowledgeSourceResponse(BaseModel):
    """Schema for knowledge source response."""
    id: UUID
    organization_id: UUID
    name: str
    description: Optional[str]
    slug: str
    source_type: str
    source_config: Dict[str, Any]
    embedding_model: str
    chunk_size: int
    chunk_overlap: int
    chunking_strategy: str
    index_name: Optional[str]
    vector_store_id: Optional[str]
    sync_frequency: str
    auto_sync: bool
    status: str
    last_synced_at: Optional[datetime]
    next_sync_at: Optional[datetime]
    sync_error: Optional[str]
    document_count: int
    chunk_count: int
    total_tokens: int
    total_size_bytes: int
    tags: List[str]
    metadata: Dict[str, Any]
    created_by: Optional[UUID]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class KnowledgeDocumentResponse(BaseModel):
    """Schema for knowledge document response."""
    id: UUID
    knowledge_source_id: UUID
    organization_id: UUID
    name: str
    external_id: Optional[str]
    file_path: Optional[str]
    url: Optional[str]
    content_type: Optional[str]
    content_hash: Optional[str]
    file_size: Optional[int]
    status: str
    processing_error: Optional[str]
    chunk_count: int
    token_count: int
    metadata: Dict[str, Any]
    processed_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class KnowledgeSearchRequest(BaseModel):
    """Schema for knowledge search request."""
    query: str = Field(..., min_length=1, max_length=1000)
    knowledge_sources: Optional[List[UUID]] = None
    agent_id: Optional[UUID] = None
    top_k: int = Field(default=5, ge=1, le=50)
    retrieval_strategy: str = Field(default="similarity", pattern="^(similarity|hybrid|keyword|mmr)$")
    similarity_threshold: float = Field(default=0.70, ge=0.0, le=1.0)
    use_rerank: bool = True
    metadata_filter: Optional[Dict[str, Any]] = None


class KnowledgeChunkResult(BaseModel):
    """Schema for a search result chunk."""
    chunk_id: UUID
    document_id: UUID
    knowledge_source_id: UUID
    content: str
    score: float
    chunk_index: int
    metadata: Dict[str, Any]
    document_name: str
    source_name: str


class KnowledgeSearchResponse(BaseModel):
    """Schema for knowledge search response."""
    results: List[KnowledgeChunkResult]
    query: str
    total_results: int
    retrieval_strategy: str
    latency_ms: int
    rerank_used: bool
    fallback_used: bool


class SyncJobResponse(BaseModel):
    """Schema for sync job response."""
    id: UUID
    knowledge_source_id: UUID
    job_type: str
    status: str
    total_items: Optional[int]
    processed_items: int
    failed_items: int
    progress_percent: float
    documents_added: int
    documents_updated: int
    documents_deleted: int
    chunks_created: int
    error_message: Optional[str]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    duration_ms: Optional[int]
    triggered_by: str
    created_at: datetime

    class Config:
        from_attributes = True


class KnowledgeSourceTemplateResponse(BaseModel):
    """Schema for knowledge source template."""
    id: UUID
    name: str
    description: Optional[str]
    category: Optional[str]
    source_type: str
    default_config: Dict[str, Any]
    schema: Optional[Dict[str, Any]]
    icon: Optional[str]

    class Config:
        from_attributes = True
