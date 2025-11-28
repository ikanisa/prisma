"""Helpers for interacting with the OpenAI Retrieval API.

The existing RAG implementation stores embeddings inside Postgres via
`pgvector`. Some deployments prefer to offload semantic search to the
managed Retrieval API exposed by OpenAI. This module wraps the small
subset of that surface area we need: ensuring a vector store exists,
uploading org-scoped documents, and executing searches constrained to an
organisation.

The functions are designed to operate asynchronously using the shared
:class:`openai.AsyncOpenAI` client so they inherit timeouts, telemetry, and
headers from :mod:`server.openai_client`. They also provide graceful
fallbacks so callers can detect configuration issues and continue using
the local pgvector flow.
"""
from __future__ import annotations

import asyncio
import io
import os
from typing import Any, Dict, Iterable, List, Optional

import structlog

from .openai import get_openai_client

logger = structlog.get_logger(__name__)

# Cached vector store identifiers so we do not repeatedly hit the API.
_VECTOR_STORE_ID: Optional[str] = os.getenv("OPENAI_RETRIEVAL_VECTOR_STORE_ID")
_VECTOR_STORE_NAME: Optional[str] = os.getenv("OPENAI_RETRIEVAL_VECTOR_STORE_NAME")
_VECTOR_STORE_LOCK = asyncio.Lock()


def reset_cache() -> None:
    """Reset cached identifiers (primarily for test isolation)."""

    global _VECTOR_STORE_ID, _VECTOR_STORE_NAME
    _VECTOR_STORE_ID = os.getenv("OPENAI_RETRIEVAL_VECTOR_STORE_ID")
    _VECTOR_STORE_NAME = os.getenv("OPENAI_RETRIEVAL_VECTOR_STORE_NAME")


def is_enabled() -> bool:
    """Return ``True`` when Retrieval support is configured."""

    return bool(_VECTOR_STORE_ID or _VECTOR_STORE_NAME)


def _as_dict(value: Any) -> Dict[str, Any]:
    if value is None:
        return {}
    if isinstance(value, dict):
        return value
    if hasattr(value, "model_dump"):
        try:
            return value.model_dump()  # type: ignore[attr-defined]
        except Exception:  # pragma: no cover - defensive
            pass
    if hasattr(value, "to_dict"):
        try:
            return value.to_dict()  # type: ignore[attr-defined]
        except Exception:  # pragma: no cover - defensive
            pass
    if hasattr(value, "__dict__"):
        return dict(value.__dict__)
    return {}


async def _ensure_vector_store() -> Optional[str]:
    """Return the vector store id, creating or locating one if required."""

    global _VECTOR_STORE_ID
    if _VECTOR_STORE_ID:
        return _VECTOR_STORE_ID

    if not _VECTOR_STORE_NAME:
        return None

    async with _VECTOR_STORE_LOCK:
        if _VECTOR_STORE_ID:
            return _VECTOR_STORE_ID

        client = get_openai_client()

        # Attempt to locate an existing store by name to avoid duplicates.
        try:
            listing = await client.vector_stores.list(limit=200)
        except Exception as exc:  # pragma: no cover - network failure
            logger.warning("openai_retrieval.list_failed", error=str(exc))
            listing = None

        if listing is not None:
            data = getattr(listing, "data", None)
            stores = data if isinstance(data, Iterable) else []
            for entry in stores:
                info = _as_dict(entry)
                if info.get("name") == _VECTOR_STORE_NAME and info.get("id"):
                    _VECTOR_STORE_ID = str(info["id"])
                    break

        if not _VECTOR_STORE_ID:
            try:
                created = await client.vector_stores.create(name=_VECTOR_STORE_NAME)
            except Exception as exc:  # pragma: no cover - network failure
                logger.error("openai_retrieval.create_failed", error=str(exc))
                return None
            created_dict = _as_dict(created)
            vector_store_id = created_dict.get("id")
            if not vector_store_id:
                logger.error("openai_retrieval.create_missing_id", payload=created_dict)
                return None
            _VECTOR_STORE_ID = str(vector_store_id)

        return _VECTOR_STORE_ID


