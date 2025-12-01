"""ADA (Automated Document Analysis) router migrated from server.main."""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
import structlog

from ..analytics_runner import AnalyticsValidationError, run_analytics
from ..deterministic_contract import build_manifest
from ..api_helpers import (
    ensure_org_access_by_id,
    ensure_permission_for_role,
    iso_now,
    log_activity_event,
    normalise_role,
    require_auth,
    supabase_table_request,
)


router = APIRouter(prefix="/api/ada", tags=["documents", "ada"])
logger = structlog.get_logger(__name__)


class AdaRunKind(str, Enum):
    JE = "JE"
    RATIO = "RATIO"
    VARIANCE = "VARIANCE"
    DUPLICATE = "DUPLICATE"
    BENFORD = "BENFORD"


class AdaExceptionDisposition(str, Enum):
    OPEN = "OPEN"
    INVESTIGATING = "INVESTIGATING"
    RESOLVED = "RESOLVED"


class AdaRunRequest(BaseModel):
    orgId: str = Field(..., min_length=1)
    engagementId: str = Field(..., min_length=1)
    userId: str = Field(..., min_length=1)
    datasetRef: str = Field(..., min_length=1)
    kind: AdaRunKind
    params: Dict[str, Any] = Field(default_factory=dict)


class AdaExceptionUpdateRequest(BaseModel):
    orgId: str = Field(..., min_length=1)
    userId: str = Field(..., min_length=1)
    exceptionId: str = Field(..., min_length=1)
    disposition: Optional[AdaExceptionDisposition] = None
    note: Optional[str] = None
    misstatementId: Optional[str] = None


