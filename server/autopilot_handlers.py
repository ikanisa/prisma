from __future__ import annotations

from typing import Any, Callable, Dict, List


async def handle_extract_documents(
    job: Dict[str, Any],
    *,
    supabase_table_request: Callable[..., Any],
    iso_now: Callable[[], str],
    logger: Any,
    batch_limit: int,
) -> Dict[str, Any]:
    org_id = job.get("org_id")
    if not org_id:
        return {"processed": 0, "message": "Missing organisation context", "document_ids": []}

    payload = job.get("payload") or {}
    limit_value = payload.get("limit") or batch_limit
    try:
        limit = max(1, int(limit_value))
    except (TypeError, ValueError):
        limit = batch_limit

    params = {
        "select": "id,document_id,fields,provenance,documents:documents!inner(id,org_id,name)",
        "documents.org_id": f"eq.{org_id}",
        "status": "eq.PENDING",
        "order": "created_at.asc",
        "limit": str(limit),
    }
    response = await supabase_table_request("GET", "document_extractions", params=params)
    if response.status_code != 200:
        logger.error(
            "autopilot.extract.fetch_failed",
            status=response.status_code,
            body=response.text,
        )
        return {"processed": 0, "message": "Failed to load pending document extractions", "document_ids": []}

    rows = response.json()
    if not rows:
        return {"processed": 0, "message": "No pending document extractions", "document_ids": []}

    processed_documents: List[Dict[str, Any]] = []
    document_ids: List[str] = []
    now = iso_now()

    for row in rows:
        extraction_id = row.get("id")
        document_ref = row.get("document_id") or row.get("documents", {}).get("id")

        await supabase_table_request(
            "PATCH",
            "document_extractions",
            params={"id": f"eq.{extraction_id}"},
            json={"status": "RUNNING", "updated_at": now},
            headers={"Prefer": "return=minimal"},
        )

        fields = row.get("fields") if isinstance(row.get("fields"), dict) else {}
        provenance = row.get("provenance") if isinstance(row.get("provenance"), list) else []
        provenance.append({"source": "autopilot", "jobId": job.get("id"), "timestamp": now})

        await supabase_table_request(
            "PATCH",
            "document_extractions",
            params={"id": f"eq.{extraction_id}"},
            json={
                "status": "DONE",
                "updated_at": now,
                "fields": {**fields, "autopilotProcessedAt": now},
                "provenance": provenance,
            },
            headers={"Prefer": "return=minimal"},
        )

        if document_ref:
            await supabase_table_request(
                "PATCH",
                "documents",
                params={"id": f"eq.{document_ref}"},
                json={
                    "parse_status": "DONE",
                    "ocr_status": "DONE",
                    "updated_at": now,
                },
                headers={"Prefer": "return=minimal"},
            )
            document_ids.append(str(document_ref))
            processed_documents.append(
                {
                    "id": str(document_ref),
                    "name": row.get("documents", {}).get("name"),
                }
            )

    return {
        "processed": len(processed_documents),
        "document_ids": document_ids,
        "documents": processed_documents,
    }
