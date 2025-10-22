"""Analytics event schema helpers shared across services."""

from __future__ import annotations

import json
from dataclasses import dataclass
from importlib import resources
from typing import Any, Dict, Mapping, MutableMapping, Optional

from jsonschema import Draft7Validator

_SCHEMA_RESOURCE = "schema.json"


@dataclass(slots=True)
class AnalyticsEvent:
    """Validated analytics event payload."""

    name: str
    properties: Dict[str, Any]


class AnalyticsEventValidationError(ValueError):
    """Raised when an analytics event fails schema validation."""

    def __init__(self, name: str, errors: list[str]):
        message = f"Invalid analytics event '{name}': {'; '.join(errors)}"
        super().__init__(message)
        self.event_name = name
        self.errors = errors


def _load_schema() -> Dict[str, Any]:
    with resources.files(__package__).joinpath(_SCHEMA_RESOURCE).open("r", encoding="utf-8") as handle:
        return json.load(handle)


_SCHEMA = _load_schema()
_VALIDATOR = Draft7Validator(_SCHEMA)

_ALLOWED_SEVERITIES = {"INFO", "WARNING", "ERROR", "CRITICAL"}
_ALLOWED_DECISIONS = {"APPROVED", "REVIEW", "REFUSED"}


def _validate(event: Mapping[str, Any]) -> AnalyticsEvent:
    errors = [error.message for error in _VALIDATOR.iter_errors(event)]
    if errors:
        raise AnalyticsEventValidationError(str(event.get("name", "unknown")), errors)
    name = str(event["name"])
    properties = dict(event["properties"])
    return AnalyticsEvent(name=name, properties=properties)


def build_telemetry_alert_event(*,
    alert_type: str,
    severity: str,
    message: str,
    org_id: Optional[str] = None,
    context: Optional[Mapping[str, Any]] = None,
    resolved_at: Optional[str] = None,
) -> AnalyticsEvent:
    """Create and validate a telemetry alert event."""

    payload: MutableMapping[str, Any] = {
        "alertType": alert_type,
        "severity": severity.upper(),
        "message": message,
        "orgId": org_id,
        "context": dict(context or {}),
        "resolvedAt": resolved_at,
    }
    event = {"name": "telemetry.alert", "properties": payload}
    validated = _validate(event)
    if validated.properties.get("severity") not in _ALLOWED_SEVERITIES:
        raise AnalyticsEventValidationError(
            validated.name,
            [f"severity must be one of {sorted(_ALLOWED_SEVERITIES)}"],
        )
    return validated


def telemetry_alert_row(event: AnalyticsEvent) -> Dict[str, Any]:
    """Convert a validated telemetry alert into a database row."""

    if event.name != "telemetry.alert":
        raise AnalyticsEventValidationError(event.name, ["expected telemetry.alert event"])
    props = event.properties
    context = props.get("context") or {}
    return {
        "org_id": props.get("orgId"),
        "alert_type": props["alertType"],
        "severity": props["severity"],
        "message": props["message"],
        "context": context,
        "resolved_at": props.get("resolvedAt"),
    }


def build_autonomy_telemetry_event(*,
    org_id: str,
    module: str,
    scenario: str,
    decision: str,
    metrics: Mapping[str, Any],
    actor: Optional[str] = None,
) -> AnalyticsEvent:
    """Create and validate an autonomy telemetry event."""

    payload: MutableMapping[str, Any] = {
        "orgId": org_id,
        "module": module,
        "scenario": scenario,
        "decision": decision.upper(),
        "metrics": dict(metrics),
        "actor": actor,
    }
    event = {"name": "telemetry.autonomy_event", "properties": payload}
    validated = _validate(event)
    if validated.properties.get("decision") not in _ALLOWED_DECISIONS:
        raise AnalyticsEventValidationError(
            validated.name,
            [f"decision must be one of {sorted(_ALLOWED_DECISIONS)}"],
        )
    return validated


def autonomy_telemetry_row(event: AnalyticsEvent) -> Dict[str, Any]:
    """Convert a validated autonomy telemetry event into a database row."""

    if event.name != "telemetry.autonomy_event":
        raise AnalyticsEventValidationError(event.name, ["expected telemetry.autonomy_event event"])
    props = event.properties
    return {
        "org_id": props["orgId"],
        "module": props["module"],
        "scenario": props["scenario"],
        "decision": props["decision"],
        "metrics": props["metrics"],
        "actor": props.get("actor"),
    }


__all__ = [
    "AnalyticsEvent",
    "AnalyticsEventValidationError",
    "build_telemetry_alert_event",
    "telemetry_alert_row",
    "build_autonomy_telemetry_event",
    "autonomy_telemetry_row",
]
