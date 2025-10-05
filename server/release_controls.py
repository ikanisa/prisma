"""Utilities for evaluating release control readiness."""
from __future__ import annotations

from typing import Any, Dict, Iterable, List, Mapping, Optional

from fastapi import HTTPException


APPROVAL_KIND_MAP: Mapping[str, List[str]] = {
    "plan_freeze": ["AUDIT_PLAN_FREEZE", "FRAUD_PLAN_APPROVAL"],
    "report_release": ["REPORT_FINAL"],
    "filings_submit": [
        "MT_CIT_APPROVAL",
        "VAT_RETURN_APPROVAL",
        "DAC6_APPROVAL",
        "PILLAR_TWO_APPROVAL",
        "US_OVERLAY_APPROVAL",
    ],
}


def _ensure_response_ok(table: str, response: Any) -> None:
    status = getattr(response, "status_code", None)
    if status != 200:
        raise HTTPException(status_code=502, detail=f"{table}_lookup_failed")


async def _fetch_rows(
    table: str,
    *,
    params: Dict[str, Any],
    supabase_table_request,
) -> List[Dict[str, Any]]:
    response = await supabase_table_request("GET", table, params=params)
    _ensure_response_ok(table, response)
    payload = response.json() if hasattr(response, "json") else None
    if isinstance(payload, list):
        return payload
    return []


def _normalise_status(value: Any) -> str:
    if isinstance(value, str):
        return value.strip().upper()
    return ""


def _summarise_approvals(rows: Iterable[Mapping[str, Any]], kinds: Iterable[str]) -> Dict[str, Any]:
    statuses = [_normalise_status(row.get("status")) for row in rows]
    total = len(statuses)
    approved = sum(1 for status in statuses if status == "APPROVED")
    pending = sum(1 for status in statuses if status in {"", "PENDING"})
    rejected = sum(1 for status in statuses if status == "REJECTED")
    cancelled = sum(1 for status in statuses if status == "CANCELLED")

    if rejected > 0:
        state = "changes_required"
    elif pending > 0:
        state = "pending"
    elif approved > 0 and rejected == 0 and pending == 0:
        state = "satisfied"
    elif total == 0:
        state = "not_applicable"
    else:
        state = "unknown"

    return {
        "state": state,
        "total": total,
        "approved": approved,
        "pending": pending,
        "rejected": rejected,
        "cancelled": cancelled,
        "kinds": list(kinds),
    }


def _summarise_close_periods(rows: Iterable[Mapping[str, Any]]) -> Dict[str, Any]:
    statuses = [_normalise_status(row.get("status")) for row in rows]
    locked = sum(1 for status in statuses if status == "LOCKED")
    ready = sum(1 for status in statuses if status == "READY_TO_LOCK")
    in_progress = sum(
        1
        for status in statuses
        if status in {"OPEN", "SUBSTANTIVE_REVIEW", "IN_PROGRESS"}
    )

    if locked > 0:
        state = "satisfied"
    elif ready > 0 or in_progress > 0:
        state = "pending"
    elif not statuses:
        state = "not_applicable"
    else:
        state = "unknown"

    return {
        "state": state,
        "total": len(statuses),
        "locked": locked,
        "ready": ready,
        "in_progress": in_progress,
    }


def _hash_looks_valid(value: Optional[str], algorithm: str) -> bool:
    if not value:
        return False
    algo = algorithm.strip().lower()
    if algo == "sha256":
        return len(value) == 64
    if algo == "sha1":
        return len(value) == 40
    if algo in {"md5"}:
        return len(value) == 32
    return True


async def evaluate_release_controls(
    org_id: str,
    *,
    supabase_table_request,
    required_actions: Optional[Iterable[str]] = None,
    engagement_id: Optional[str] = None,
    manifest_hash_algorithm: str = "sha256",
    include_docs: Optional[Iterable[str]] = None,
) -> Dict[str, Any]:
    actions: Dict[str, Any] = {}
    action_list = list(required_actions) if required_actions is not None else []
    if not action_list:
        action_list = list(APPROVAL_KIND_MAP.keys()) + ["period_lock"]

    for action in action_list:
        if action in APPROVAL_KIND_MAP:
            kinds = APPROVAL_KIND_MAP[action]
            params: Dict[str, Any] = {
                "org_id": f"eq.{org_id}",
                "select": "id,status,kind,stage,resolved_at,updated_at",
                "order": "updated_at.desc",
            }
            if len(kinds) == 1:
                params["kind"] = f"eq.{kinds[0]}"
            else:
                params["kind"] = f"in.({','.join(kinds)})"
            if engagement_id:
                params["engagement_id"] = f"eq.{engagement_id}"
            rows = await _fetch_rows("approval_queue", params=params, supabase_table_request=supabase_table_request)
            actions[action] = _summarise_approvals(rows, kinds)
        elif action == "period_lock":
            params = {
                "org_id": f"eq.{org_id}",
                "select": "id,status,locked_at,updated_at",
                "order": "updated_at.desc",
                "limit": "50",
            }
            rows = await _fetch_rows("close_periods", params=params, supabase_table_request=supabase_table_request)
            actions[action] = _summarise_close_periods(rows)
        else:
            actions[action] = {
                "state": "unknown",
                "total": 0,
                "approved": 0,
                "pending": 0,
                "rejected": 0,
                "cancelled": 0,
                "kinds": [],
            }

    archive_params = {
        "org_id": f"eq.{org_id}",
        "select": "id,engagement_id,sha256,updated_at,manifest",
        "order": "updated_at.desc",
        "limit": "1",
    }
    if engagement_id:
        archive_params["engagement_id"] = f"eq.{engagement_id}"
    archive_rows = await _fetch_rows(
        "engagement_archives",
        params=archive_params,
        supabase_table_request=supabase_table_request,
    )

    latest = archive_rows[0] if archive_rows else {}
    sha256 = latest.get("sha256") if isinstance(latest, Mapping) else None
    manifest = latest.get("manifest") if isinstance(latest, Mapping) else None
    updated_at = latest.get("updated_at") if isinstance(latest, Mapping) else None

    archive_state = "satisfied" if _hash_looks_valid(sha256, manifest_hash_algorithm) else "pending"
    if not archive_rows:
        archive_state = "pending"

    expected_documents = list(include_docs or [])

    archive_summary = {
        "state": archive_state,
        "sha256": sha256,
        "updatedAt": updated_at,
        "expectedDocuments": expected_documents,
        "manifest": manifest if isinstance(manifest, Mapping) else None,
    }

    return {
        "actions": actions,
        "archive": archive_summary,
    }
