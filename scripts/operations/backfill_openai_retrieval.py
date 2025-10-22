#!/usr/bin/env python3
"""Upload existing Supabase documents into the managed OpenAI vector store.

The script mirrors the FastAPI ingestion flow: it enumerates active
``documents`` rows from Supabase storage, downloads the original PDF payload,
then calls :func:`server.openai_retrieval.ingest_document` so the managed
Retrieval index stays in sync with pgvector.

Environment variables:
    SUPABASE_URL: Base URL for the Supabase project (required).
    SUPABASE_SERVICE_ROLE_KEY: Service key with storage + table access (required).
    SUPABASE_DOCUMENTS_BUCKET: Storage bucket name (default ``documents``).
    OPENAI_RETRIEVAL_VECTOR_STORE_ID or OPENAI_RETRIEVAL_VECTOR_STORE_NAME: identifies the target vector store.
    OPENAI_API_KEY (plus optional OPENAI_BASE_URL / OPENAI_ORG_ID): credentials for the OpenAI client.
    OPENAI_RETRIEVAL_BACKFILL_BATCH_SIZE: Number of rows to fetch per page (default ``50``).
    OPENAI_RETRIEVAL_BACKFILL_CONCURRENCY: Number of concurrent uploads (default ``3``).
    OPENAI_RETRIEVAL_BACKFILL_ORG_ID: Optional org scope to limit the migration.

Usage::

    python -m scripts.operations.backfill_openai_retrieval
"""
from __future__ import annotations

import asyncio
import os
import sys
from typing import Any, Dict, Iterable, List, Optional, Tuple
from urllib.parse import quote

import httpx
import structlog

from server import openai_retrieval

logger = structlog.get_logger("openai_backfill")

ALLOWED_MIME_TYPES = {"application/pdf"}
DEFAULT_BATCH_SIZE = 50
DEFAULT_CONCURRENCY = 3
HTTP_TIMEOUT_SECONDS = 30.0


def _require_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"{name} must be set")
    return value


def should_skip_document(row: Dict[str, Any]) -> Optional[str]:
    """Return a reason string when the row should not be uploaded."""

    if row.get("deleted"):
        return "deleted"
    storage_path = (row.get("storage_path") or "").strip()
    if not storage_path:
        return "missing_storage_path"
    mime_type = (row.get("mime_type") or "").lower()
    if mime_type and mime_type not in ALLOWED_MIME_TYPES:
        return f"unsupported_mime:{mime_type}"
    file_size = row.get("file_size")
    if isinstance(file_size, (int, float)) and file_size <= 0:
        return "empty_file"
    return None


def build_filename(row: Dict[str, Any]) -> str:
    """Choose the filename that will appear inside the vector store."""

    candidates: Iterable[Optional[str]] = (
        row.get("filename"),
        row.get("name"),
        f"{row.get('id', 'document')}.pdf",
    )
    for candidate in candidates:
        if candidate:
            return str(candidate)
    return "document.pdf"


def build_extra_attributes(row: Dict[str, Any]) -> Dict[str, Any]:
    """Prepare metadata for vector store filtering and observability."""

    attributes: Dict[str, Any] = {"source": "pgvector_backfill_v1"}
    mapping = {
        "repo_folder": "repo_folder",
        "entity_id": "entity_id",
        "uploaded_by": "uploaded_by",
    }
    for key, attr_key in mapping.items():
        value = row.get(key)
        if value not in (None, ""):
            attributes[attr_key] = str(value)
    file_size = row.get("file_size")
    if file_size not in (None, ""):
        attributes["file_size"] = str(file_size)
    created_at = row.get("created_at") or row.get("uploaded_at")
    if created_at:
        attributes["created_at"] = str(created_at)
    return attributes


def _encode_path(path: str) -> str:
    parts = [quote(segment, safe="") for segment in path.split("/") if segment]
    return "/".join(parts)


async def fetch_documents(
    client: httpx.AsyncClient,
    *,
    rest_url: str,
    headers: Dict[str, str],
    batch_size: int,
    offset: int,
    org_id: Optional[str] = None,
) -> Tuple[List[Dict[str, Any]], Optional[int]]:
    params: Dict[str, str] = {
        "select": (
            "id,org_id,name,filename,mime_type,storage_path,repo_folder,entity_id,uploaded_by,"
            "file_size,created_at,deleted"
        ),
        "deleted": "eq.false",
        "storage_path": "not.is.null",
        "order": "created_at.asc",
        "limit": str(batch_size),
        "offset": str(offset),
    }
    if org_id:
        params["org_id"] = f"eq.{org_id}"
    request_headers = dict(headers)
    request_headers["Prefer"] = "count=exact"

    response = await client.get(f"{rest_url}/documents", params=params, headers=request_headers)
    if response.status_code != 200:
        raise RuntimeError(
            f"Failed to list documents: {response.status_code} {response.text[:200]}"
        )

    total: Optional[int] = None
    content_range = response.headers.get("content-range")
    if content_range and "/" in content_range:
        try:
            total = int(content_range.split("/")[-1])
        except (ValueError, TypeError):  # pragma: no cover - defensive
            total = None
    rows = response.json()
    if not isinstance(rows, list):
        raise RuntimeError("Unexpected Supabase payload")
    return rows, total