def _normalise_ranker(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    lowered = value.strip().lower()
    if lowered == "auto":
        return "auto"
    if lowered.startswith("default-"):
        return value
    return None


async def ingest_document(
    *,
    org_id: str,
    data: bytes,
    filename: Optional[str] = None,
    mime_type: Optional[str] = None,
    document_id: Optional[str] = None,
    extra_attributes: Optional[Dict[str, Any]] = None,
) -> Optional[Dict[str, Any]]:
    """Upload a document to the configured vector store.

    Returns a small payload describing the upload, or ``None`` when the
    Retrieval API is not configured.
    """

    store_id = await _ensure_vector_store()
    if not store_id:
        return None

    client = get_openai_client()

    attributes: Dict[str, Any] = {"org_id": org_id}
    if document_id:
        attributes["document_id"] = document_id
    if filename:
        attributes["filename"] = filename
    if mime_type:
        attributes["mime_type"] = mime_type
    if extra_attributes:
        attributes.update(extra_attributes)

    stream = io.BytesIO(data)
    upload_kwargs: Dict[str, Any] = {
        "vector_store_id": store_id,
        "file": (filename or "document.pdf", stream, mime_type or "application/pdf"),
    }
    if attributes:
        upload_kwargs["attributes"] = attributes

    try:
        result = await client.vector_stores.files.upload_and_poll(**upload_kwargs)
    except Exception as exc:  # pragma: no cover - network failure
        logger.error("openai_retrieval.upload_failed", error=str(exc))
        return None

    result_dict = _as_dict(result)
    return {
        "vectorStoreId": store_id,
        "fileId": result_dict.get("id") or result_dict.get("file_id"),
        "status": result_dict.get("status"),
    }


def _normalise_content(parts: Iterable[Any]) -> str:
    snippets: List[str] = []
    for part in parts:
        data = _as_dict(part)
        if (data.get("type") or "").lower() == "text":
            text = str(data.get("text") or "").strip()
            if text:
                snippets.append(text)
    return "\n".join(snippets).strip()


async def search(
    org_id: str,
    query: str,
    limit: int,
    retrieval_config: Dict[str, Any],
) -> Dict[str, Any]:
    """Execute a semantic search via the Retrieval API."""

    store_id = await _ensure_vector_store()
    if not store_id:
        raise RuntimeError("OpenAI Retrieval is not configured")

    client = get_openai_client()

    attribute_filter = {"type": "eq", "key": "org_id", "value": org_id}
    ranking_options: Dict[str, Any] = {}
    ranker = _normalise_ranker(str(retrieval_config.get("reranker") or ""))
    if ranker:
        ranking_options["ranker"] = ranker
    min_confidence = float(retrieval_config.get("min_citation_confidence") or 0.0)
    if min_confidence > 0:
        ranking_options["score_threshold"] = max(0.0, min(1.0, min_confidence))

    search_kwargs: Dict[str, Any] = {
        "vector_store_id": store_id,
        "query": query,
        "max_num_results": max(1, min(limit, 50)),
        "attribute_filter": attribute_filter,
        "rewrite_query": True,
    }
    if ranking_options:
        search_kwargs["ranking_options"] = ranking_options

    response = await client.vector_stores.search(**search_kwargs)
    response_dict = _as_dict(response)
    results_raw = response_dict.get("data") or []

    results: List[Dict[str, Any]] = []
    for index, raw in enumerate(results_raw):
        entry = _as_dict(raw)
        attributes = _as_dict(entry.get("attributes"))
        content = _normalise_content(entry.get("content") or [])
        score = entry.get("score")
        try:
            score_value = float(score) if score is not None else None
        except (TypeError, ValueError):  # pragma: no cover - defensive
            score_value = None
        meets_threshold = bool(
            score_value is not None and score_value >= min_confidence
        )
        document_id = attributes.get("document_id") or entry.get("file_id") or entry.get("id")
        document_name = (
            attributes.get("filename")
            or entry.get("filename")
            or attributes.get("title")
            or "Source document"
        )
        chunk_index = attributes.get("chunk_index")
        if chunk_index is None:
            chunk_index = index

        results.append(
            {
                "id": entry.get("id") or f"{document_id}-{index}",
                "documentId": document_id,
                "documentName": document_name,
                "repo": attributes.get("repo") or attributes.get("repo_folder"),
                "chunkIndex": chunk_index,
                "content": content,
                "score": score_value,
                "indexName": store_id,
                "meetsThreshold": meets_threshold,
            }
        )

    has_confident = any(item["meetsThreshold"] for item in results)

    meta = {
        "indexes": [
            {
                "name": store_id,
                "embeddingModel": "openai-managed",
                "chunkSize": None,
                "chunkOverlap": None,
            }
        ],
        "reranker": retrieval_config.get("reranker"),
        "minCitationConfidence": min_confidence,
        "requireCitation": retrieval_config.get("require_citation", True),
        "hasConfidentResult": has_confident,
        "fallbackUsed": False,
        "queried": limit,
        "totalCandidates": len(results),
    }

    if response_dict.get("search_query"):
        meta["rewrittenQuery"] = response_dict["search_query"]

    return {
        "results": results[:limit],
        "meta": meta,
    }


async def create_vector_store(
    *,
    name: str,
    file_ids: Optional[List[str]] = None,
    expires_after: Optional[Dict[str, Any]] = None,
    chunking_strategy: Optional[Dict[str, Any]] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Create a new vector store.

    Args:
        name: Name for the vector store
        file_ids: Optional list of file IDs to attach
        expires_after: Optional expiration policy, e.g. {"anchor": "last_active_at", "days": 7}
        chunking_strategy: Optional chunking configuration
        metadata: Optional metadata dictionary

    Returns:
        Dictionary with vector store details
    """
    client = get_openai_client()

    kwargs: Dict[str, Any] = {"name": name}
    if file_ids:
        kwargs["file_ids"] = file_ids
    if expires_after:
        kwargs["expires_after"] = expires_after
    if chunking_strategy:
        kwargs["chunking_strategy"] = chunking_strategy
    if metadata:
        kwargs["metadata"] = metadata

    try:
        result = await client.vector_stores.create(**kwargs)
    except Exception as exc:
        logger.error("openai_retrieval.create_vector_store_failed", error=str(exc))
        raise

    result_dict = _as_dict(result)
    return result_dict


async def retrieve_vector_store(vector_store_id: str) -> Dict[str, Any]:
    """Retrieve a vector store by ID.

    Args:
        vector_store_id: The ID of the vector store

    Returns:
        Dictionary with vector store details
    """
    client = get_openai_client()

    try:
        result = await client.vector_stores.retrieve(vector_store_id)
    except Exception as exc:
        logger.error(
            "openai_retrieval.retrieve_vector_store_failed",
            vector_store_id=vector_store_id,
            error=str(exc),
        )
        raise

    return _as_dict(result)


async def update_vector_store(
    vector_store_id: str,
    *,
    name: Optional[str] = None,
    expires_after: Optional[Dict[str, Any]] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Update a vector store.

    Args:
        vector_store_id: The ID of the vector store
        name: Optional new name
        expires_after: Optional expiration policy
        metadata: Optional metadata to update

    Returns:
        Dictionary with updated vector store details
    """
    client = get_openai_client()

    kwargs: Dict[str, Any] = {}
    if name is not None:
        kwargs["name"] = name
    if expires_after is not None:
        kwargs["expires_after"] = expires_after
    if metadata is not None:
        kwargs["metadata"] = metadata

    try:
        result = await client.vector_stores.update(vector_store_id, **kwargs)
    except Exception as exc:
        logger.error(
            "openai_retrieval.update_vector_store_failed",
            vector_store_id=vector_store_id,
            error=str(exc),
        )
        raise

    return _as_dict(result)


async def delete_vector_store(vector_store_id: str) -> Dict[str, Any]:
    """Delete a vector store.

    Args:
        vector_store_id: The ID of the vector store

    Returns:
        Dictionary with deletion status
    """
    client = get_openai_client()

    try:
        result = await client.vector_stores.delete(vector_store_id)
    except Exception as exc:
        logger.error(
            "openai_retrieval.delete_vector_store_failed",
            vector_store_id=vector_store_id,
            error=str(exc),
        )
        raise

    return _as_dict(result)


async def list_vector_stores(
    *,
    limit: int = 20,
    order: str = "desc",
    after: Optional[str] = None,
    before: Optional[str] = None,
) -> Dict[str, Any]:
    """List vector stores.

    Args:
        limit: Number of stores to return (max 100)
        order: Sort order ("asc" or "desc")
        after: Cursor for pagination
        before: Cursor for pagination

    Returns:
        Dictionary with list of vector stores and pagination info
    """
    client = get_openai_client()

    kwargs: Dict[str, Any] = {"limit": max(1, min(limit, 100)), "order": order}
    if after:
        kwargs["after"] = after
    if before:
        kwargs["before"] = before

    try:
        result = await client.vector_stores.list(**kwargs)
    except Exception as exc:
        logger.error("openai_retrieval.list_vector_stores_failed", error=str(exc))
        raise

    return _as_dict(result)


async def create_vector_store_file(
    vector_store_id: str,
    file_id: str,
    *,
    attributes: Optional[Dict[str, Any]] = None,
    chunking_strategy: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Create a vector store file (attach a file to a vector store).

    Args:
        vector_store_id: The ID of the vector store
        file_id: The ID of the file to attach
        attributes: Optional attributes for filtering
        chunking_strategy: Optional chunking configuration

    Returns:
        Dictionary with vector store file details
    """
    client = get_openai_client()

    kwargs: Dict[str, Any] = {"file_id": file_id}
    if attributes:
        kwargs["attributes"] = attributes
    if chunking_strategy:
        kwargs["chunking_strategy"] = chunking_strategy

    try:
        result = await client.vector_stores.files.create(vector_store_id, **kwargs)
    except Exception as exc:
        logger.error(
            "openai_retrieval.create_vector_store_file_failed",
            vector_store_id=vector_store_id,
            file_id=file_id,
            error=str(exc),
        )
        raise

    return _as_dict(result)


async def create_and_poll_vector_store_file(
    vector_store_id: str,
    file_id: str,
    *,
    attributes: Optional[Dict[str, Any]] = None,
    chunking_strategy: Optional[Dict[str, Any]] = None,
    poll_interval_ms: int = 1000,
) -> Dict[str, Any]:
    """Create a vector store file and poll until processing completes.

    Args:
        vector_store_id: The ID of the vector store
        file_id: The ID of the file to attach
        attributes: Optional attributes for filtering
        chunking_strategy: Optional chunking configuration
        poll_interval_ms: Polling interval in milliseconds

    Returns:
        Dictionary with vector store file details
    """
    client = get_openai_client()

    kwargs: Dict[str, Any] = {"file_id": file_id}
    if attributes:
        kwargs["attributes"] = attributes
    if chunking_strategy:
        kwargs["chunking_strategy"] = chunking_strategy

    try:
        result = await client.vector_stores.files.create_and_poll(
            vector_store_id, poll_interval_ms=poll_interval_ms, **kwargs
        )
    except Exception as exc:
        logger.error(
            "openai_retrieval.create_and_poll_vector_store_file_failed",
            vector_store_id=vector_store_id,
            file_id=file_id,
            error=str(exc),
        )
        raise

    return _as_dict(result)


async def retrieve_vector_store_file(
    vector_store_id: str, file_id: str
) -> Dict[str, Any]:
    """Retrieve a vector store file.

    Args:
        vector_store_id: The ID of the vector store
        file_id: The ID of the file

    Returns:
        Dictionary with vector store file details
    """
    client = get_openai_client()

    try:
        result = await client.vector_stores.files.retrieve(vector_store_id, file_id)
    except Exception as exc:
        logger.error(
            "openai_retrieval.retrieve_vector_store_file_failed",
            vector_store_id=vector_store_id,
            file_id=file_id,
            error=str(exc),
        )
        raise

    return _as_dict(result)


async def update_vector_store_file(
    vector_store_id: str,
    file_id: str,
    *,
    attributes: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Update a vector store file's attributes.

    Args:
        vector_store_id: The ID of the vector store
        file_id: The ID of the file
        attributes: Attributes to update

    Returns:
        Dictionary with updated vector store file details
    """
    client = get_openai_client()

    kwargs: Dict[str, Any] = {}
    if attributes is not None:
        kwargs["attributes"] = attributes

    try:
        result = await client.vector_stores.files.update(
            vector_store_id, file_id, **kwargs
        )
    except Exception as exc:
        logger.error(
            "openai_retrieval.update_vector_store_file_failed",
            vector_store_id=vector_store_id,
            file_id=file_id,
            error=str(exc),
        )
        raise

    return _as_dict(result)


async def delete_vector_store_file(
    vector_store_id: str, file_id: str
) -> Dict[str, Any]:
    """Delete a vector store file.

    Args:
        vector_store_id: The ID of the vector store
        file_id: The ID of the file

    Returns:
        Dictionary with deletion status
    """
    client = get_openai_client()

    try:
        result = await client.vector_stores.files.delete(vector_store_id, file_id)
    except Exception as exc:
        logger.error(
            "openai_retrieval.delete_vector_store_file_failed",
            vector_store_id=vector_store_id,
            file_id=file_id,
            error=str(exc),
        )
        raise

    return _as_dict(result)


async def list_vector_store_files(
    vector_store_id: str,
    *,
    limit: int = 20,
    order: str = "desc",
    after: Optional[str] = None,
    before: Optional[str] = None,
    filter_status: Optional[str] = None,
) -> Dict[str, Any]:
    """List files in a vector store.

    Args:
        vector_store_id: The ID of the vector store
        limit: Number of files to return (max 100)
        order: Sort order ("asc" or "desc")
        after: Cursor for pagination
        before: Cursor for pagination
        filter_status: Optional status filter (e.g., "completed", "in_progress", "failed")

    Returns:
        Dictionary with list of files and pagination info
    """
    client = get_openai_client()

    kwargs: Dict[str, Any] = {"limit": max(1, min(limit, 100)), "order": order}
    if after:
        kwargs["after"] = after
    if before:
        kwargs["before"] = before
    if filter_status:
        kwargs["filter"] = filter_status

    try:
        result = await client.vector_stores.files.list(vector_store_id, **kwargs)
    except Exception as exc:
        logger.error(
            "openai_retrieval.list_vector_store_files_failed",
            vector_store_id=vector_store_id,
            error=str(exc),
        )
        raise

    return _as_dict(result)


async def create_file_batch(
    vector_store_id: str,
    *,
    file_ids: Optional[List[str]] = None,
    files: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """Create a batch of files in a vector store.

    Args:
        vector_store_id: The ID of the vector store
        file_ids: Optional list of file IDs (mutually exclusive with files)
        files: Optional list of file objects with file_id, attributes, and chunking_strategy

    Returns:
        Dictionary with batch details
    """
    client = get_openai_client()

    kwargs: Dict[str, Any] = {}
    if file_ids:
        kwargs["file_ids"] = file_ids
    elif files:
        kwargs["files"] = files
    else:
        raise ValueError("Either file_ids or files must be provided")

    try:
        result = await client.vector_stores.file_batches.create(
            vector_store_id, **kwargs
        )
    except Exception as exc:
        logger.error(
            "openai_retrieval.create_file_batch_failed",
            vector_store_id=vector_store_id,
            error=str(exc),
        )
        raise

    return _as_dict(result)


async def create_and_poll_file_batch(
    vector_store_id: str,
    *,
    file_ids: Optional[List[str]] = None,
    files: Optional[List[Dict[str, Any]]] = None,
    poll_interval_ms: int = 1000,
) -> Dict[str, Any]:
    """Create a batch of files and poll until processing completes.

    Args:
        vector_store_id: The ID of the vector store
        file_ids: Optional list of file IDs (mutually exclusive with files)
        files: Optional list of file objects with file_id, attributes, and chunking_strategy
        poll_interval_ms: Polling interval in milliseconds

    Returns:
        Dictionary with batch details
    """
    client = get_openai_client()

    kwargs: Dict[str, Any] = {}
    if file_ids:
        kwargs["file_ids"] = file_ids
    elif files:
        kwargs["files"] = files
    else:
        raise ValueError("Either file_ids or files must be provided")

    try:
        result = await client.vector_stores.file_batches.create_and_poll(
            vector_store_id, poll_interval_ms=poll_interval_ms, **kwargs
        )
    except Exception as exc:
        logger.error(
            "openai_retrieval.create_and_poll_file_batch_failed",
            vector_store_id=vector_store_id,
            error=str(exc),
        )
        raise

    return _as_dict(result)


async def retrieve_file_batch(
    vector_store_id: str, batch_id: str
) -> Dict[str, Any]:
    """Retrieve a file batch.

    Args:
        vector_store_id: The ID of the vector store
        batch_id: The ID of the batch

    Returns:
        Dictionary with batch details
    """
    client = get_openai_client()

    try:
        result = await client.vector_stores.file_batches.retrieve(
            vector_store_id, batch_id
        )
    except Exception as exc:
        logger.error(
            "openai_retrieval.retrieve_file_batch_failed",
            vector_store_id=vector_store_id,
            batch_id=batch_id,
            error=str(exc),
        )
        raise

    return _as_dict(result)


async def cancel_file_batch(vector_store_id: str, batch_id: str) -> Dict[str, Any]:
    """Cancel a file batch.

    Args:
        vector_store_id: The ID of the vector store
        batch_id: The ID of the batch

    Returns:
        Dictionary with cancellation status
    """
    client = get_openai_client()

    try:
        result = await client.vector_stores.file_batches.cancel(
            vector_store_id, batch_id
        )
    except Exception as exc:
        logger.error(
            "openai_retrieval.cancel_file_batch_failed",
            vector_store_id=vector_store_id,
            batch_id=batch_id,
            error=str(exc),
        )
        raise

    return _as_dict(result)


async def list_files_in_batch(
    vector_store_id: str,
    batch_id: str,
    *,
    limit: int = 20,
    order: str = "desc",
    after: Optional[str] = None,
    before: Optional[str] = None,
    filter_status: Optional[str] = None,
) -> Dict[str, Any]:
    """List files in a batch.

    Args:
        vector_store_id: The ID of the vector store
        batch_id: The ID of the batch
        limit: Number of files to return (max 100)
        order: Sort order ("asc" or "desc")
        after: Cursor for pagination
        before: Cursor for pagination
        filter_status: Optional status filter

    Returns:
        Dictionary with list of files and pagination info
    """
    client = get_openai_client()

    kwargs: Dict[str, Any] = {"limit": max(1, min(limit, 100)), "order": order}
    if after:
        kwargs["after"] = after
    if before:
        kwargs["before"] = before
    if filter_status:
        kwargs["filter"] = filter_status

    try:
        result = await client.vector_stores.file_batches.list_files(
            vector_store_id, batch_id, **kwargs
        )
    except Exception as exc:
        logger.error(
            "openai_retrieval.list_files_in_batch_failed",
            vector_store_id=vector_store_id,
            batch_id=batch_id,
            error=str(exc),
        )
        raise

    return _as_dict(result)


__all__ = [
    "ingest_document",
    "is_enabled",
    "search",
    "reset_cache",
    "create_vector_store",
    "retrieve_vector_store",
    "update_vector_store",
    "delete_vector_store",
    "list_vector_stores",
    "create_vector_store_file",
    "create_and_poll_vector_store_file",
    "retrieve_vector_store_file",
    "update_vector_store_file",
    "delete_vector_store_file",
    "list_vector_store_files",
    "create_file_batch",
    "create_and_poll_file_batch",
    "retrieve_file_batch",
    "cancel_file_batch",
    "list_files_in_batch",
]
