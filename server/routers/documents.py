"""
Documents Router - Document storage and management endpoints
Handles document upload, listing, deletion, and restoration
"""
import hashlib
import mimetypes
from datetime import datetime
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
import structlog

logger = structlog.get_logger()

router = APIRouter(prefix="/v1/storage", tags=["documents"])


# ============================================================================
# Helper Functions (to be imported from main.py or extracted to utils)
# ============================================================================
# TODO: Import these from appropriate modules:
# - require_auth
# - resolve_org_context
# - normalise_role
# - ensure_permission_for_role
# - ensure_org_access_by_id
# - supabase_table_request
# - supabase_request
# - fetch_single_record
# - enforce_rate_limit
# - create_notification
# - sanitize_filename
# - map_document_response
# - get_client_allowed_document_repos
# - iso_now
#
# Constants to import:
# - DOCUMENT_UPLOAD_RATE_LIMIT
# - DOCUMENT_UPLOAD_RATE_WINDOW
# - MAX_UPLOAD_BYTES
# - ALLOWED_DOCUMENT_MIME_TYPES
# - SUPABASE_STORAGE_URL
# - DOCUMENTS_BUCKET


# ============================================================================
# Endpoints
# ============================================================================


@router.get("/documents")
async def list_documents_endpoint(
    org_slug: str = Query(..., alias="orgSlug"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    repo: Optional[str] = Query(default=None),
    state: str = Query("active", alias="state"),
    auth: Dict[str, Any] = Depends(require_auth),  # type: ignore[name-defined]
) -> Dict[str, Any]:
    """
    List documents for an organization with filtering and pagination.
    
    Supports filtering by:
    - repo: Repository folder
    - state: active, archived, or all
    
    CLIENT role users only see portal_visible documents in allowed repos.
    """
    context = await resolve_org_context(auth["sub"], org_slug)  # type: ignore[name-defined]
    role = normalise_role(context.get("role"))  # type: ignore[name-defined]

    state_normalized = (state or "active").lower()
    if state_normalized not in {"active", "archived", "all"}:
        raise HTTPException(status_code=400, detail="invalid state filter")

    params: Dict[str, Any] = {
        "select": (
            "id,org_id,entity_id,repo_folder,name,filename,mime_type,file_size,storage_path,"
            "uploaded_by,classification,deleted,created_at,ocr_status,parse_status,portal_visible,"
            "document_extractions(status,fields,confidence,provenance,updated_at,extractor_name,document_type),"
            "document_quarantine(status,reason,created_at)"
        ),
        "org_id": f"eq.{context['org_id']}",
        "order": "created_at.desc",
        "limit": str(limit),
        "offset": str(offset),
    }

    params["document_extractions.order"] = "created_at.desc"
    params["document_extractions.limit"] = "1"
    params["document_quarantine.order"] = "created_at.desc"
    params["document_quarantine.limit"] = "1"

    if state_normalized == "archived":
        params["deleted"] = "eq.true"
    elif state_normalized == "active":
        params["deleted"] = "eq.false"

    repo_value = (repo or "").strip() or None
    if role == "CLIENT":
        ensure_permission_for_role(role, "documents.view_client")  # type: ignore[name-defined]
        allowed_repos = get_client_allowed_document_repos() or ["03_Accounting/PBC"]  # type: ignore[name-defined]
        if repo_value and repo_value not in allowed_repos:
            raise HTTPException(status_code=403, detail="forbidden")
        scoped_repos = allowed_repos if repo_value is None else [repo_value]
        if len(scoped_repos) == 1:
            params["repo_folder"] = f"eq.{scoped_repos[0]}"
        else:
            params["repo_folder"] = f"in.({','.join(scoped_repos)})"
        params["portal_visible"] = "eq.true"
    else:
        ensure_permission_for_role(role, "documents.view_internal")  # type: ignore[name-defined]
        if repo_value:
            params["repo_folder"] = f"eq.{repo_value}"

    response = await supabase_table_request("GET", "documents", params=params)  # type: ignore[name-defined]
    if response.status_code != 200:
        logger.error("documents.list_failed", status=response.status_code, body=response.text)
        raise HTTPException(status_code=502, detail="failed to fetch documents")

    rows = response.json()
    return {"documents": [map_document_response(row) for row in rows]}  # type: ignore[name-defined]


@router.post("/documents")
async def upload_document_endpoint(
    file: UploadFile = File(...),
    org_slug_form: str = Form(..., alias="orgSlug"),
    auth: Dict[str, Any] = Depends(require_auth),  # type: ignore[name-defined]
    entity_id: Optional[str] = Form(None, alias="entityId"),
    repo_folder: Optional[str] = Form(None, alias="repoFolder"),
    name_override: Optional[str] = Form(None, alias="name"),
) -> Dict[str, Any]:
    """
    Upload a document to organization storage.
    
    Validates:
    - File size (MAX_UPLOAD_BYTES)
    - MIME type (ALLOWED_DOCUMENT_MIME_TYPES)
    - Rate limiting (DOCUMENT_UPLOAD_RATE_LIMIT)
    - Permissions (documents.upload)
    
    CLIENT role users can only upload to allowed repos.
    Creates notification and seeds extraction pipeline.
    """
    context = await resolve_org_context(auth["sub"], org_slug_form)  # type: ignore[name-defined]
    role = normalise_role(context.get("role"))  # type: ignore[name-defined]

    await enforce_rate_limit(  # type: ignore[name-defined]
        "storage:upload",
        auth["sub"],
        limit=DOCUMENT_UPLOAD_RATE_LIMIT,  # type: ignore[name-defined]
        window=DOCUMENT_UPLOAD_RATE_WINDOW,  # type: ignore[name-defined]
    )

    payload = await file.read()
    if not payload:
        raise HTTPException(status_code=400, detail="empty file upload")
    if len(payload) > MAX_UPLOAD_BYTES:  # type: ignore[name-defined]
        raise HTTPException(status_code=413, detail="file too large")

    mime_type = file.content_type or mimetypes.guess_type(file.filename or "")[0] or "application/octet-stream"
    if mime_type not in ALLOWED_DOCUMENT_MIME_TYPES:  # type: ignore[name-defined]
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="unsupported document type")

    ensure_permission_for_role(role, "documents.upload")  # type: ignore[name-defined]

    if role == "CLIENT":
        allowed_repos = get_client_allowed_document_repos()  # type: ignore[name-defined]
        default_repo = allowed_repos[0] if allowed_repos else "03_Accounting/PBC"
        target_repo = (repo_folder or default_repo).strip() or default_repo
        if target_repo not in allowed_repos:
            raise HTTPException(status_code=403, detail="forbidden")
        repo_value = target_repo
    else:
        repo_value = (repo_folder or "99_Other").strip() or "99_Other"
    repo_value = repo_value.replace(" ", "_")
    entity_segment = (entity_id or "general").strip() or "general"
    timestamp = datetime.utcnow().strftime("%Y%m%dT%H%M%S")
    display_name = (name_override or file.filename or "document").strip()
    sanitized_name = sanitize_filename(display_name)  # type: ignore[name-defined]
    storage_path = f"org-{context['org_id']}/docs/{entity_segment}/{repo_value}/{timestamp}_{sanitized_name}"

    upload_headers = {
        "Content-Type": mime_type,
        "x-upsert": "false",
    }

    upload_response = await supabase_request(  # type: ignore[name-defined]
        "POST",
        f"{SUPABASE_STORAGE_URL}/object/{DOCUMENTS_BUCKET}/{storage_path}",  # type: ignore[name-defined]
        content=payload,
        headers=upload_headers,
    )

    if upload_response.status_code not in (200, 201):
        logger.error("documents.upload_failed", status=upload_response.status_code, body=upload_response.text)
        raise HTTPException(status_code=502, detail="failed to store document")

    checksum = hashlib.sha256(payload).hexdigest()

    portal_visible = repo_value in get_client_allowed_document_repos()  # type: ignore[name-defined]

    document_payload = {
        "org_id": context["org_id"],
        "entity_id": entity_id,
        "repo_folder": repo_value,
        "name": display_name,
        "filename": sanitized_name,
        "mime_type": mime_type,
        "file_size": len(payload),
        "storage_path": storage_path,
        "uploaded_by": auth["sub"],
        "checksum": checksum,
        "portal_visible": portal_visible,
    }

    response = await supabase_table_request(  # type: ignore[name-defined]
        "POST",
        "documents",
        json=document_payload,
        headers={"Prefer": "return=representation"},
    )

    if response.status_code not in (200, 201):
        logger.error("documents.record_create_failed", status=response.status_code, body=response.text)
        raise HTTPException(status_code=502, detail="failed to record document")

    rows = response.json()
    document_row = rows[0] if rows else document_payload

    await create_notification(  # type: ignore[name-defined]
        org_id=context["org_id"],
        user_id=auth["sub"],
        kind="DOC",
        title=f"Uploaded document: {display_name}",
        body=f"Stored in {repo_value}",
    )

    try:
        await supabase_table_request(  # type: ignore[name-defined]
            "POST",
            "document_extractions",
            json={
                "document_id": document_row.get("id"),
                "extractor_name": "baseline_pipeline",
                "extractor_version": "v1",
                "status": "PENDING",
            },
            headers={"Prefer": "return=minimal"},
        )
    except Exception as exc:  # pragma: no cover
        logger.warning("documents.extraction_seed_failed", error=str(exc))

    return {"document": map_document_response(document_row)}  # type: ignore[name-defined]