@router.get("/run")
async def list_ada_runs(
    org_id: str = Query(..., alias="orgId"),
    engagement_id: str = Query(..., alias="engagementId"),
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    """List ADA runs for an engagement."""

    role = normalise_role(await ensure_org_access_by_id(auth["sub"], org_id))
    ensure_permission_for_role(role, "audit.analytics.view")

    response = await supabase_table_request(
        "GET",
        "ada_runs",
        params={
            "select": "*, ada_exceptions(*)",
            "org_id": f"eq.{org_id}",
            "engagement_id": f"eq.{engagement_id}",
            "order": "started_at.desc",
        },
    )
    if response.status_code != 200:
        logger.error(
            "analytics.fetch_runs_failed",
            status=response.status_code,
            body=response.text,
            org_id=org_id,
            engagement_id=engagement_id,
        )
        raise HTTPException(status_code=502, detail="failed to load analytics runs")

    runs = response.json() or []
    return {"runs": runs}


@router.post("/run")
async def create_ada_run(
    payload: AdaRunRequest,
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    """Create and execute an ADA analytics run."""

    role = normalise_role(await ensure_org_access_by_id(auth["sub"], payload.orgId))
    ensure_permission_for_role(role, "audit.analytics.run")

    try:
        sanitised_params, dataset_hash, analytics_result = run_analytics(
            payload.kind.value, payload.params
        )
    except AnalyticsValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    run_body = {
        "org_id": payload.orgId,
        "engagement_id": payload.engagementId,
        "kind": payload.kind.value,
        "dataset_ref": payload.datasetRef,
        "dataset_hash": dataset_hash,
        "params": sanitised_params,
        "created_by": payload.userId,
    }

    insert_response = await supabase_table_request(
        "POST",
        "ada_runs",
        json=run_body,
        headers={"Prefer": "return=representation"},
    )
    if insert_response.status_code not in (200, 201):
        logger.error(
            "analytics.run_insert_failed",
            status=insert_response.status_code,
            body=insert_response.text,
            org_id=payload.orgId,
        )
        raise HTTPException(status_code=502, detail="failed to record analytics run")

    rows = insert_response.json() or []
    if not rows:
        raise HTTPException(status_code=502, detail="analytics run insert returned no rows")
    run_row = rows[0]

    await log_activity_event(
        org_id=payload.orgId,
        actor_id=payload.userId,
        action="ADA_RUN_STARTED",
        metadata={
            "runId": run_row.get("id"),
            "kind": payload.kind.value,
            "datasetRef": payload.datasetRef,
            "datasetHash": dataset_hash,
        },
    )

    summary = analytics_result.get("summary") or {}
    if summary.get("datasetHash") != dataset_hash:
        logger.error(
            "analytics.dataset_hash_mismatch",
            expected=dataset_hash,
            summary_hash=summary.get("datasetHash"),
            run_id=run_row.get("id"),
        )
        raise HTTPException(status_code=500, detail="dataset hash mismatch detected")

    exception_rows: List[Dict[str, Any]] = []
    exceptions = analytics_result.get("exceptions") or []
    if exceptions:
        exception_payload = [
            {
                "run_id": run_row.get("id"),
                "record_ref": exc.get("recordRef"),
                "reason": exc.get("reason"),
                "score": exc.get("score"),
                "created_by": payload.userId,
            }
            for exc in exceptions
        ]
        exception_response = await supabase_table_request(
            "POST",
            "ada_exceptions",
            json=exception_payload,
            headers={"Prefer": "return=representation"},
        )
        if exception_response.status_code not in (200, 201):
            logger.error(
                "analytics.exceptions_insert_failed",
                status=exception_response.status_code,
                body=exception_response.text,
                run_id=run_row.get("id"),
            )
            raise HTTPException(status_code=502, detail="failed to record analytics exceptions")
        exception_rows = exception_response.json() or []

    finished_at = iso_now()
    update_response = await supabase_table_request(
        "PATCH",
        "ada_runs",
        params={
            "id": f"eq.{run_row.get('id')}",
            "select": "*, ada_exceptions(*)",
        },
        json={"summary": summary, "finished_at": finished_at},
        headers={"Prefer": "return=representation"},
    )
    if update_response.status_code not in (200, 201):
        logger.error(
            "analytics.run_update_failed",
            status=update_response.status_code,
            body=update_response.text,
            run_id=run_row.get("id"),
        )
        raise HTTPException(status_code=502, detail="failed to finalise analytics run")

    updated_rows = update_response.json() or []
    if not updated_rows:
        raise HTTPException(status_code=502, detail="analytics run update returned no rows")
    updated_run = updated_rows[0]

    await log_activity_event(
        org_id=payload.orgId,
        actor_id=payload.userId,
        action="ADA_RUN_COMPLETED",
        metadata={
            "runId": run_row.get("id"),
            "kind": payload.kind.value,
            "datasetHash": dataset_hash,
            "exceptions": len(exception_rows),
            "totals": summary.get("totals"),
        },
    )
    started_at_raw = run_row.get("started_at")
    duration_seconds: Optional[float] = None
    if isinstance(started_at_raw, str):
        try:
            start_dt = datetime.fromisoformat(started_at_raw)
            finish_dt = datetime.fromisoformat(finished_at)
            duration_seconds = max((finish_dt - start_dt).total_seconds(), 0.0)
        except ValueError:
            duration_seconds = None

    manifest = build_manifest(
        kind=f"analytics.{payload.kind.value.lower()}",
        inputs={
            "orgId": payload.orgId,
            "engagementId": payload.engagementId,
            "datasetRef": payload.datasetRef,
            "params": sanitised_params,
        },
        outputs={"summary": summary},
        metadata={"runId": run_row.get("id")},
    )
    updated_run["manifest"] = manifest

    return {"run": updated_run, "durationSeconds": duration_seconds}


@router.post("/exception/update")
async def update_ada_exception(
    payload: AdaExceptionUpdateRequest,
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    """Update an ADA exception."""

    role = normalise_role(await ensure_org_access_by_id(auth["sub"], payload.orgId))
    ensure_permission_for_role(role, "audit.analytics.exceptions")

    exception_response = await supabase_table_request(
        "GET",
        "ada_exceptions",
        params={
            "id": f"eq.{payload.exceptionId}",
            "select": "id, run_id, disposition, note, misstatement_id",
        },
    )
    if exception_response.status_code != 200:
        logger.error(
            "analytics.exception_lookup_failed",
            status=exception_response.status_code,
            body=exception_response.text,
            exception_id=payload.exceptionId,
        )
        raise HTTPException(status_code=502, detail="failed to load analytics exception")

    exception_rows = exception_response.json() or []
    if not exception_rows:
        raise HTTPException(status_code=404, detail="analytics exception not found")
    exception_row = exception_rows[0]

    run_response = await supabase_table_request(
        "GET",
        "ada_runs",
        params={"id": f"eq.{exception_row.get('run_id')}", "select": "id, org_id, engagement_id"},
    )
    if run_response.status_code != 200:
        logger.error(
            "analytics.exception_run_lookup_failed",
            status=run_response.status_code,
            body=run_response.text,
            run_id=exception_row.get("run_id"),
        )
        raise HTTPException(status_code=502, detail="failed to verify analytics run")

    run_rows = run_response.json() or []
    if not run_rows:
        raise HTTPException(status_code=404, detail="analytics run not found for exception")
    run_row = run_rows[0]
    if str(run_row.get("org_id")) != payload.orgId:
        raise HTTPException(status_code=403, detail="forbidden for analytics exception update")

    updates: Dict[str, Any] = {"updated_by": payload.userId, "updated_at": iso_now()}
    fields_set = getattr(payload, "model_fields_set", getattr(payload, "__fields_set__", set()))
    if "disposition" in fields_set:
        if payload.disposition is None:
            raise HTTPException(status_code=400, detail="disposition must be provided when included")
        updates["disposition"] = payload.disposition.value
    if "note" in fields_set:
        updates["note"] = payload.note
    if "misstatementId" in fields_set:
        updates["misstatement_id"] = payload.misstatementId

    update_response = await supabase_table_request(
        "PATCH",
        "ada_exceptions",
        params={
            "id": f"eq.{payload.exceptionId}",
            "select": "*, ada_runs!inner(org_id, engagement_id)",
        },
        json=updates,
        headers={"Prefer": "return=representation"},
    )
    if update_response.status_code not in (200, 201):
        logger.error(
            "analytics.exception_update_failed",
            status=update_response.status_code,
            body=update_response.text,
            exception_id=payload.exceptionId,
        )
        raise HTTPException(status_code=502, detail="failed to update analytics exception")

    update_rows = update_response.json() or []
    if not update_rows:
        raise HTTPException(status_code=502, detail="analytics exception update returned no rows")
    updated_exception = update_rows[0]

    if updated_exception.get("disposition") == AdaExceptionDisposition.RESOLVED.value:
        await log_activity_event(
            org_id=payload.orgId,
            actor_id=payload.userId,
            action="ADA_EXCEPTION_RESOLVED",
            metadata={
                "runId": run_row.get("id"),
                "exceptionId": payload.exceptionId,
                "misstatementId": updated_exception.get("misstatement_id"),
            },
        )

    return {"exception": updated_exception}
