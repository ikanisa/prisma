"""Vector store API router migrated from server.main."""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
import structlog

from .. import openai_retrieval
from ..api_helpers import require_auth


router = APIRouter(prefix="/v1/vector-stores", tags=["vector-stores"])
logger = structlog.get_logger(__name__)


class VectorStoreCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=256)
    file_ids: Optional[List[str]] = Field(default=None)
    expires_after: Optional[Dict[str, Any]] = Field(default=None)
    chunking_strategy: Optional[Dict[str, Any]] = Field(default=None)
    metadata: Optional[Dict[str, Any]] = Field(default=None)


class VectorStoreUpdateRequest(BaseModel):
    name: Optional[str] = None
    expires_after: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None


class VectorStoreFileCreateRequest(BaseModel):
    file_id: str = Field(..., min_length=1)
    attributes: Optional[Dict[str, Any]] = None
    chunking_strategy: Optional[Dict[str, Any]] = None


class VectorStoreFileUpdateRequest(BaseModel):
    attributes: Optional[Dict[str, Any]] = None


class FileBatchCreateRequest(BaseModel):
    file_ids: Optional[List[str]] = None
    files: Optional[List[Dict[str, Any]]] = None


class VectorStoreSearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    max_num_results: int = Field(10, ge=1, le=50)
    rewrite_query: bool = True
    attribute_filter: Optional[Dict[str, Any]] = None
    ranking_options: Optional[Dict[str, Any]] = None


