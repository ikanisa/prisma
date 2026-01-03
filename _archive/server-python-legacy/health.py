"""Health and readiness utilities for the FastAPI service."""

from __future__ import annotations

import inspect
from typing import Any, Awaitable, Callable, Dict, Mapping, MutableMapping

try:
    from sqlalchemy import text as _sql_text
except ModuleNotFoundError:  # pragma: no cover - optional dependency during tests
    _sql_text = None

CheckResult = Dict[str, Any]
SessionFactory = Callable[[], Any]


def _serialise_error(exc: Exception) -> str:
    message = str(exc).strip() or exc.__class__.__name__
    return message[:197] + "..." if len(message) > 200 else message


async def check_database(session_factory: SessionFactory) -> CheckResult:
    try:
        async with session_factory() as session:  # type: ignore[func-returns-value]
            statement = _sql_text("SELECT 1") if _sql_text else "SELECT 1"
            await session.execute(statement)
        return {"status": "ok"}
    except Exception as exc:  # pragma: no cover - defensive, captured in tests
        return {"status": "error", "detail": _serialise_error(exc)}


def check_redis(redis_client: Any) -> CheckResult:
    try:
        if redis_client is None:
            raise RuntimeError("redis_not_configured")
        redis_client.ping()
        return {"status": "ok"}
    except Exception as exc:  # pragma: no cover - defensive, captured in tests
        return {"status": "error", "detail": _serialise_error(exc)}


async def build_readiness_report(
    session_factory: SessionFactory,
    redis_client: Any,
    extra_checks: Mapping[str, Callable[[], Awaitable[CheckResult] | CheckResult]] | None = None,
) -> Dict[str, Any]:
    checks: MutableMapping[str, CheckResult] = {
        "database": await check_database(session_factory),
        "redis": check_redis(redis_client),
    }

    if extra_checks:
        for name, check in extra_checks.items():
            try:
                result = check()
                if inspect.isawaitable(result):
                    result = await result  # type: ignore[assignment]
                checks[name] = result
            except Exception as exc:  # pragma: no cover - defensive
                checks[name] = {"status": "error", "detail": _serialise_error(exc)}

    status_value = "ok" if all(entry.get("status") == "ok" for entry in checks.values()) else "degraded"
    return {"status": status_value, "checks": dict(checks)}
