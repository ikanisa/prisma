"""Workflow orchestration helpers backed by configuration."""
from __future__ import annotations

from typing import Any, Dict, Iterable, List, Optional

from .config_loader import (
    get_agent_registry,
    get_default_autonomy_level,
    get_workflow_definitions,
)

ACTIVE_STATUSES = {"PENDING", "RUNNING"}
_AUTONOMY_RANK = {"L0": 0, "L1": 1, "L2": 2, "L3": 3}
_DEFAULT_AUTONOMY = get_default_autonomy_level()


def _normalise_autonomy(level: Optional[str]) -> str:
    if isinstance(level, str):
        candidate = level.strip().upper()
        if candidate in _AUTONOMY_RANK:
            return candidate
    return _DEFAULT_AUTONOMY


def _friendly_name(key: str) -> str:
    base = key.replace("_", " ").replace("-", " ")
    return base.title() if base else key


def _friendly_step_label(tool_name: str) -> str:
    if not tool_name:
        return "Next step"
    base = tool_name.replace(".", " ").replace("_", " ")
    return base.capitalize()


def _agent_label(agent_id: str) -> str:
    registry = get_agent_registry()
    agent = registry.get(agent_id)
    title = agent.get("title") if isinstance(agent, dict) else None
    if isinstance(title, str) and title.strip():
        return title.strip()
    return agent_id.replace("_", " ").title()