@router.delete("/documents/{document_id}")
async def delete_document_endpoint(
    document_id: str,
    auth: Dict[str, Any] = Depends(require_auth),  # type: ignore[name-defined]
) -> Dict[str, str]:
    """
    Soft delete a document (archive it).
    Sets deleted=true flag rather than physically removing the document.
    Requires documents.upload permission.
    """
    document = await fetch_single_record("documents", document_id)  # type: ignore[name-defined]
    if not document or document.get("deleted"):
        raise HTTPException(status_code=404, detail="document not found")

    role = normalise_role(await ensure_org_access_by_id(auth["sub"], document["org_id"]))  # type: ignore[name-defined]
    ensure_permission_for_role(role, "documents.upload")  # type: ignore[name-defined]

    response = await supabase_table_request(  # type: ignore[name-defined]
        "PATCH",
        "documents",
        params={"id": f"eq.{document_id}"},
        json={"deleted": True, "updated_at": iso_now()},  # type: ignore[name-defined]
        headers={"Prefer": "return=minimal"},
    )

    if response.status_code not in (200, 204):
        logger.error("documents.delete_failed", status=response.status_code, body=response.text)
        raise HTTPException(status_code=502, detail="failed to delete document")

    await create_notification(  # type: ignore[name-defined]
        org_id=document["org_id"],
        user_id=document.get("uploaded_by"),
        kind="DOC",
        title=f"Document archived: {document.get('name')}",
        body="Marked as deleted",
    )

    return {"status": "ok"}