async def download_document(
    client: httpx.AsyncClient,
    *,
    storage_url: str,
    headers: Dict[str, str],
    bucket: str,
    storage_path: str,
) -> bytes:
    encoded_path = _encode_path(storage_path)
    url = f"{storage_url}/object/{bucket}/{encoded_path}"
    response = await client.get(url, headers=headers)
    if response.status_code != 200:
        raise RuntimeError(
            f"Failed to download {storage_path}: {response.status_code} {response.text[:200]}"
        )
    return response.content


async def process_document(
    row: Dict[str, Any],
    *,
    storage_bytes: bytes,
) -> Optional[Dict[str, Any]]:
    filename = build_filename(row)
    mime_type = row.get("mime_type") or "application/pdf"
    extra_attributes = build_extra_attributes(row)
    return await openai_retrieval.ingest_document(
        org_id=row["org_id"],
        data=storage_bytes,
        filename=filename,
        mime_type=mime_type,
        document_id=row["id"],
        extra_attributes=extra_attributes,
    )


async def backfill_documents() -> int:
    supabase_url = _require_env("SUPABASE_URL")
    service_role_key = _require_env("SUPABASE_SERVICE_ROLE_KEY")
    bucket = os.getenv("SUPABASE_DOCUMENTS_BUCKET", "documents")
    batch_size = int(os.getenv("OPENAI_RETRIEVAL_BACKFILL_BATCH_SIZE", str(DEFAULT_BATCH_SIZE)))
    concurrency = int(os.getenv("OPENAI_RETRIEVAL_BACKFILL_CONCURRENCY", str(DEFAULT_CONCURRENCY)))
    org_scope = os.getenv("OPENAI_RETRIEVAL_BACKFILL_ORG_ID")

    openai_retrieval.reset_cache()
    if not openai_retrieval.is_enabled():
        raise RuntimeError("Managed Retrieval is not enabled; set vector store id or name first")

    rest_url = supabase_url.rstrip("/") + "/rest/v1"
    storage_url = supabase_url.rstrip("/") + "/storage/v1"
    headers = {
        "apikey": service_role_key,
        "Authorization": f"Bearer {service_role_key}",
        "Accept": "application/json",
    }

    stats = {"processed": 0, "uploaded": 0, "skipped": 0, "failed": 0}
    offset = 0
    total: Optional[int] = None

    semaphore = asyncio.Semaphore(max(1, concurrency))

    async with httpx.AsyncClient(timeout=HTTP_TIMEOUT_SECONDS) as client:
        while True:
            rows, reported_total = await fetch_documents(
                client,
                rest_url=rest_url,
                headers=headers,
                batch_size=batch_size,
                offset=offset,
                org_id=org_scope,
            )
            if reported_total is not None:
                total = reported_total
            if not rows:
                break

            async def handle_row(row: Dict[str, Any]) -> None:
                nonlocal stats
                async with semaphore:
                    stats["processed"] += 1
                    reason = should_skip_document(row)
                    if reason:
                        stats["skipped"] += 1
                        logger.info(
                            "openai_backfill.skip",
                            document_id=row.get("id"),
                            org_id=row.get("org_id"),
                            reason=reason,
                        )
                        return
                    try:
                        payload = await download_document(
                            client,
                            storage_url=storage_url,
                            headers=headers,
                            bucket=bucket,
                            storage_path=row["storage_path"],
                        )
                    except Exception as exc:  # pragma: no cover - network failure
                        stats["failed"] += 1
                        logger.error(
                            "openai_backfill.download_failed",
                            document_id=row.get("id"),
                            org_id=row.get("org_id"),
                            error=str(exc),
                        )
                        return

                    try:
                        result = await process_document(row, storage_bytes=payload)
                    except Exception as exc:  # pragma: no cover - network failure
                        stats["failed"] += 1
                        logger.error(
                            "openai_backfill.upload_failed",
                            document_id=row.get("id"),
                            org_id=row.get("org_id"),
                            error=str(exc),
                        )
                        return

                    if result:
                        stats["uploaded"] += 1
                        logger.info(
                            "openai_backfill.uploaded",
                            document_id=row.get("id"),
                            org_id=row.get("org_id"),
                            vector_store_id=result.get("vectorStoreId"),
                            file_id=result.get("fileId"),
                        )
                    else:
                        # Retrieval disabled mid-run; treat as skip so we don't loop forever.
                        stats["skipped"] += 1
                        logger.warning(
                            "openai_backfill.noop",
                            document_id=row.get("id"),
                            org_id=row.get("org_id"),
                        )

            await asyncio.gather(*(handle_row(row) for row in rows))
            offset += len(rows)
            logger.info(
                "openai_backfill.progress",
                processed=stats["processed"],
                uploaded=stats["uploaded"],
                skipped=stats["skipped"],
                failed=stats["failed"],
                total=total,
            )

    logger.info("openai_backfill.complete", **stats, total=total)
    return 0 if stats["failed"] == 0 else 2


def main() -> int:
    try:
        return asyncio.run(backfill_documents())
    except KeyboardInterrupt:  # pragma: no cover - manual interruption
        logger.warning("openai_backfill.interrupted")
        return 130
    except Exception as exc:
        logger.error("openai_backfill.error", error=str(exc))
        return 1


if __name__ == "__main__":
    sys.exit(main())