def _json_coerce(value: Any) -> Any:
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, dict):
        return {str(key): _json_coerce(val) for key, val in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [_json_coerce(item) for item in value]
    return str(value)


def _select_active_run(runs: Iterable[Dict[str, Any]], workflow_key: str) -> Optional[Dict[str, Any]]:
    for run in runs:
        if run.get("workflow") == workflow_key and (run.get("status") or "").upper() in ACTIVE_STATUSES:
            return run
    return None


def _build_step_suggestions(
    workflow_key: str,
    definition: Dict[str, Any],
    run: Optional[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    suggestions: List[Dict[str, Any]] = []
    steps = definition.get("steps") if isinstance(definition, dict) else []
    steps = steps if isinstance(steps, list) else []
    minimum_autonomy = _normalise_autonomy(definition.get("minimum_autonomy"))

    if run:
        current_index = 0
        try:
            current_index = int(run.get("current_step_index") or 0)
        except (TypeError, ValueError):
            current_index = 0
        for offset in range(2):
            step_index = current_index + offset
            if step_index >= len(steps):
                break
            step_entry = steps[step_index]
            agent_id = str(step_entry.get("agent_id") or "")
            tool_name = str(step_entry.get("tool") or "")
            suggestions.append(
                {
                    "workflow": workflow_key,
                    "step_index": step_index,
                    "agent_id": agent_id,
                    "tool": tool_name,
                    "label": f"{_friendly_name(workflow_key)}: {_friendly_step_label(tool_name)}",
                    "description": f"Owned by {_agent_label(agent_id)}",
                    "new_run": False,
                    "minimum_autonomy": minimum_autonomy,
                }
            )
    else:
        if steps:
            first_step = steps[0]
            agent_id = str(first_step.get("agent_id") or "")
            tool_name = str(first_step.get("tool") or "")
            suggestions.append(
                {
                    "workflow": workflow_key,
                    "step_index": 0,
                    "agent_id": agent_id,
                    "tool": tool_name,
                    "label": f"Start {_friendly_name(workflow_key)}",
                    "description": f"Kick off with {_agent_label(agent_id)} → {_friendly_step_label(tool_name)}",
                    "new_run": True,
                    "minimum_autonomy": minimum_autonomy,
                }
            )
    return suggestions


async def list_active_runs(
    org_id: str,
    *,
    supabase_table_request,
) -> List[Dict[str, Any]]:
    params = {
        "org_id": f"eq.{org_id}",
        "status": "in.(PENDING,RUNNING)",
        "order": "created_at.asc",
    }
    response = await supabase_table_request("GET", "workflow_runs", params=params)
    if response.status_code != 200:
        return []
    try:
        payload = response.json()
    except Exception:  # pragma: no cover - JSON parsing failure should not crash caller
        return []
    return payload if isinstance(payload, list) else []


async def ensure_workflow_run(
    org_id: str,
    workflow_key: str,
    *,
    triggered_by: Optional[str],
    supabase_table_request,
    iso_now,
) -> Optional[Dict[str, Any]]:
    definitions = get_workflow_definitions()
    definition = definitions.get(workflow_key)
    if not definition:
        return None

    existing_runs = await list_active_runs(org_id, supabase_table_request=supabase_table_request)
    existing = _select_active_run(existing_runs, workflow_key)
    if existing:
        return existing

    steps = definition.get("steps") if isinstance(definition, dict) else []
    steps = steps if isinstance(steps, list) else []
    now = iso_now()
    payload = {
        "org_id": org_id,
        "workflow": workflow_key,
        "status": "RUNNING" if steps else "COMPLETED",
        "current_step_index": 0,
        "total_steps": len(steps),
        "trigger": definition.get("trigger"),
        "required_documents": definition.get("required_documents"),
        "approvals": definition.get("approvals"),
        "outputs": definition.get("outputs"),
        "triggered_by": triggered_by,
        "started_at": now,
        "created_at": now,
        "updated_at": now,
    }
    response = await supabase_table_request(
        "POST",
        "workflow_runs",
        json=payload,
        headers={"Prefer": "return=representation"},
    )
    if response.status_code not in (200, 201):
        return None
    body = response.json() if response.content else []
    return body[0] if body else None


async def record_workflow_step(
    run: Dict[str, Any],
    *,
    step_index: int,
    args: Dict[str, Any],
    result: Optional[Dict[str, Any]],
    supabase_table_request,
    iso_now,
    actor_id: Optional[str],
) -> None:
    payload = {
        "org_id": run.get("org_id"),
        "run_id": run.get("id"),
        "step_index": step_index,
        "status": "COMPLETED",
        "input": _json_coerce(args),
        "output": _json_coerce(result),
        "actor_id": actor_id,
        "created_at": iso_now(),
    }
    await supabase_table_request(
        "POST",
        "workflow_events",
        json=payload,
        headers={"Prefer": "return=minimal"},
    )


async def complete_workflow_step(
    run: Dict[str, Any],
    workflow_key: str,
    *,
    step_index: int,
    args: Dict[str, Any],
    result: Optional[Dict[str, Any]],
    supabase_table_request,
    iso_now,
    actor_id: Optional[str],
) -> Optional[Dict[str, Any]]:
    definitions = get_workflow_definitions()
    definition = definitions.get(workflow_key)
    if not definition:
        return None
    steps = definition.get("steps") if isinstance(definition, dict) else []
    steps = steps if isinstance(steps, list) else []
    if step_index >= len(steps):
        return run

    await record_workflow_step(
        run,
        step_index=step_index,
        args=args,
        result=result,
        supabase_table_request=supabase_table_request,
        iso_now=iso_now,
        actor_id=actor_id,
    )

    next_index = step_index + 1
    update_payload: Dict[str, Any] = {
        "current_step_index": next_index,
        "updated_at": iso_now(),
    }
    if next_index >= len(steps):
        update_payload["status"] = "COMPLETED"
        update_payload["completed_at"] = iso_now()

    response = await supabase_table_request(
        "PATCH",
        "workflow_runs",
        params={"id": f"eq.{run.get('id')}"},
        json=update_payload,
        headers={"Prefer": "return=representation"},
    )
    if response.status_code not in (200, 204):
        return run
    rows = response.json() if response.content else []
    return rows[0] if rows else {**run, **update_payload}


async def get_workflow_suggestions(
    org_id: str,
    *,
    supabase_table_request,
    autonomy_level: Optional[str] = None,
) -> List[Dict[str, Any]]:
    definitions = get_workflow_definitions()
    runs = await list_active_runs(org_id, supabase_table_request=supabase_table_request)
    runs_by_key = {run.get("workflow"): run for run in runs if isinstance(run, dict)}
    org_autonomy = _normalise_autonomy(autonomy_level)

    suggestions: List[Dict[str, Any]] = []
    for key, definition in definitions.items():
        required_autonomy = _normalise_autonomy(definition.get("minimum_autonomy"))
        if _AUTONOMY_RANK.get(org_autonomy, 0) < _AUTONOMY_RANK.get(required_autonomy, 0):
            continue
        run = runs_by_key.get(key)
        entries = _build_step_suggestions(key, definition, run)
        for entry in entries:
            entry.setdefault("minimum_autonomy", required_autonomy)
        suggestions.extend(entries)

    # Ensure deterministic ordering: active runs first, then new-run suggestions
    active = [entry for entry in suggestions if not entry.get("new_run")]
    new_runs = [entry for entry in suggestions if entry.get("new_run")]
    return active + new_runs