@router.post("/documents/{document_id}/restore")
async def restore_document_endpoint(
    document_id: str,
    auth: Dict[str, Any] = Depends(require_auth),  # type: ignore[name-defined]
) -> Dict[str, str]:
    """
    Restore a soft-deleted document.
    Sets deleted=false to unarchive the document.
    Requires documents.upload permission.
    """
    document = await fetch_single_record("documents", document_id)  # type: ignore[name-defined]
    if not document or not document.get("deleted"):
        raise HTTPException(status_code=404, detail="archived document not found")

    role = normalise_role(await ensure_org_access_by_id(auth["sub"], document["org_id"]))  # type: ignore[name-defined]
    ensure_permission_for_role(role, "documents.upload")  # type: ignore[name-defined]

    response = await supabase_table_request(  # type: ignore[name-defined]
        "PATCH",
        "documents",
        params={"id": f"eq.{document_id}"},
        json={"deleted": False, "updated_at": iso_now()},  # type: ignore[name-defined]
        headers={"Prefer": "return=minimal"},
    )

    if response.status_code not in (200, 204):
        logger.error("documents.restore_failed", status=response.status_code, body=response.text)
        raise HTTPException(status_code=502, detail="failed to restore document")

    await create_notification(  # type: ignore[name-defined]
        org_id=document["org_id"],
        user_id=document.get("uploaded_by"),
        kind="DOC",
        title=f"Document restored: {document.get('name')}",
        body="Unarchived from deleted state",
    )

    return {"status": "ok"}
