"""Helpers for loading system configuration for the backend."""
from __future__ import annotations

import os
from functools import lru_cache
from typing import Any, Dict, Iterable, List, Mapping, Set

from .settings import get_system_settings

_DEFAULT_CLIENT_ALLOWED_REPOS = [
    "02_Tax/PBC",
    "03_Accounting/PBC",
    "05_Payroll/PBC",
]
_DEFAULT_URL_ALLOWED_DOMAINS = ["*"]
_DEFAULT_GOOGLE_DRIVE_SCOPES = [
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/drive.metadata.readonly",
]
_DEFAULT_URL_FETCH_POLICY = {
    "obey_robots": True,
    "max_depth": 1,
    "cache_ttl_minutes": 1440,
}
_DEFAULT_BEFORE_ASKING_SEQUENCE = ["documents", "google_drive", "url_sources"]
_DEFAULT_DOCUMENT_AI_STEPS = ["ocr", "classify", "extract", "index"]
_DEFAULT_DOCUMENT_AI_ERROR_MODE = "quarantine_and_notify"
_DEFAULT_VECTOR_INDEX_CHUNK_SIZE = 1000
_DEFAULT_VECTOR_INDEX_CHUNK_OVERLAP = 150
_DEFAULT_RETRIEVAL_SETTINGS = {
    "reranker": "mini-lm-re-ranker-v2",
    "top_k": 5,
    "min_citation_confidence": 0.5,
    "require_citation": True,
}
_DEFAULT_RELEASE_APPROVALS = ["plan_freeze", "filings_submit", "report_release", "period_lock"]
_DEFAULT_ARCHIVE_SETTINGS = {
    "manifest_hash": "sha256",
    "include_docs": [],
}
_DEFAULT_RELEASE_ENVIRONMENT = {
    "autonomy": {
        "minimum_level": "L2",
        "require_worker": True,
        "critical_roles": ["MANAGER", "PARTNER"],
    },
    "mfa": {
        "channel": "WHATSAPP",
        "within_seconds": 86400,
    },
    "telemetry": {
        "max_open_alerts": 0,
        "severity_threshold": "WARNING",
    },
}

_DEFAULT_AUTONOMY_LEVEL = "L2"
_AUTONOMY_LEVEL_ORDER = {"L0": 0, "L1": 1, "L2": 2, "L3": 3}
_DEFAULT_AUTONOMY_LABELS = {
    "L0": "Manual: user triggers everything",
    "L1": "Suggest: agent proposes actions; user approves",
    "L2": "Auto-prepare: agent drafts & stages; user approves to submit/file",
    "L3": "Autopilot: agent executes within policy; asks only if evidence is missing",
}
_DEFAULT_ROLE_ORDER = [
    "SERVICE_ACCOUNT",
    "READONLY",
    "CLIENT",
    "EMPLOYEE",
    "MANAGER",
    "EQR",
    "PARTNER",
    "SYSTEM_ADMIN",
]
_DEFAULT_ROLE_RANK = {
    "SERVICE_ACCOUNT": 10,
    "READONLY": 20,
    "CLIENT": 30,
    "EMPLOYEE": 40,
    "MANAGER": 70,
    "EQR": 80,
    "PARTNER": 90,
    "SYSTEM_ADMIN": 100,
}

_DEFAULT_AUTOPILOT_ALLOWANCES = {
    "L0": [],
    "L1": ["refresh_analytics"],
    "L2": [
        "extract_documents",
        "remind_pbc",
        "refresh_analytics",
        "close_cycle",
        "audit_fieldwork",
        "tax_cycle",
    ],
    "L3": [
        "extract_documents",
        "remind_pbc",
        "refresh_analytics",
        "close_cycle",
        "audit_fieldwork",
        "tax_cycle",
    ],
}
@lru_cache(maxsize=1)
def load_system_config() -> Mapping[str, Any]:
    settings = get_system_settings()
    raw = settings.raw
    return raw if isinstance(raw, Mapping) else {}


def _normalise_list(values: Iterable[Any]) -> List[str]:
    result: List[str] = []
    for value in values or []:  # type: ignore[arg-type]
        if value is None:
            continue
        text = str(value).strip()
        if not text:
            continue
        if text not in result:
            result.append(text)
    return result

