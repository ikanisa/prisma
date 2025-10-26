"""Application settings powered by Pydantic models.

This module provides a typed facade over the legacy YAML configuration file so
that services can rely on a single source of truth with environment overrides.
"""
from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, Iterable, List, Mapping, MutableMapping, Optional

import yaml
from pydantic import BaseModel, Field


_TRUTHY = {"1", "true", "yes", "on"}
_FALSY = {"0", "false", "no", "off"}


def _resolve_config_path() -> Path:
    override = os.getenv("SYSTEM_CONFIG_PATH")
    if override:
        candidate = Path(override).expanduser()
        if candidate.is_dir():
            return candidate / "system.yaml"
        if candidate.suffix:
            return candidate
        return candidate / "system.yaml"
    return Path(__file__).resolve().parents[1] / "config" / "system.yaml"


def _expand_env_values(value: Any) -> Any:
    if isinstance(value, str):
        return os.path.expandvars(value)
    if isinstance(value, list):
        return [_expand_env_values(item) for item in value]
    if isinstance(value, dict):
        return {key: _expand_env_values(val) for key, val in value.items()}
    return value


def _read_bool_env(name: str) -> Optional[bool]:
    """Interpret an environment variable as a boolean flag."""

    raw = os.getenv(name)
    if raw is None:
        return None
    value = raw.strip().lower()
    if value in _TRUTHY:
        return True
    if value in _FALSY:
        return False
    return None


class TraceExporterConfig(BaseModel):
    """Configuration for an OpenTelemetry trace exporter."""

    name: str = "default"
    protocol: str = "otlp_http"
    endpoint: Optional[str] = None
    endpoint_env: Optional[str] = Field(default=None, description="Environment variable containing endpoint")
    headers: Dict[str, str] = Field(default_factory=dict)
    headers_env: Optional[str] = Field(default=None, description="Environment variable for comma separated headers")

    def resolved_endpoint(self) -> Optional[str]:
        if self.endpoint_env:
            env_value = os.getenv(self.endpoint_env)
            if env_value:
                return env_value.strip()
        return (self.endpoint or "").strip() or None

    def resolved_headers(self) -> Dict[str, str]:
        resolved: Dict[str, str] = dict(self.headers)
        if self.headers_env:
            raw = os.getenv(self.headers_env)
            if raw:
                parts = [segment.strip() for segment in raw.split(",") if segment.strip()]
                for part in parts:
                    if "=" not in part:
                        continue
                    key, value = part.split("=", 1)
                    resolved[key.strip()] = value.strip()
        return resolved


class TelemetrySettings(BaseModel):
    """Runtime telemetry configuration shared across services."""

    namespace: str = "prisma-glow"
    default_service: str = "backend-api"
    default_environment_env: Optional[str] = "SENTRY_ENVIRONMENT"
    dashboards: List[str] = Field(default_factory=list)
    traces: List[TraceExporterConfig] = Field(default_factory=list)
    disabled_environments: List[str] = Field(
        default_factory=lambda: ["development", "test", "local"]
    )
    require_exporter: bool = True

    def resolve_environment(self, *, fallback: Optional[str] = None) -> str:
        if self.default_environment_env:
            env_value = os.getenv(self.default_environment_env)
            if env_value:
                return env_value
        if fallback:
            return fallback
        return os.getenv("ENVIRONMENT", "development")

    def first_active_trace_exporter(self) -> Optional[TraceExporterConfig]:
        for exporter in self.traces:
            if exporter.resolved_endpoint():
                return exporter
        return None

    def should_enable_tracing(self, *, environment: Optional[str]) -> bool:
        """Determine whether distributed tracing should be initialised."""

        if _read_bool_env("OTEL_FORCE_ENABLED") is True:
            return True
        if _read_bool_env("OTEL_SDK_DISABLED") is True:
            return False

        env_value = (environment or self.resolve_environment()).strip().lower()
        if env_value and any(env_value == entry.strip().lower() for entry in self.disabled_environments):
            return False

        exporter = self.first_active_trace_exporter()
        if not exporter or not exporter.resolved_endpoint():
            if self.require_exporter and _read_bool_env("OTEL_FORCE_ENABLED") is not True:
                return False
        return True


