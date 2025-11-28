"""Utilities for evaluating release control readiness."""
from __future__ import annotations

from datetime import datetime, timezone
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


_AUTONOMY_RANK: Mapping[str, int] = {"L0": 0, "L1": 1, "L2": 2, "L3": 3}
_SEVERITY_RANK: Mapping[str, int] = {
    "INFO": 0,
    "NOTICE": 0,
    "WARNING": 1,
    "WARN": 1,
    "ERROR": 2,
    "CRITICAL": 3,
}


def _normalise_autonomy(value: Any) -> str:
    if isinstance(value, str):
        candidate = value.strip().upper()
        if candidate in _AUTONOMY_RANK:
            return candidate
    return "L0"


def _normalise_role(value: Any) -> str:
    if isinstance(value, str):
        candidate = value.strip().upper()
        if candidate:
            return candidate
    return ""


def _parse_timestamp(value: Any) -> Optional[datetime]:
    if not isinstance(value, str) or not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


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


async def summarise_release_environment(
    org_id: str,
    *,
    supabase_table_request,
    org_autonomy_level: Optional[str],
    settings: Optional[Mapping[str, Any]] = None,
    autopilot_worker_disabled: bool = False,
) -> Dict[str, Any]:
    settings = settings or {}
    autonomy_settings = settings.get("autonomy") if isinstance(settings, Mapping) else None
    mfa_settings = settings.get("mfa") if isinstance(settings, Mapping) else None
    telemetry_settings = settings.get("telemetry") if isinstance(settings, Mapping) else None

    minimum_level = _normalise_autonomy(
        autonomy_settings.get("minimum_level") if isinstance(autonomy_settings, Mapping) else None
    )
    require_worker = True
    if isinstance(autonomy_settings, Mapping):
        worker_flag = autonomy_settings.get("require_worker")
        if isinstance(worker_flag, bool):
            require_worker = worker_flag
    critical_roles: List[str] = []
    if isinstance(autonomy_settings, Mapping):
        roles = autonomy_settings.get("critical_roles")
        if isinstance(roles, (list, tuple)):
            critical_roles = [_normalise_role(role) for role in roles if _normalise_role(role)]
    if not critical_roles:
        critical_roles = ["MANAGER", "PARTNER"]

    org_level = _normalise_autonomy(org_autonomy_level)
    ceiling_shortfalls: List[Dict[str, Any]] = []
    membership_rows = await _fetch_rows(
        "memberships",
        params={
            "org_id": f"eq.{org_id}",
            "select": "id,role,autonomy_ceiling",
        },
        supabase_table_request=supabase_table_request,
    )
    for row in membership_rows:
        role = _normalise_role(row.get("role"))
        if role and role in critical_roles:
            ceiling = _normalise_autonomy(row.get("autonomy_ceiling"))
            if _AUTONOMY_RANK.get(ceiling, 0) < _AUTONOMY_RANK.get(minimum_level, 0):
                ceiling_shortfalls.append(
                    {
                        "membershipId": row.get("id"),
                        "role": role,
                        "ceiling": ceiling,
                    }
                )

    autonomy_flags: List[str] = []
    if require_worker and autopilot_worker_disabled:
        autonomy_flags.append("worker_disabled")
    if _AUTONOMY_RANK.get(org_level, 0) < _AUTONOMY_RANK.get(minimum_level, 0):
        autonomy_flags.append("org_level_below_minimum")
    if ceiling_shortfalls:
        autonomy_flags.append("membership_ceiling_shortfall")

    autonomy_state = "satisfied" if not autonomy_flags else "pending"
    autonomy_summary = {
        "state": autonomy_state,
        "orgLevel": org_level,
        "minimumLevel": minimum_level,
        "workerEnabled": (not autopilot_worker_disabled) or not require_worker,
        "criticalRoles": critical_roles,
        "ceilingShortfalls": ceiling_shortfalls,
        "flags": autonomy_flags,
    }

    channel = "WHATSAPP"
    window_seconds = 86400
    if isinstance(mfa_settings, Mapping):
        candidate_channel = mfa_settings.get("channel")
        if isinstance(candidate_channel, str) and candidate_channel.strip():
            channel = candidate_channel.strip().upper()
        candidate_window = mfa_settings.get("within_seconds")
        if isinstance(candidate_window, int) and candidate_window > 0:
            window_seconds = candidate_window
        elif isinstance(candidate_window, str) and candidate_window.strip().isdigit():
            parsed_window = int(candidate_window.strip())
            if parsed_window > 0:
                window_seconds = parsed_window

    challenge_rows = await _fetch_rows(
        "mfa_challenges",
        params={
            "org_id": f"eq.{org_id}",
            "channel": f"eq.{channel}",
            "consumed": "eq.true",
            "order": "created_at.desc",
            "limit": "1",
        },
        supabase_table_request=supabase_table_request,
    )
    last_challenge = challenge_rows[0] if challenge_rows else None
    last_challenge_at = _parse_timestamp(last_challenge.get("created_at")) if last_challenge else None
    last_challenge_age_seconds: Optional[int] = None
    mfa_state = "pending"
    if last_challenge_at is not None:
        age_seconds = (datetime.now(timezone.utc) - last_challenge_at).total_seconds()
        last_challenge_age_seconds = int(age_seconds)
        if age_seconds <= window_seconds:
            mfa_state = "satisfied"
        else:
            mfa_state = "stale"

    mfa_summary = {
        "state": mfa_state,
        "channel": channel,
        "withinSeconds": window_seconds,
        "lastChallengeAt": last_challenge_at.isoformat() if last_challenge_at else None,
        "lastChallengeAgeSeconds": last_challenge_age_seconds,
    }

    severity_threshold = "WARNING"
    if isinstance(telemetry_settings, Mapping):
        candidate_threshold = telemetry_settings.get("severity_threshold")
        if isinstance(candidate_threshold, str) and candidate_threshold.strip():
            severity_threshold = candidate_threshold.strip().upper()
    threshold_rank = _SEVERITY_RANK.get(severity_threshold, 1)
    severity_values = [
        level for level, rank in _SEVERITY_RANK.items() if rank >= threshold_rank
    ]
    if not severity_values:
        severity_values = [severity_threshold]

    max_open_alerts = 0
    if isinstance(telemetry_settings, Mapping):
        candidate_max = telemetry_settings.get("max_open_alerts")
        if isinstance(candidate_max, int) and candidate_max >= 0:
            max_open_alerts = candidate_max
        elif isinstance(candidate_max, str) and candidate_max.strip().isdigit():
            parsed_max = int(candidate_max.strip())
            if parsed_max >= 0:
                max_open_alerts = parsed_max

    params = {
        "org_id": f"eq.{org_id}",
        "resolved_at": "is.null",
        "order": "created_at.desc",
        "limit": "25",
    }
    params["severity"] = f"in.({','.join(severity_values)})"

    alert_rows = await _fetch_rows(
        "telemetry_alerts",
        params=params,
        supabase_table_request=supabase_table_request,
    )
    open_count = len(alert_rows)
    telemetry_state = "satisfied" if open_count <= max_open_alerts else "pending"
    telemetry_summary = {
        "state": telemetry_state,
        "open": open_count,
        "maxOpen": max_open_alerts,
        "severityThreshold": severity_threshold,
        "severityFilter": severity_values,
        "alerts": [
            {
                "id": row.get("id"),
                "severity": row.get("severity"),
                "alertType": row.get("alert_type"),
                "createdAt": row.get("created_at"),
            }
            for row in alert_rows[:5]
        ],
    }

    return {
        "autonomy": autonomy_summary,
        "mfa": mfa_summary,
        "telemetry": telemetry_summary,
    }
