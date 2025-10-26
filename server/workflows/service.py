"""Workflow orchestration helpers built on top of configuration settings."""
from __future__ import annotations

from typing import Any, Dict, Iterable, List, Mapping, Optional

from ..settings import (
    AgentDefinition,
    WorkflowDefinition,
    WorkflowStep,
    WorkflowsSettings,
    get_system_settings,
)

ACTIVE_STATUSES = {"PENDING", "RUNNING"}
_AUTONOMY_RANK = {"L0": 0, "L1": 1, "L2": 2, "L3": 3}


class WorkflowOrchestrator:
    """High-level helper that keeps workflow configuration and helpers together."""

    def __init__(self, workflows: WorkflowsSettings, agents: Mapping[str, AgentDefinition]):
        self._settings = workflows
        self._definitions = workflows.definitions
        self._default_autonomy = workflows.default_autonomy
        self._agents = dict(agents)

    def _workflows_enabled(self) -> bool:
        return self._settings.is_enabled()

    def _normalise_autonomy(self, level: Optional[str]) -> str:
        if isinstance(level, str):
            candidate = level.strip().upper()
            if candidate in _AUTONOMY_RANK:
                return candidate
        return self._default_autonomy

    def _friendly_name(self, key: str) -> str:
        base = key.replace("_", " ").replace("-", " ")
        return base.title() if base else key

    def _friendly_step_label(self, tool_name: str | None) -> str:
        if not tool_name:
            return "Next step"
        base = tool_name.replace(".", " ").replace("_", " ")
        return base.capitalize()

    def _agent_label(self, agent_id: str | None) -> str:
        if not agent_id:
            return "Unknown agent"
        agent = self._agents.get(agent_id)
        title = agent.title if agent else None
        if isinstance(title, str) and title.strip():
            return title.strip()
        return agent_id.replace("_", " ").title()

    def _json_coerce(self, value: Any) -> Any:
        if value is None or isinstance(value, (str, int, float, bool)):
            return value
        if isinstance(value, Mapping):
            return {str(key): self._json_coerce(val) for key, val in value.items()}
        if isinstance(value, Iterable) and not isinstance(value, (str, bytes, bytearray)):
            return [self._json_coerce(item) for item in value]
        return str(value)

    def _select_active_run(
        self, runs: Iterable[Mapping[str, Any]], workflow_key: str
    ) -> Optional[Mapping[str, Any]]:
        for run in runs:
            status = str(run.get("status") or "").upper()
            if run.get("workflow") == workflow_key and status in ACTIVE_STATUSES:
                return run
        return None

    def _build_step_suggestions(
        self,
        workflow_key: str,
        definition: WorkflowDefinition,
        run: Optional[Mapping[str, Any]],
    ) -> List[Dict[str, Any]]:
        suggestions: List[Dict[str, Any]] = []
        steps = definition.steps or []
        minimum_autonomy = self._normalise_autonomy(definition.minimum_autonomy)

        if run:
            try:
                current_index = int(run.get("current_step_index") or 0)
            except (TypeError, ValueError):
                current_index = 0
            for offset in range(2):
                step_index = current_index + offset
                if step_index >= len(steps):
                    break
                step_entry = steps[step_index]
                agent_id = step_entry.agent_id or ""
                tool_name = step_entry.tool or ""
                suggestions.append(
                    {
                        "workflow": workflow_key,
                        "step_index": step_index,
                        "agent_id": agent_id,
                        "tool": tool_name,
                        "label": f"{self._friendly_name(workflow_key)}: {self._friendly_step_label(tool_name)}",
                        "description": f"Owned by {self._agent_label(agent_id)}",
                        "new_run": False,
                        "minimum_autonomy": minimum_autonomy,
                    }
                )
        elif steps:
            first_step = steps[0]
            agent_id = first_step.agent_id or ""
            tool_name = first_step.tool or ""
            suggestions.append(
                {
                    "workflow": workflow_key,
                    "step_index": 0,
                    "agent_id": agent_id,
                    "tool": tool_name,
                    "label": f"Start {self._friendly_name(workflow_key)}",
                    "description": f"Kick off with {self._agent_label(agent_id)} → {self._friendly_step_label(tool_name)}",
                    "new_run": True,
                    "minimum_autonomy": minimum_autonomy,
                }
            )
        return suggestions

    async def list_active_runs(
        self,
        org_id: str,
        *,
        supabase_table_request,
    ) -> List[Dict[str, Any]]:
        if not self._workflows_enabled():
            return []
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
        self,
        org_id: str,
        workflow_key: str,
        *,
        triggered_by: Optional[str],
        supabase_table_request,
        iso_now,
    ) -> Optional[Dict[str, Any]]:
        if not self._workflows_enabled():
            return None
        definition = self._definitions.get(workflow_key)
        if not definition:
            return None

        existing_runs = await self.list_active_runs(org_id, supabase_table_request=supabase_table_request)
        existing = self._select_active_run(existing_runs, workflow_key)
        if existing:
            return dict(existing)

        steps = definition.steps or []
        now = iso_now()
        payload = {
            "org_id": org_id,
            "workflow": workflow_key,
            "status": "RUNNING" if steps else "COMPLETED",
            "current_step_index": 0,
            "total_steps": len(steps),
            "trigger": definition.trigger,
            "required_documents": definition.required_documents,
            "approvals": definition.approvals,
            "outputs": definition.outputs,
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
        self,
        run: Mapping[str, Any],
        *,
        step_index: int,
        args: Mapping[str, Any],
        result: Optional[Mapping[str, Any]],
        supabase_table_request,
        iso_now,
        actor_id: Optional[str],
    ) -> None:
        if not self._workflows_enabled():
            return None
        payload = {
            "org_id": run.get("org_id"),
            "run_id": run.get("id"),
            "step_index": step_index,
            "status": "COMPLETED",
            "input": self._json_coerce(args),
            "output": self._json_coerce(result),
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
        self,
        run: Dict[str, Any],
        workflow_key: str,
        *,
        step_index: int,
        args: Mapping[str, Any],
        result: Optional[Mapping[str, Any]],
        supabase_table_request,
        iso_now,
        actor_id: Optional[str],
    ) -> Optional[Dict[str, Any]]:
        if not self._workflows_enabled():
            return run
        definition = self._definitions.get(workflow_key)
        if not definition:
            return None
        steps = definition.steps or []
        if step_index >= len(steps):
            return run

        await self.record_workflow_step(
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
        self,
        org_id: str,
        *,
        supabase_table_request,
        autonomy_level: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        if not self._workflows_enabled():
            return []
        runs = await self.list_active_runs(org_id, supabase_table_request=supabase_table_request)
        runs_by_key = {run.get("workflow"): run for run in runs if isinstance(run, Mapping)}
        org_autonomy = self._normalise_autonomy(autonomy_level)

        suggestions: List[Dict[str, Any]] = []
        for key, definition in self._definitions.items():
            required_autonomy = self._normalise_autonomy(definition.minimum_autonomy)
            if _AUTONOMY_RANK.get(org_autonomy, 0) < _AUTONOMY_RANK.get(required_autonomy, 0):
                continue
            run = runs_by_key.get(key)
            entries = self._build_step_suggestions(key, definition, run)
            for entry in entries:
                entry.setdefault("minimum_autonomy", required_autonomy)
            suggestions.extend(entries)

        active = [entry for entry in suggestions if not entry.get("new_run")]
        new_runs = [entry for entry in suggestions if entry.get("new_run")]
        return active + new_runs


_default_orchestrator: Optional[WorkflowOrchestrator] = None


def get_default_orchestrator() -> WorkflowOrchestrator:
    global _default_orchestrator
    if _default_orchestrator is None:
        settings = get_system_settings()
        _default_orchestrator = WorkflowOrchestrator(settings.workflows, settings.agents)
    return _default_orchestrator


def set_default_orchestrator(orchestrator: Optional[WorkflowOrchestrator]) -> None:
    global _default_orchestrator
    _default_orchestrator = orchestrator


async def list_active_runs(*args, **kwargs):
    orchestrator = get_default_orchestrator()
    return await orchestrator.list_active_runs(*args, **kwargs)


async def ensure_workflow_run(*args, **kwargs):
    orchestrator = get_default_orchestrator()
    return await orchestrator.ensure_workflow_run(*args, **kwargs)


async def record_workflow_step(*args, **kwargs):
    orchestrator = get_default_orchestrator()
    return await orchestrator.record_workflow_step(*args, **kwargs)


async def complete_workflow_step(*args, **kwargs):
    orchestrator = get_default_orchestrator()
    return await orchestrator.complete_workflow_step(*args, **kwargs)


async def get_workflow_suggestions(*args, **kwargs):
    orchestrator = get_default_orchestrator()
    return await orchestrator.get_workflow_suggestions(*args, **kwargs)