class OpenAIClientSettings(BaseModel):
    """Resolved OpenAI client configuration."""

    api_key: Optional[str] = None
    base_url: str = "https://api.openai.com/v1"
    organization: Optional[str] = None
    timeout_seconds: float = 60.0
    user_agent_tag: str = "prisma-glow-15"
    max_retries: Optional[int] = None
    default_headers: Dict[str, str] = Field(default_factory=dict)
    key_env: str = "OPENAI_API_KEY"

    def _resolve_api_key(self, overrides: Optional[Mapping[str, Any]]) -> str:
        if overrides and overrides.get("api_key"):
            return str(overrides["api_key"])
        if self.api_key:
            return self.api_key
        primary = os.getenv(self.key_env)
        if primary:
            return primary
        fallback = os.getenv("OPENAI_API_KEY")
        if fallback:
            return fallback
        raise RuntimeError("OpenAI API key must be configured")

    def client_options(self, overrides: Optional[Mapping[str, Any]] = None) -> Dict[str, Any]:
        overrides = dict(overrides or {})
        api_key = self._resolve_api_key(overrides)
        base_url = str(overrides.pop("base_url", None) or self.base_url)
        timeout = overrides.pop("timeout", None) or self.timeout_seconds
        organization = overrides.pop("organization", None) or self.organization
        max_retries = overrides.pop("max_retries", None) or self.max_retries
        user_agent = overrides.pop("user_agent", None) or self.user_agent_tag
        header_overrides = overrides.pop("default_headers", None) or {}

        headers = {**self.default_headers}
        headers.setdefault("x-openai-user-agent", user_agent)
        headers.update({str(key): str(value) for key, value in header_overrides.items()})

        options: Dict[str, Any] = {
            "api_key": api_key,
            "base_url": base_url,
            "timeout": float(timeout),
            "default_headers": headers,
        }
        if organization:
            options["organization"] = organization
        if max_retries is not None:
            options["max_retries"] = max_retries
        options.update(overrides)
        return options


class WorkflowStep(BaseModel):
    agent_id: Optional[str] = None
    tool: Optional[str] = None
    required_autonomy: Optional[str] = None


class WorkflowDefinition(BaseModel):
    key: str
    trigger: Optional[str] = None
    required_documents: Dict[str, List[str]] = Field(default_factory=dict)
    steps: List[WorkflowStep] = Field(default_factory=list)
    approvals: List[str] = Field(default_factory=list)
    outputs: List[str] = Field(default_factory=list)
    minimum_autonomy: Optional[str] = None


class WorkflowsSettings(BaseModel):
    definitions: Dict[str, WorkflowDefinition] = Field(default_factory=dict)
    default_autonomy: str = "L2"
    enabled: bool = True
    disabled_environments: List[str] = Field(default_factory=list)

    def is_enabled(self, *, environment: Optional[str] = None) -> bool:
        """Return True when workflow orchestration should be active."""

        if _read_bool_env("ENABLE_WORKFLOWS") is True:
            return True
        if _read_bool_env("DISABLE_WORKFLOWS") is True:
            return False
        if not self.enabled:
            return False
        environment = environment or os.getenv("SENTRY_ENVIRONMENT") or os.getenv("ENVIRONMENT")
        if not environment:
            return True
        env_value = environment.strip().lower()
        return not any(env_value == entry.strip().lower() for entry in self.disabled_environments)


class AgentDefinition(BaseModel):
    id: str
    title: Optional[str] = None
    autonomy: Optional[str] = None
    tools: List[str] = Field(default_factory=list)
    approvals: List[str] = Field(default_factory=list)


class AutonomySettings(BaseModel):
    default_level: str = "L2"
    levels: Dict[str, str] = Field(default_factory=dict)
    autopilot_allowances: Dict[str, List[str]] = Field(default_factory=dict)


