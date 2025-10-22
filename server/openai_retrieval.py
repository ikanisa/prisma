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

from .openai_client import get_openai_client

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


__all__ = ["ingest_document", "is_enabled", "search", "reset_cache"]
