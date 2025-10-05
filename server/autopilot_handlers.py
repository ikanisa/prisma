from __future__ import annotations

from typing import Any, Callable, Dict, List, Optional

from .document_ai import (
    DocumentAIError,
    DocumentAIPipeline,
    create_document_ai_pipeline,
)


async def handle_extract_documents(
    job: Dict[str, Any],
    *,
    supabase_table_request: Callable[..., Any],
    iso_now: Callable[[], str],
    logger: Any,
    batch_limit: int,
    pipeline: Optional[DocumentAIPipeline] = None,
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

    pipeline = pipeline or create_document_ai_pipeline(
        supabase_table_request=supabase_table_request,
        logger=logger,
        iso_now=iso_now,
    )

    params = {
        "select": "id,document_id,fields,provenance,confidence,document_type,documents:documents!inner(id,org_id,name,classification,storage_path,mime_type,ocr_status,parse_status)",
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
    failed_documents: List[Dict[str, Any]] = []
    document_ids: List[str] = []
    now = iso_now()

    for row in rows:
        extraction_id = row.get("id")
        document_ref = row.get("document_id") or row.get("documents", {}).get("id")

        try:
            context = pipeline.prepare_context(row)
        except DocumentAIError as exc:
            logger.error("document_ai.context_failed", extraction_id=extraction_id, error=str(exc))
            await supabase_table_request(
                "PATCH",
                "document_extractions",
                params={"id": f"eq.{extraction_id}"},
                json={"status": "FAILED", "updated_at": now},
                headers={"Prefer": "return=minimal"},
            )
            failed_documents.append({"id": document_ref or "unknown", "reason": str(exc)})
            continue

        await supabase_table_request(
            "PATCH",
            "document_extractions",
            params={"id": f"eq.{extraction_id}"},
            json={"status": "RUNNING", "updated_at": now},
            headers={"Prefer": "return=minimal"},
        )

        try:
            context, result = await pipeline.process(row, context=context)
        except DocumentAIError as exc:
            reason = str(exc)
            provenance = row.get("provenance") if isinstance(row.get("provenance"), list) else []
            provenance = list(provenance)
            provenance.append({"source": "autopilot", "jobId": job.get("id"), "timestamp": now})
            await supabase_table_request(
                "PATCH",
                "document_extractions",
                params={"id": f"eq.{extraction_id}"},
                json={
                    "status": "FAILED",
                    "updated_at": now,
                    "provenance": provenance,
                    "document_type": context.classification,
                },
                headers={"Prefer": "return=minimal"},
            )
            await supabase_table_request(
                "PATCH",
                "documents",
                params={"id": f"eq.{context.document_id}"},
                json={"parse_status": "FAILED", "updated_at": now},
                headers={"Prefer": "return=minimal"},
            )
            await pipeline.record_quarantine(context, extraction_id=extraction_id, reason=reason)
            failed_documents.append({"id": context.document_id, "reason": reason})
            continue

        provenance = list(result.provenance)
        provenance.append({"source": "autopilot", "jobId": job.get("id"), "timestamp": now})
        fields = dict(result.fields)
        fields.setdefault("autopilotProcessedAt", now)

        await supabase_table_request(
            "PATCH",
            "document_extractions",
            params={"id": f"eq.{extraction_id}"},
            json={
                "status": "DONE",
                "updated_at": now,
                "fields": fields,
                "provenance": provenance,
                "confidence": result.confidence,
                "document_type": result.classification,
            },
            headers={"Prefer": "return=minimal"},
        )

        document_update: Dict[str, Any] = {
            "parse_status": "DONE",
            "classification": result.classification,
            "updated_at": now,
        }
        if "ocr" in pipeline.steps:
            document_update["ocr_status"] = "DONE"

        await supabase_table_request(
            "PATCH",
            "documents",
            params={"id": f"eq.{context.document_id}"},
            json=document_update,
            headers={"Prefer": "return=minimal"},
        )

        await pipeline.write_index(context, result)

        document_ids.append(context.document_id)
        processed_documents.append(
            {
                "id": context.document_id,
                "name": context.name,
                "extraction": {
                    "status": "DONE",
                    "fields": fields,
                    "confidence": result.confidence,
                    "provenance": provenance,
                    "classification": result.classification,
                    "summary": result.summary,
                },
            }
        )

    return {
        "processed": len(processed_documents),
        "document_ids": document_ids,
        "documents": processed_documents,
        "failed": failed_documents,
    }