def _get_data_source_sections(config: Mapping[str, Any] | None) -> tuple[Mapping[str, Any] | None, Mapping[str, Any] | None]:
    if not isinstance(config, Mapping):
        return None, None
    legacy = config.get("data_sources")
    modern = config.get("datasources")
    return (
        legacy if isinstance(legacy, Mapping) else None,
        modern if isinstance(modern, Mapping) else None,
    )


def _coerce_bool(value: Any) -> bool | None:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        lowered = value.strip().lower()
        if lowered in {"true", "1", "yes", "y", "on"}:
            return True
        if lowered in {"false", "0", "no", "n", "off"}:
            return False
    if isinstance(value, (int, float)):
        if value == 1:
            return True
        if value == 0:
            return False
    return None


def _coerce_int(value: Any) -> int | None:
    if isinstance(value, int):
        return value
    if isinstance(value, float) and value.is_integer():
        return int(value)
    if isinstance(value, str):
        try:
            parsed = int(value.strip())
        except ValueError:
            return None
        return parsed
    return None


def _coerce_float(value: Any) -> float | None:
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        try:
            return float(value.strip())
        except ValueError:
            return None
    return None


@lru_cache(maxsize=1)
def get_config_permission_map() -> Dict[str, str]:
    config = load_system_config()
    rbac = config.get("rbac") if isinstance(config, Mapping) else None
    permissions = rbac.get("permissions") if isinstance(rbac, Mapping) else None
    matrix = rbac.get("matrix") if isinstance(rbac, Mapping) else None
    result: Dict[str, str] = {}
    if isinstance(permissions, Mapping):
        for key, value in permissions.items():
            if key is None or value is None:
                continue
            permission_key = str(key).strip()
            role_value = str(value).strip().upper()
            if permission_key and role_value:
                result[permission_key] = role_value
    if isinstance(matrix, Mapping):
        for key, value in matrix.items():
            if key is None or value is None:
                continue
            permission_key = str(key).strip()
            role_value = str(value).strip().upper()
            if permission_key and role_value:
                result[permission_key] = role_value
    return result


@lru_cache(maxsize=1)
def get_client_portal_scope() -> Dict[str, List[str]]:
    config = load_system_config()
    rbac = config.get("rbac") if isinstance(config, Mapping) else None
    scope = None
    if isinstance(rbac, Mapping):
        scope = rbac.get("client_portal_scope")
        if not isinstance(scope, Mapping):
            scope = rbac.get("client_scope")
    allowed: List[str] = []
    denied: List[str] = []
    if isinstance(scope, Mapping):
        allowed = _normalise_list(scope.get("allowed_repos", []))
        denied = _normalise_list(scope.get("denied_actions", []))
    if not allowed:
        allowed = list(_DEFAULT_CLIENT_ALLOWED_REPOS)
    return {
        "allowed_repos": allowed,
        "denied_actions": denied,
    }