@router.post("", status_code=201)
async def create_vector_store(
    request: VectorStoreCreateRequest,
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    """Create a new vector store."""

    user_id = auth.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing subject claim")

    if not openai_retrieval.is_enabled():
        raise HTTPException(status_code=503, detail="OpenAI Retrieval not configured")

    try:
        result = await openai_retrieval.create_vector_store(
            name=request.name,
            file_ids=request.file_ids,
            expires_after=request.expires_after,
            chunking_strategy=request.chunking_strategy,
            metadata=request.metadata,
        )
        logger.info("vector_store.created", user_id=user_id, vector_store_id=result.get("id"))
        return result
    except Exception as exc:
        logger.error("vector_store.create_failed", user_id=user_id, error=str(exc))
        raise HTTPException(status_code=500, detail="Failed to create vector store")


@router.get("/{vector_store_id}")
async def get_vector_store(
    vector_store_id: str,
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    """Retrieve a vector store by ID."""

    if not auth.get("sub"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing subject claim")

    if not openai_retrieval.is_enabled():
        raise HTTPException(status_code=503, detail="OpenAI Retrieval not configured")

    try:
        return await openai_retrieval.retrieve_vector_store(vector_store_id)
    except Exception as exc:
        logger.error("vector_store.retrieve_failed", vector_store_id=vector_store_id, error=str(exc))
        raise HTTPException(status_code=404, detail="Vector store not found")


@router.post("/{vector_store_id}")
async def update_vector_store(
    vector_store_id: str,
    request: VectorStoreUpdateRequest,
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    """Update a vector store."""

    user_id = auth.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing subject claim")

    if not openai_retrieval.is_enabled():
        raise HTTPException(status_code=503, detail="OpenAI Retrieval not configured")

    try:
        result = await openai_retrieval.update_vector_store(
            vector_store_id,
            name=request.name,
            expires_after=request.expires_after,
            metadata=request.metadata,
        )
        logger.info("vector_store.updated", user_id=user_id, vector_store_id=vector_store_id)
        return result
    except Exception as exc:
        logger.error("vector_store.update_failed", user_id=user_id, vector_store_id=vector_store_id, error=str(exc))
        raise HTTPException(status_code=500, detail="Failed to update vector store")


@router.delete("/{vector_store_id}")
async def delete_vector_store(
    vector_store_id: str,
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    """Delete a vector store."""

    user_id = auth.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing subject claim")

    if not openai_retrieval.is_enabled():
        raise HTTPException(status_code=503, detail="OpenAI Retrieval not configured")

    try:
        result = await openai_retrieval.delete_vector_store(vector_store_id)
        logger.info("vector_store.deleted", user_id=user_id, vector_store_id=vector_store_id)
        return result
    except Exception as exc:
        logger.error("vector_store.delete_failed", user_id=user_id, vector_store_id=vector_store_id, error=str(exc))
        raise HTTPException(status_code=500, detail="Failed to delete vector store")


@router.get("")
async def list_vector_stores(
    limit: int = Query(20, ge=1, le=100),
    order: str = Query("desc", regex="^(asc|desc)$"),
    after: Optional[str] = Query(None),
    before: Optional[str] = Query(None),
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    """List vector stores."""

    if not auth.get("sub"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing subject claim")

    if not openai_retrieval.is_enabled():
        raise HTTPException(status_code=503, detail="OpenAI Retrieval not configured")

    try:
        return await openai_retrieval.list_vector_stores(
            limit=limit,
            order=order,
            after=after,
            before=before,
        )
    except Exception as exc:
        logger.error("vector_stores.list_failed", error=str(exc))
        raise HTTPException(status_code=500, detail="Failed to list vector stores")


@router.post("/{vector_store_id}/files")
async def create_vector_store_file(
    vector_store_id: str,
    request: VectorStoreFileCreateRequest,
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    """Attach a file to a vector store."""

    user_id = auth.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing subject claim")

    if not openai_retrieval.is_enabled():
        raise HTTPException(status_code=503, detail="OpenAI Retrieval not configured")

    try:
        result = await openai_retrieval.create_and_poll_vector_store_file(
            vector_store_id,
            request.file_id,
            attributes=request.attributes,
            chunking_strategy=request.chunking_strategy,
        )
        logger.info(
            "vector_store_file.created",
            user_id=user_id,
            vector_store_id=vector_store_id,
            file_id=request.file_id,
        )
        return result
    except Exception as exc:
        logger.error("vector_store_file.create_failed", user_id=user_id, error=str(exc))
        raise HTTPException(status_code=500, detail="Failed to create vector store file")


@router.get("/{vector_store_id}/files/{file_id}")
async def get_vector_store_file(
    vector_store_id: str,
    file_id: str,
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    """Retrieve a vector store file."""

    if not auth.get("sub"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing subject claim")

    if not openai_retrieval.is_enabled():
        raise HTTPException(status_code=503, detail="OpenAI Retrieval not configured")

    try:
        return await openai_retrieval.retrieve_vector_store_file(vector_store_id, file_id)
    except Exception as exc:
        logger.error("vector_store_file.retrieve_failed", file_id=file_id, error=str(exc))
        raise HTTPException(status_code=404, detail="Vector store file not found")


@router.post("/{vector_store_id}/files/{file_id}")
async def update_vector_store_file(
    vector_store_id: str,
    file_id: str,
    request: VectorStoreFileUpdateRequest,
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    """Update vector store file metadata."""

    user_id = auth.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing subject claim")

    if not openai_retrieval.is_enabled():
        raise HTTPException(status_code=503, detail="OpenAI Retrieval not configured")

    try:
        result = await openai_retrieval.update_vector_store_file(
            vector_store_id,
            file_id,
            attributes=request.attributes,
        )
        logger.info("vector_store_file.updated", user_id=user_id, vector_store_id=vector_store_id, file_id=file_id)
        return result
    except Exception as exc:
        logger.error("vector_store_file.update_failed", user_id=user_id, error=str(exc))
        raise HTTPException(status_code=500, detail="Failed to update vector store file")


@router.delete("/{vector_store_id}/files/{file_id}")
async def delete_vector_store_file(
    vector_store_id: str,
    file_id: str,
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    """Delete a vector store file."""

    user_id = auth.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing subject claim")

    if not openai_retrieval.is_enabled():
        raise HTTPException(status_code=503, detail="OpenAI Retrieval not configured")

    try:
        result = await openai_retrieval.delete_vector_store_file(vector_store_id, file_id)
        logger.info("vector_store_file.deleted", user_id=user_id, vector_store_id=vector_store_id, file_id=file_id)
        return result
    except Exception as exc:
        logger.error("vector_store_file.delete_failed", user_id=user_id, error=str(exc))
        raise HTTPException(status_code=500, detail="Failed to delete vector store file")


@router.get("/{vector_store_id}/files")
async def list_vector_store_files(
    vector_store_id: str,
    limit: int = Query(20, ge=1, le=100),
    order: str = Query("desc", regex="^(asc|desc)$"),
    after: Optional[str] = Query(None),
    before: Optional[str] = Query(None),
    filter_status: Optional[str] = Query(None),
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    """List files attached to a vector store."""

    if not auth.get("sub"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing subject claim")

    if not openai_retrieval.is_enabled():
        raise HTTPException(status_code=503, detail="OpenAI Retrieval not configured")

    try:
        return await openai_retrieval.list_vector_store_files(
            vector_store_id,
            limit=limit,
            order=order,
            after=after,
            before=before,
            filter_status=filter_status,
        )
    except Exception as exc:
        logger.error("vector_store_files.list_failed", vector_store_id=vector_store_id, error=str(exc))
        raise HTTPException(status_code=500, detail="Failed to list vector store files")


@router.post("/{vector_store_id}/file-batches")
async def create_file_batch(
    vector_store_id: str,
    request: FileBatchCreateRequest,
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    """Create a batch of files in a vector store."""

    user_id = auth.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing subject claim")

    if not openai_retrieval.is_enabled():
        raise HTTPException(status_code=503, detail="OpenAI Retrieval not configured")

    try:
        result = await openai_retrieval.create_and_poll_file_batch(
            vector_store_id,
            file_ids=request.file_ids,
            files=request.files,
        )
        logger.info("file_batch.created", user_id=user_id, vector_store_id=vector_store_id, batch_id=result.get("id"))
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.error("file_batch.create_failed", user_id=user_id, error=str(exc))
        raise HTTPException(status_code=500, detail="Failed to create file batch")


@router.get("/{vector_store_id}/file-batches/{batch_id}")
async def get_file_batch(
    vector_store_id: str,
    batch_id: str,
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    """Retrieve a file batch."""

    if not auth.get("sub"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing subject claim")

    if not openai_retrieval.is_enabled():
        raise HTTPException(status_code=503, detail="OpenAI Retrieval not configured")

    try:
        return await openai_retrieval.retrieve_file_batch(vector_store_id, batch_id)
    except Exception as exc:
        logger.error("file_batch.retrieve_failed", vector_store_id=vector_store_id, batch_id=batch_id, error=str(exc))
        raise HTTPException(status_code=404, detail="File batch not found")


@router.post("/{vector_store_id}/file-batches/{batch_id}/cancel")
async def cancel_file_batch(
    vector_store_id: str,
    batch_id: str,
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    """Cancel a file batch."""

    user_id = auth.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing subject claim")

    if not openai_retrieval.is_enabled():
        raise HTTPException(status_code=503, detail="OpenAI Retrieval not configured")

    try:
        result = await openai_retrieval.cancel_file_batch(vector_store_id, batch_id)
        logger.info("file_batch.cancelled", user_id=user_id, vector_store_id=vector_store_id, batch_id=batch_id)
        return result
    except Exception as exc:
        logger.error("file_batch.cancel_failed", user_id=user_id, error=str(exc))
        raise HTTPException(status_code=500, detail="Failed to cancel file batch")


@router.get("/{vector_store_id}/file-batches/{batch_id}/files")
async def list_batch_files(
    vector_store_id: str,
    batch_id: str,
    limit: int = Query(20, ge=1, le=100),
    order: str = Query("desc", regex="^(asc|desc)$"),
    after: Optional[str] = Query(None),
    before: Optional[str] = Query(None),
    filter_status: Optional[str] = Query(None),
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    """List files within a batch."""

    if not auth.get("sub"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing subject claim")

    if not openai_retrieval.is_enabled():
        raise HTTPException(status_code=503, detail="OpenAI Retrieval not configured")

    try:
        return await openai_retrieval.list_files_in_batch(
            vector_store_id,
            batch_id,
            limit=limit,
            order=order,
            after=after,
            before=before,
            filter_status=filter_status,
        )
    except Exception as exc:
        logger.error("batch_files.list_failed", vector_store_id=vector_store_id, batch_id=batch_id, error=str(exc))
        raise HTTPException(status_code=500, detail="Failed to list batch files")


@router.post("/{vector_store_id}/search")
async def search_vector_store(
    vector_store_id: str,
    request: VectorStoreSearchRequest,
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    """Perform semantic search in a vector store."""

    if not auth.get("sub"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="missing subject claim")

    if not openai_retrieval.is_enabled():
        raise HTTPException(status_code=503, detail="OpenAI Retrieval not configured")

    try:
        client = openai_retrieval.get_openai_client()

        kwargs: Dict[str, Any] = {
            "vector_store_id": vector_store_id,
            "query": request.query,
            "max_num_results": request.max_num_results,
            "rewrite_query": request.rewrite_query,
        }

        if request.attribute_filter:
            kwargs["attribute_filter"] = request.attribute_filter
        if request.ranking_options:
            kwargs["ranking_options"] = request.ranking_options

        response = await client.vector_stores.search(**kwargs)
        logger.info(
            "vector_store.search",
            vector_store_id=vector_store_id,
            query=request.query,
        )

        return openai_retrieval._as_dict(response)
    except Exception as exc:
        logger.error("vector_store.search_failed", vector_store_id=vector_store_id, error=str(exc))
        raise HTTPException(status_code=500, detail="Search failed")