class SystemSettings(BaseModel):
    """Runtime settings derived from the YAML configuration."""

    raw: Mapping[str, Any]
    openai: OpenAIClientSettings
    workflows: WorkflowsSettings
    agents: Dict[str, AgentDefinition]
    autonomy: AutonomySettings
    telemetry: TelemetrySettings
    source_path: Path

    @classmethod
    def from_mapping(cls, data: Mapping[str, Any], *, source_path: Path) -> "SystemSettings":
        openai_settings = cls._build_openai_settings(data)
        workflows_settings = cls._build_workflows_settings(data)
        agents = cls._build_agent_registry(data)
        autonomy_settings = cls._build_autonomy_settings(data)
        telemetry_settings = cls._build_telemetry_settings(data)
        return cls(
            raw=data,
            openai=openai_settings,
            workflows=workflows_settings,
            agents=agents,
            autonomy=autonomy_settings,
            telemetry=telemetry_settings,
            source_path=source_path,
        )

    @staticmethod
    def _build_openai_settings(data: Mapping[str, Any]) -> OpenAIClientSettings:
        section = data.get("openai") if isinstance(data, Mapping) else None
        defaults = {
            "base_url": "https://api.openai.com/v1",
            "timeout_seconds": float(os.getenv("OPENAI_TIMEOUT_SECONDS", "60")),
            "user_agent_tag": os.getenv("OPENAI_USER_AGENT_TAG", "prisma-glow-15"),
        }
        key_env = "OPENAI_API_KEY"
        if isinstance(section, Mapping):
            api_base = section.get("api_base")
            if isinstance(api_base, str) and api_base.strip():
                defaults["base_url"] = api_base.strip()
            timeout = section.get("timeout_seconds")
            if isinstance(timeout, (int, float)):
                defaults["timeout_seconds"] = float(timeout)
            user_agent_tag = section.get("user_agent_tag") or section.get("user_agent")
            if isinstance(user_agent_tag, str) and user_agent_tag.strip():
                defaults["user_agent_tag"] = user_agent_tag.strip()
            key_candidate = section.get("key_ref")
            if isinstance(key_candidate, str) and key_candidate.strip():
                key_env = key_candidate.strip()
            organization = section.get("organization")
            if isinstance(organization, str) and organization.strip():
                defaults["organization"] = organization.strip()
            max_retries = section.get("max_retries")
            if isinstance(max_retries, int):
                defaults["max_retries"] = max_retries
            headers = section.get("default_headers")
            if isinstance(headers, Mapping):
                defaults["default_headers"] = {str(k): str(v) for k, v in headers.items()}

        api_key = os.getenv(key_env) or os.getenv("OPENAI_API_KEY")
        organization_env = os.getenv("OPENAI_ORG_ID")
        if organization_env:
            defaults["organization"] = organization_env
        base_url_env = os.getenv("OPENAI_BASE_URL")
        if base_url_env:
            defaults["base_url"] = base_url_env

        return OpenAIClientSettings(api_key=api_key, key_env=key_env, **defaults)

    @staticmethod
    def _build_agent_registry(data: Mapping[str, Any]) -> Dict[str, AgentDefinition]:
        agents_section = data.get("agents") if isinstance(data, Mapping) else None
        registry: Dict[str, AgentDefinition] = {}
        if isinstance(agents_section, Iterable):
            for entry in agents_section:
                if not isinstance(entry, Mapping):
                    continue
                agent_id = str(entry.get("id") or "").strip()
                if not agent_id:
                    continue
                tools = entry.get("tools") if isinstance(entry.get("tools"), list) else entry.get("tools")
                tool_list: List[str] = []
                if isinstance(tools, Iterable):
                    for tool in tools:
                        if isinstance(tool, str) and tool.strip():
                            tool_list.append(tool.strip())
                approvals_raw = entry.get("approvals")
                approvals: List[str] = []
                if isinstance(approvals_raw, Iterable):
                    for approval in approvals_raw:
                        if isinstance(approval, str) and approval.strip():
                            approvals.append(approval.strip())
                registry[agent_id] = AgentDefinition(
                    id=agent_id,
                    title=(entry.get("title") or None) if isinstance(entry.get("title"), str) else None,
                    autonomy=(entry.get("autonomy") or None) if isinstance(entry.get("autonomy"), str) else None,
                    tools=tool_list,
                    approvals=approvals,
                )
        return registry

    @staticmethod
    def _build_autonomy_settings(data: Mapping[str, Any]) -> AutonomySettings:
        section = data.get("autonomy") if isinstance(data, Mapping) else None
        default_level = "L2"
        levels: Dict[str, str] = {}
        autopilot: Dict[str, List[str]] = {}
        if isinstance(section, Mapping):
            default_raw = section.get("default_level")
            if isinstance(default_raw, str) and default_raw.strip():
                default_level = default_raw.strip().upper()
            levels_raw = section.get("levels")
            if isinstance(levels_raw, Mapping):
                for key, value in levels_raw.items():
                    if isinstance(key, str) and isinstance(value, str):
                        levels[key.strip().upper()] = value.strip()
            autopilot_raw = section.get("autopilot")
            if isinstance(autopilot_raw, Mapping):
                allowed = autopilot_raw.get("allowed_jobs")
                if isinstance(allowed, Mapping):
                    for key, value in allowed.items():
                        key_text = str(key or "").strip().upper()
                        if not key_text:
                            continue
                        job_list: List[str] = []
                        if isinstance(value, Iterable):
                            for entry in value:
                                if isinstance(entry, str) and entry.strip():
                                    job_list.append(entry.strip())
                        autopilot[key_text] = job_list
        return AutonomySettings(default_level=default_level, levels=levels, autopilot_allowances=autopilot)

    @classmethod
    def _build_workflows_settings(cls, data: Mapping[str, Any]) -> WorkflowsSettings:
        def _normalise_list(values: Iterable[Any]) -> List[str]:
            result: List[str] = []
            for value in values or []:  # type: ignore[arg-type]
                if value is None:
                    continue
                if isinstance(value, str):
                    text = value.strip()
                else:
                    text = str(value).strip()
                if not text or text in result:
                    continue
                result.append(text)
            return result

        def _coerce_autonomy(value: Optional[str], default: str) -> str:
            if isinstance(value, str):
                candidate = value.strip().upper()
                if candidate:
                    return candidate
            return default

        workflows_section = data.get("workflows") if isinstance(data, Mapping) else None
        registry = cls._build_agent_registry(data)

        enabled = True
        disabled_environments: List[str] = []
        definitions_source: Mapping[str, Any] | None = None
        if isinstance(workflows_section, Mapping):
            enabled_value = workflows_section.get("enabled")
            if isinstance(enabled_value, bool):
                enabled = enabled_value
            elif isinstance(enabled_value, str):
                normalised = enabled_value.strip().lower()
                if normalised in _TRUTHY:
                    enabled = True
                elif normalised in _FALSY:
                    enabled = False
            disabled_envs_raw = workflows_section.get("disabled_environments")
            if isinstance(disabled_envs_raw, Iterable):
                disabled_environments = _normalise_list(disabled_envs_raw)
            maybe_definitions = workflows_section.get("definitions")
            if isinstance(maybe_definitions, Mapping):
                definitions_source = maybe_definitions
        if definitions_source is None and isinstance(workflows_section, Mapping):
            definitions_source = {
                key: value
                for key, value in workflows_section.items()
                if key not in {"enabled", "disabled_environments", "definitions"}
            }
        elif definitions_source is None:
            definitions_source = {}

        tool_registry: Dict[str, List[str]] = {}
        for agent in registry.values():
            for tool in agent.tools:
                key = tool.lower()
                tool_registry.setdefault(key, []).append(agent.id)

        autonomy_section = data.get("autonomy") if isinstance(data, Mapping) else None
        default_autonomy = "L2"
        if isinstance(autonomy_section, Mapping):
            default_raw = autonomy_section.get("default_level")
            if isinstance(default_raw, str) and default_raw.strip():
                default_autonomy = default_raw.strip().upper()
        level_order = {"L0": 0, "L1": 1, "L2": 2, "L3": 3}
        minimum_rank_default = level_order.get(default_autonomy, 0)

        workflow_models: Dict[str, WorkflowDefinition] = {}
        if isinstance(definitions_source, Mapping):
            for key, value in definitions_source.items():
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
                        required_docs[str(category)] = _normalise_list(items if isinstance(items, Iterable) else [])

                approvals = _normalise_list(value.get("approvals") if isinstance(value.get("approvals"), Iterable) else [])
                single_approval = value.get("approval")
                if isinstance(single_approval, str) and single_approval.strip() and single_approval.strip() not in approvals:
                    approvals.append(single_approval.strip())

                outputs = _normalise_list(value.get("outputs") if isinstance(value.get("outputs"), Iterable) else [])
                steps: List[WorkflowStep] = []
                minimum_autonomy = default_autonomy
                minimum_rank = minimum_rank_default

                step_entries = value.get("steps")
                if isinstance(step_entries, Iterable):
                    for entry in step_entries:
                        agent_id: Optional[str] = None
                        tool_name: Optional[str] = None
                        if isinstance(entry, str):
                            tool_name = entry.strip()
                            if not tool_name:
                                continue
                            candidates = tool_registry.get(tool_name.lower(), [])
                            agent_id = candidates[0] if candidates else None
                        elif isinstance(entry, Mapping):
                            agent_raw, tool_raw = next(iter(entry.items()))  # type: ignore[call-arg]
                            agent_id = str(agent_raw or "").strip() or None
                            tool_name = str(tool_raw or "").strip() or None
                            if not tool_name:
                                continue
                        else:
                            continue

                        agent_definition = registry.get(agent_id) if agent_id else None
                        candidate_autonomy = (
                            agent_definition.autonomy if agent_definition and agent_definition.autonomy else None
                        )
                        required_autonomy = _coerce_autonomy(candidate_autonomy, default_autonomy)
                        steps.append(
                            WorkflowStep(
                                agent_id=agent_id or tool_name,
                                tool=tool_name,
                                required_autonomy=required_autonomy,
                            )
                        )
                        rank = level_order.get(required_autonomy, minimum_rank)
                        if rank > minimum_rank:
                            minimum_rank = rank
                            minimum_autonomy = required_autonomy

                workflow_models[workflow_key] = WorkflowDefinition(
                    key=workflow_key,
                    trigger=trigger,
                    required_documents=required_docs,
                    steps=steps,
                    approvals=approvals,
                    outputs=outputs,
                    minimum_autonomy=minimum_autonomy,
                )

        return WorkflowsSettings(
            definitions=workflow_models,
            default_autonomy=default_autonomy,
            enabled=enabled,
            disabled_environments=disabled_environments,
        )

    @staticmethod
    def _build_telemetry_settings(data: Mapping[str, Any]) -> TelemetrySettings:
        section = data.get("telemetry") if isinstance(data, Mapping) else None
        namespace = "prisma-glow"
        default_service = "backend-api"
        dashboards: List[str] = []
        default_env_var: Optional[str] = "SENTRY_ENVIRONMENT"
        exporters: List[TraceExporterConfig] = []
        disabled_envs: List[str] = ["development", "test", "local"]
        require_exporter = True
        if isinstance(section, Mapping):
            namespace_raw = section.get("namespace")
            if isinstance(namespace_raw, str) and namespace_raw.strip():
                namespace = namespace_raw.strip()
            service_raw = section.get("default_service")
            if isinstance(service_raw, str) and service_raw.strip():
                default_service = service_raw.strip()
            dashboards_raw = section.get("dashboards")
            if isinstance(dashboards_raw, Iterable):
                for entry in dashboards_raw:
                    if isinstance(entry, str) and entry.strip():
                        dashboards.append(entry.strip())
            env_ref = section.get("default_environment_env")
            if isinstance(env_ref, str) and env_ref.strip():
                default_env_var = env_ref.strip()
            disabled_raw = section.get("disabled_environments")
            if isinstance(disabled_raw, Iterable):
                disabled_envs = [
                    entry.strip()
                    for entry in disabled_raw
                    if isinstance(entry, str) and entry.strip()
                ] or disabled_envs
            require_exporter_raw = section.get("require_exporter")
            if isinstance(require_exporter_raw, bool):
                require_exporter = require_exporter_raw
            elif isinstance(require_exporter_raw, str):
                normalised = require_exporter_raw.strip().lower()
                if normalised in _TRUTHY:
                    require_exporter = True
                elif normalised in _FALSY:
                    require_exporter = False
            exporters_raw = section.get("exporters")
            if isinstance(exporters_raw, Mapping):
                traces_section = exporters_raw.get("traces")
                if isinstance(traces_section, Iterable):
                    for entry in traces_section:
                        if not isinstance(entry, Mapping):
                            continue
                        exporters.append(
                            TraceExporterConfig(
                                name=str(entry.get("name") or "default"),
                                protocol=str(entry.get("protocol") or "otlp_http"),
                                endpoint=entry.get("endpoint"),
                                endpoint_env=entry.get("endpoint_env"),
                                headers={str(k): str(v) for k, v in (entry.get("headers") or {}).items()}
                                if isinstance(entry.get("headers"), Mapping)
                                else {},
                                headers_env=entry.get("headers_env"),
                            )
                        )
        return TelemetrySettings(
            namespace=namespace,
            default_service=default_service,
            default_environment_env=default_env_var,
            dashboards=dashboards,
            traces=exporters,
            disabled_environments=disabled_envs,
            require_exporter=require_exporter,
        )

    @classmethod
    def load(cls, path: Optional[Path] = None) -> "SystemSettings":
        config_path = path or _resolve_config_path()
        try:
            with config_path.open("r", encoding="utf-8") as handle:
                loaded = yaml.safe_load(handle) or {}
        except FileNotFoundError:
            loaded = {}
        expanded = _expand_env_values(loaded)
        if not isinstance(expanded, MutableMapping):
            expanded = {}
        return cls.from_mapping(expanded, source_path=config_path)


@lru_cache(maxsize=1)
def get_system_settings() -> SystemSettings:
    """Return a cached instance of :class:`SystemSettings`."""

    return SystemSettings.load()