def _coerce_autonomy_level(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    key = value.strip().upper()
    if key in _AUTONOMY_LEVEL_ORDER:
        return key
    return None


@lru_cache(maxsize=1)
def get_autonomy_levels() -> Dict[str, str]:
    config = load_system_config()
    autonomy = config.get("autonomy") if isinstance(config, Mapping) else None
    levels = autonomy.get("levels") if isinstance(autonomy, Mapping) else None
    result = dict(_DEFAULT_AUTONOMY_LABELS)
    if isinstance(levels, Mapping):
        for key, value in levels.items():
            level = _coerce_autonomy_level(key)
            if not level or not isinstance(value, str):
                continue
            text = value.strip()
            if text:
                result[level] = text
    return result


@lru_cache(maxsize=1)
def get_default_autonomy_level() -> str:
    config = load_system_config()
    autonomy = config.get("autonomy") if isinstance(config, Mapping) else None
    preferred = None
    if isinstance(autonomy, Mapping):
        preferred = _coerce_autonomy_level(autonomy.get("default_level"))
    return preferred or _DEFAULT_AUTONOMY_LEVEL


@lru_cache(maxsize=1)
def get_autonomy_job_allowances() -> Dict[str, List[str]]:
    config = load_system_config()
    autonomy = config.get("autonomy") if isinstance(config, Mapping) else None
    autopilot = autonomy.get("autopilot") if isinstance(autonomy, Mapping) else None
    allowed_jobs = autopilot.get("allowed_jobs") if isinstance(autopilot, Mapping) else None
    result: Dict[str, List[str]] = {level: list(jobs) for level, jobs in _DEFAULT_AUTOPILOT_ALLOWANCES.items()}
    if isinstance(allowed_jobs, Mapping):
        for key, raw in allowed_jobs.items():
            level = _coerce_autonomy_level(key)
            if not level:
                continue
            values: Iterable[Any]
            if isinstance(raw, list):
                values = raw
            elif raw is None:
                values = []
            else:
                values = [raw]
            normalised = [entry.lower() for entry in _normalise_list(values)]
            result[level] = normalised
    return result




@lru_cache(maxsize=1)
def get_org_roles() -> List[str]:
    config = load_system_config()
    rbac = config.get("rbac") if isinstance(config, Mapping) else None
    roles = None
    if isinstance(rbac, Mapping):
        raw_roles = rbac.get("roles")
        if isinstance(raw_roles, Iterable):
            roles = _normalise_list(raw_roles)
    normalised = [role.upper() for role in roles or []]
    if not normalised:
        normalised = list(_DEFAULT_ROLE_ORDER)
    else:
        seen: Set[str] = set()
        ordered: List[str] = []
        for role in normalised:
            upper = role.upper()
            if upper and upper not in seen:
                seen.add(upper)
                ordered.append(upper)
        for role in _DEFAULT_ROLE_ORDER:
            if role not in seen:
                ordered.append(role)
        normalised = ordered
    return normalised


@lru_cache(maxsize=1)
def get_role_rank_map() -> Dict[str, int]:
    roles = get_org_roles()
    rank_map: Dict[str, int] = {}
    next_rank = 10
    for role in roles:
        if role in _DEFAULT_ROLE_RANK:
            rank = _DEFAULT_ROLE_RANK[role]
        else:
            rank = next_rank
        rank_map[role] = rank
        next_rank = max(next_rank + 10, rank + 10)
    return rank_map


@lru_cache(maxsize=1)
def get_managerial_roles() -> Set[str]:
    rank_map = get_role_rank_map()
    manager_rank = rank_map.get("MANAGER", 70)
    return {role for role, value in rank_map.items() if value >= manager_rank}

@lru_cache(maxsize=1)
def get_tool_policies() -> Dict[str, Dict[str, Any]]:
    config = load_system_config()
    tools = config.get("tools") if isinstance(config, Mapping) else None
    policies: Dict[str, Dict[str, Any]] = {}
    if isinstance(tools, Iterable):
        for entry in tools:
            if not isinstance(entry, Mapping):
                continue
            name = str(entry.get("name") or "").strip()
            if not name:
                continue
            policy: Dict[str, Any] = {}
            required = entry.get("required_permission")
            if isinstance(required, str) and required.strip():
                policy["required_permission"] = required.strip()
            limit = _coerce_int(entry.get("rate_limit_per_minute"))
            if limit is not None and limit >= 0:
                policy["rate_limit_per_minute"] = limit
            window = _coerce_int(entry.get("rate_limit_window_seconds"))
            if window is not None and window > 0:
                policy["rate_limit_window_seconds"] = window
            policies[name] = policy
    return policies


@lru_cache(maxsize=1)
def get_agent_registry() -> Dict[str, Dict[str, Any]]:
    config = load_system_config()
    agents = config.get("agents") if isinstance(config, Mapping) else None
    registry: Dict[str, Dict[str, Any]] = {}
    if isinstance(agents, Iterable):
        for entry in agents:
            if not isinstance(entry, Mapping):
                continue
            agent_id = str(entry.get("id") or "").strip()
            if not agent_id:
                continue
            persona: Dict[str, Any] = {}
            persona_entry = entry.get("persona")
            if isinstance(persona_entry, Mapping):
                summary = persona_entry.get("summary")
                voice = persona_entry.get("voice")
                if isinstance(summary, str) and summary.strip():
                    persona["summary"] = summary.strip()
                if isinstance(voice, str) and voice.strip():
                    persona["voice"] = voice.strip()
            playbooks: List[Dict[str, Any]] = []
            raw_playbooks = entry.get("playbooks")
            if isinstance(raw_playbooks, Iterable):
                for playbook in raw_playbooks:
                    if not isinstance(playbook, Mapping):
                        continue
                    name = str(playbook.get("name") or "").strip()
                    if not name:
                        continue
                    steps = _normalise_list(playbook.get("steps"))
                    playbooks.append({"name": name, "steps": steps})

            registry[agent_id] = {
                "title": (str(entry.get("title")) or "").strip() or None,
                "default_autonomy": _coerce_autonomy_level(entry.get("default_autonomy")),
                "tools": _normalise_list(entry.get("tools")),
                "actions": _normalise_list(entry.get("actions")),
                "approvals_required": _normalise_list(entry.get("approvals_required")),
                "persona": persona,
                "playbooks": playbooks,
            }
    return registry


@lru_cache(maxsize=1)
def get_workflow_definitions() -> Dict[str, Dict[str, Any]]:
    config = load_system_config()
    workflows = config.get("workflows") if isinstance(config, Mapping) else None
    definitions: Dict[str, Dict[str, Any]] = {}
    registry = get_agent_registry()
    tool_registry: Dict[str, List[str]] = {}
    for agent_id, definition in (registry or {}).items():
        tools = definition.get("tools") if isinstance(definition, Mapping) else None
        if isinstance(tools, Iterable):
            for tool in tools:
                key = str(tool or "").strip().lower()
                if not key:
                    continue
                tool_registry.setdefault(key, []).append(agent_id)
    default_autonomy = get_default_autonomy_level()
    if isinstance(workflows, Mapping):
        for key, value in workflows.items():
            if not isinstance(value, Mapping):
                continue
            workflow_key = str(key or "").strip()
            if not workflow_key:
                continue
            trigger_value = value.get("trigger")
            trigger = trigger_value.strip() if isinstance(trigger_value, str) else None
            required_docs: Dict[str, List[str]] = {}
            required_section = value.get("required_documents")
            if isinstance(required_section, Mapping):
                for category, items in required_section.items():
                    required_docs[str(category)] = _normalise_list(items)
            approvals = _normalise_list(value.get("approvals"))
            single_approval = value.get("approval")
            if isinstance(single_approval, str) and single_approval.strip() and single_approval.strip() not in approvals:
                approvals.append(single_approval.strip())
            outputs = _normalise_list(value.get("outputs"))
            steps: List[Dict[str, Any]] = []
            minimum_autonomy = default_autonomy
            minimum_rank = _AUTONOMY_LEVEL_ORDER.get(minimum_autonomy, 0)
            step_entries = value.get("steps")
            if isinstance(step_entries, Iterable):
                for entry in step_entries:
                    if isinstance(entry, str):
                        tool_name = entry.strip()
                        if not tool_name:
                            continue
                        candidates = tool_registry.get(tool_name.lower(), [])
                        agent_id = candidates[0] if candidates else tool_name
                        agent_definition = registry.get(agent_id) if isinstance(registry, Mapping) else None
                        agent_default = None
                        if isinstance(agent_definition, Mapping):
                            agent_default = agent_definition.get("default_autonomy")
                        required_autonomy = _coerce_autonomy_level(agent_default) or default_autonomy
                        steps.append({
                            "agent_id": agent_id,
                            "tool": tool_name,
                            "required_autonomy": required_autonomy,
                        })
                        rank = _AUTONOMY_LEVEL_ORDER.get(required_autonomy, minimum_rank)
                        if rank > minimum_rank:
                            minimum_rank = rank
                            minimum_autonomy = required_autonomy
                        continue

                    if not isinstance(entry, Mapping) or not entry:
                        continue
                    agent_raw, tool_raw = next(iter(entry.items()))
                    agent_id = str(agent_raw or "").strip()
                    tool_name = str(tool_raw or "").strip()
                    if not agent_id or not tool_name:
                        continue
                    agent_definition = registry.get(agent_id) if isinstance(registry, Mapping) else None
                    agent_default = None
                    if isinstance(agent_definition, Mapping):
                        agent_default = agent_definition.get("default_autonomy")
                    required_autonomy = _coerce_autonomy_level(agent_default) or default_autonomy
                    steps.append({
                        "agent_id": agent_id,
                        "tool": tool_name,
                        "required_autonomy": required_autonomy,
                    })
                    rank = _AUTONOMY_LEVEL_ORDER.get(required_autonomy, minimum_rank)
                    if rank > minimum_rank:
                        minimum_rank = rank
                        minimum_autonomy = required_autonomy
            definitions[workflow_key] = {
                "key": workflow_key,
                "trigger": trigger,
                "required_documents": required_docs,
                "steps": steps,
                "approvals": approvals,
                "outputs": outputs,
                "minimum_autonomy": minimum_autonomy,
            }
    return definitions


@lru_cache(maxsize=1)
def get_google_drive_settings() -> Dict[str, Any]:
    config = load_system_config()
    legacy, modern = _get_data_source_sections(config if isinstance(config, Mapping) else None)

    merged: Dict[str, Any] = {}
    for section in (legacy, modern):
        drive_section = section.get("google_drive") if isinstance(section, Mapping) else None
        if isinstance(drive_section, Mapping):
            merged.update(drive_section)

    enabled = _coerce_bool(merged.get("enabled"))
    scopes_raw = []
    scopes_value = merged.get("oauth_required_scopes")
    if isinstance(scopes_value, (list, tuple)):
        scopes_raw = _normalise_list(scopes_value)
    elif isinstance(scopes_value, str):
        scopes_raw = _normalise_list(scopes_value.split(","))
    folder_pattern = None
    candidate = merged.get("folder_mapping_pattern")
    if isinstance(candidate, str) and candidate.strip():
        folder_pattern = candidate.strip()
    mirror = _coerce_bool(merged.get("mirror_to_storage"))

    return {
        "enabled": enabled if enabled is not None else False,
        "oauth_scopes": scopes_raw or list(_DEFAULT_GOOGLE_DRIVE_SCOPES),
        "folder_mapping_pattern": folder_pattern or "org-{orgId}/entity-{entityId}/{repoFolder}",
        "mirror_to_storage": mirror if mirror is not None else True,
    }


@lru_cache(maxsize=1)
def get_url_source_settings() -> Dict[str, Any]:
    config = load_system_config()
    legacy, modern = _get_data_source_sections(config if isinstance(config, Mapping) else None)

    merged: Dict[str, Any] = {}
    for section in (legacy, modern):
        url_section = section.get("url_sources") if isinstance(section, Mapping) else None
        if isinstance(url_section, Mapping):
            merged.update(url_section)

    allowed: List[str] = list(_DEFAULT_URL_ALLOWED_DOMAINS)
    domains = merged.get("allowed_domains")
    if isinstance(domains, (list, tuple)):
        entries = _normalise_list(domains)
        if entries:
            allowed = entries
    elif isinstance(domains, str):
        entries = _normalise_list(domains.split(","))
        if entries:
            allowed = entries
    else:
        whitelist = merged.get("whitelist")
        if isinstance(whitelist, (list, tuple)):
            entries = _normalise_list(whitelist)
            if entries:
                allowed = entries
        elif isinstance(whitelist, str):
            entries = _normalise_list(whitelist.split(","))
            if entries:
                allowed = entries

    fetch_policy = _DEFAULT_URL_FETCH_POLICY.copy()
    policy_section = merged.get("fetch_policy")
    if not isinstance(policy_section, Mapping):
        fallback_policy = merged.get("policy")
        policy_section = fallback_policy if isinstance(fallback_policy, Mapping) else None
    if isinstance(policy_section, Mapping):
        obey = _coerce_bool(policy_section.get("obey_robots"))
        if obey is not None:
            fetch_policy["obey_robots"] = obey
        depth = _coerce_int(policy_section.get("max_depth"))
        if depth is not None and depth >= 0:
            fetch_policy["max_depth"] = depth
        ttl = _coerce_int(policy_section.get("cache_ttl_minutes"))
        if ttl is not None and ttl >= 0:
            fetch_policy["cache_ttl_minutes"] = ttl

    return {
        "allowed_domains": allowed,
        "fetch_policy": fetch_policy,
    }


@lru_cache(maxsize=1)
def get_email_ingest_settings() -> Dict[str, Any]:
    config = load_system_config()
    legacy, modern = _get_data_source_sections(config if isinstance(config, Mapping) else None)

    merged: Dict[str, Any] = {}
    for section in (legacy, modern):
        email_section = section.get("email_ingest") if isinstance(section, Mapping) else None
        if isinstance(email_section, Mapping):
            merged.update(email_section)

    enabled = _coerce_bool(merged.get("enabled"))
    return {"enabled": bool(enabled)}


@lru_cache(maxsize=1)
def get_before_asking_user_sequence() -> List[str]:
    config = load_system_config()
    knowledge = config.get("knowledge") if isinstance(config, Mapping) else None
    retrieval = knowledge.get("retrieval") if isinstance(knowledge, Mapping) else None
    policy = retrieval.get("policy") if isinstance(retrieval, Mapping) else None
    before = policy.get("before_asking_user") if isinstance(policy, Mapping) else None
    if isinstance(before, (list, tuple)):
        entries = _normalise_list(before)
        if entries:
            return entries
    if isinstance(before, str):
        entries = _normalise_list(before.split(","))
        if entries:
            return entries
    rag = config.get("rag") if isinstance(config, Mapping) else None
    candidate = None
    if isinstance(rag, Mapping):
        candidate = rag.get("before_asking_user")
        if candidate is None:
            policy_section = rag.get("policy")
            if isinstance(policy_section, Mapping):
                candidate = policy_section.get("before_asking_user")
    if isinstance(candidate, (list, tuple)):
        entries = _normalise_list(candidate)
        if entries:
            return entries
    if isinstance(candidate, str):
        entries = _normalise_list(candidate.split(","))
        if entries:
            return entries
    return list(_DEFAULT_BEFORE_ASKING_SEQUENCE)


@lru_cache(maxsize=1)
def get_release_control_settings() -> Dict[str, Any]:
    config = load_system_config()
    release = config.get("release_controls") if isinstance(config, Mapping) else None

    approvals = list(_DEFAULT_RELEASE_APPROVALS)
    manifest_hash = _DEFAULT_ARCHIVE_SETTINGS.get("manifest_hash", "sha256")
    include_docs = list(_DEFAULT_ARCHIVE_SETTINGS.get("include_docs", []))
    environment = {
        "autonomy": {
            "minimum_level": _DEFAULT_RELEASE_ENVIRONMENT["autonomy"].get("minimum_level", "L2"),
            "require_worker": bool(_DEFAULT_RELEASE_ENVIRONMENT["autonomy"].get("require_worker", True)),
            "critical_roles": list(_DEFAULT_RELEASE_ENVIRONMENT["autonomy"].get("critical_roles", [])),
        },
        "mfa": {
            "channel": _DEFAULT_RELEASE_ENVIRONMENT["mfa"].get("channel", "WHATSAPP"),
            "within_seconds": int(_DEFAULT_RELEASE_ENVIRONMENT["mfa"].get("within_seconds", 86400)),
        },
        "telemetry": {
            "max_open_alerts": int(_DEFAULT_RELEASE_ENVIRONMENT["telemetry"].get("max_open_alerts", 0)),
            "severity_threshold": _DEFAULT_RELEASE_ENVIRONMENT["telemetry"].get("severity_threshold", "WARNING"),
        },
    }

    if isinstance(release, Mapping):
        configured_approvals = _normalise_list(release.get("approvals_required", []))
        if configured_approvals:
            approvals = configured_approvals

        archive = release.get("archive")
        if isinstance(archive, Mapping):
            candidate_hash = archive.get("manifest_hash")
            if isinstance(candidate_hash, str) and candidate_hash.strip():
                manifest_hash = candidate_hash.strip()
            docs = _normalise_list(archive.get("include_docs", []))
            if docs:
                include_docs = docs

        env_config = release.get("environment")
        if isinstance(env_config, Mapping):
            autonomy_cfg = env_config.get("autonomy")
            if isinstance(autonomy_cfg, Mapping):
                minimum = _coerce_autonomy_level(autonomy_cfg.get("minimum_level"))
                if minimum:
                    environment["autonomy"]["minimum_level"] = minimum
                require_worker = _coerce_bool(autonomy_cfg.get("require_worker"))
                if require_worker is not None:
                    environment["autonomy"]["require_worker"] = require_worker
                critical_roles = _normalise_list(autonomy_cfg.get("critical_roles", []))
                if critical_roles:
                    environment["autonomy"]["critical_roles"] = critical_roles

            mfa_cfg = env_config.get("mfa")
            if isinstance(mfa_cfg, Mapping):
                channel_value = mfa_cfg.get("channel")
                if isinstance(channel_value, str) and channel_value.strip():
                    environment["mfa"]["channel"] = channel_value.strip().upper()
                within = _coerce_int(mfa_cfg.get("within_seconds"))
                if within is not None and within > 0:
                    environment["mfa"]["within_seconds"] = within

            telemetry_cfg = env_config.get("telemetry")
            if isinstance(telemetry_cfg, Mapping):
                max_open = _coerce_int(telemetry_cfg.get("max_open_alerts"))
                if max_open is not None and max_open >= 0:
                    environment["telemetry"]["max_open_alerts"] = max_open
                severity_value = telemetry_cfg.get("severity_threshold")
                if isinstance(severity_value, str) and severity_value.strip():
                    environment["telemetry"]["severity_threshold"] = severity_value.strip().upper()

    return {
        "approvals_required": approvals,
        "archive": {
            "manifest_hash": manifest_hash,
            "include_docs": include_docs,
        },
        "environment": environment,
    }


def _normalise_document_type(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    candidate = value.strip().upper()
    if not candidate:
        return None
    return candidate


@lru_cache(maxsize=1)
def get_document_ai_settings() -> Dict[str, Any]:
    config = load_system_config()
    document_ai = config.get("document_ai") if isinstance(config, Mapping) else None
    pipeline = document_ai.get("pipeline") if isinstance(document_ai, Mapping) else None

    steps: List[str] = list(_DEFAULT_DOCUMENT_AI_STEPS)
    classifiers: List[str] = []
    extractors: Dict[str, List[str]] = {}
    provenance_required = True
    error_handling = _DEFAULT_DOCUMENT_AI_ERROR_MODE

    if isinstance(pipeline, Mapping):
        raw_steps = pipeline.get("steps")
        if isinstance(raw_steps, (list, tuple)):
            entries = [entry.lower() for entry in _normalise_list(raw_steps)]
            if entries:
                steps = entries
        elif isinstance(raw_steps, str):
            entries = [entry.lower() for entry in _normalise_list(raw_steps.split(","))]
            if entries:
                steps = entries

        classifiers_section = pipeline.get("classifiers")
        if isinstance(classifiers_section, Mapping):
            types_value = classifiers_section.get("types")
            if isinstance(types_value, (list, tuple)):
                classifiers = [
                    entry
                    for entry in (
                        _normalise_document_type(item)
                        for item in types_value  # type: ignore[list-item]
                    )
                    if entry
                ]
            elif isinstance(types_value, str):
                classifiers = [
                    entry
                    for entry in (
                        _normalise_document_type(item)
                        for item in types_value.split(",")
                    )
                    if entry
                ]

        extractors_section = pipeline.get("extractors")
        if isinstance(extractors_section, Mapping):
            for key, raw_fields in extractors_section.items():
                doc_type = _normalise_document_type(key)
                if not doc_type:
                    continue
                if isinstance(raw_fields, (list, tuple)):
                    fields = _normalise_list(raw_fields)
                elif isinstance(raw_fields, str):
                    fields = _normalise_list(raw_fields.split(","))
                else:
                    fields = []
                extractors[doc_type] = fields

        provenance_flag = pipeline.get("provenance")
        coerced_provenance = _coerce_bool(provenance_flag)
        if coerced_provenance is not None:
            provenance_required = coerced_provenance

        error_mode = pipeline.get("error_handling")
        if isinstance(error_mode, str) and error_mode.strip():
            error_handling = error_mode.strip()

    return {
        "steps": steps,
        "classifier_types": classifiers,
        "extractors": extractors,
        "provenance_required": provenance_required,
        "error_handling": error_handling,
    }


@lru_cache(maxsize=1)
def get_vector_index_configs() -> List[Dict[str, Any]]:
    config = load_system_config()
    knowledge = config.get("knowledge") if isinstance(config, Mapping) else None
    vector_indexes = knowledge.get("vector_indexes") if isinstance(knowledge, Mapping) else None
    results: List[Dict[str, Any]] = []

    if isinstance(vector_indexes, Iterable):
        for raw_index in vector_indexes:  # type: ignore[assignment]
            if not isinstance(raw_index, Mapping):
                continue
            name = str(raw_index.get("name") or "").strip()
            if not name:
                continue
            backend = str(raw_index.get("backend") or "pgvector").strip() or "pgvector"
            embedding_model = str(raw_index.get("embedding_model") or "").strip()

            chunk_size = _DEFAULT_VECTOR_INDEX_CHUNK_SIZE
            chunk_overlap = _DEFAULT_VECTOR_INDEX_CHUNK_OVERLAP
            chunking_section = raw_index.get("chunking") if isinstance(raw_index, Mapping) else None
            if isinstance(chunking_section, Mapping):
                size_value = _coerce_int(chunking_section.get("size"))
                if size_value and size_value > 0:
                    chunk_size = size_value
                overlap_value = _coerce_int(chunking_section.get("overlap"))
                if overlap_value is not None and overlap_value >= 0:
                    chunk_overlap = overlap_value

            scope_filters: List[str] = []
            raw_filters = raw_index.get("scope_filters")
            if isinstance(raw_filters, (list, tuple)):
                scope_filters = _normalise_list(raw_filters)
            elif isinstance(raw_filters, str):
                scope_filters = _normalise_list(raw_filters.split(","))

            seed_sets: List[str] = []
            raw_seed_sets = raw_index.get("seed_sets")
            if isinstance(raw_seed_sets, (list, tuple)):
                seed_sets = _normalise_list(raw_seed_sets)
            elif isinstance(raw_seed_sets, str):
                seed_sets = _normalise_list(raw_seed_sets.split(","))

            results.append(
                {
                    "name": name,
                    "backend": backend,
                    "embedding_model": embedding_model,
                    "chunk_size": chunk_size,
                    "chunk_overlap": chunk_overlap,
                    "scope_filters": scope_filters,
                    "seed_sets": seed_sets,
                }
            )

    return results


@lru_cache(maxsize=1)
def get_semantic_search_settings() -> Dict[str, Any]:
    config = load_system_config()
    search = config.get("search") if isinstance(config, Mapping) else None
    semantic = search.get("semantic") if isinstance(search, Mapping) else None
    result = {
        "index": "finance_docs_v1",
        "filters_by_default": [],
        "allow_cross_entity": False,
    }

    if isinstance(semantic, Mapping):
        index_name = semantic.get("index")
        if isinstance(index_name, str) and index_name.strip():
            result["index"] = index_name.strip()
        filters = semantic.get("filters_by_default")
        if isinstance(filters, (list, tuple)):
            result["filters_by_default"] = _normalise_list(filters)
        elif isinstance(filters, str):
            result["filters_by_default"] = _normalise_list(filters.split(","))
        allow_cross = _coerce_bool(semantic.get("allow_cross_entity"))
        if allow_cross is not None:
            result["allow_cross_entity"] = allow_cross

    return result


@lru_cache(maxsize=1)
def get_retrieval_settings() -> Dict[str, Any]:
    config = load_system_config()
    knowledge = config.get("knowledge") if isinstance(config, Mapping) else None
    retrieval = knowledge.get("retrieval") if isinstance(knowledge, Mapping) else None

    result = dict(_DEFAULT_RETRIEVAL_SETTINGS)

    if isinstance(retrieval, Mapping):
        reranker = retrieval.get("reranker")
        if isinstance(reranker, str) and reranker.strip():
            result["reranker"] = reranker.strip()

        top_k = _coerce_int(retrieval.get("top_k"))
        if top_k is not None and top_k > 0:
            result["top_k"] = top_k

        min_conf = _coerce_float(retrieval.get("min_citation_confidence"))
        if min_conf is not None:
            bounded = max(0.0, min(1.0, float(min_conf)))
            result["min_citation_confidence"] = bounded

        policy = retrieval.get("policy") if isinstance(retrieval, Mapping) else None
        if isinstance(policy, Mapping):
            require = _coerce_bool(policy.get("require_citation"))
            if require is not None:
                result["require_citation"] = require

    return result
