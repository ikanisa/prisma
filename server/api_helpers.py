"""Shared API helper functions for routers"""
import os
import time
from typing import Any, Dict, List, Optional, Iterable, Set, Mapping
from datetime import datetime
from pathlib import Path
from functools import lru_cache
import json

import jwt
import httpx
import structlog
from fastapi import Header, HTTPException, status

from .config_loader import (
    get_config_permission_map,
    get_default_autonomy_level,
    get_autonomy_job_allowances,
    get_client_portal_scope,
    get_role_rank_map,
)

logger = structlog.get_logger(__name__)

# Constants
AUTONOMY_LEVEL_RANK = {"L0": 0, "L1": 1, "L2": 2, "L3": 3}
LEGACY_AUTONOMY_NUMERIC_MAP = {0: "L0", 1: "L1", 2: "L2", 3: "L3", 4: "L3", 5: "L3"}
PERMISSION_CONFIG_PATH = Path(__file__).resolve().parents[1] / "POLICY" / "permissions.json"

# Environment variables
JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")
JWT_AUDIENCE = os.getenv("SUPABASE_JWT_AUDIENCE", "authenticated")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL:
    raise RuntimeError("SUPABASE_URL is required to validate organization access.")
if not SUPABASE_SERVICE_ROLE_KEY:
    raise RuntimeError("SUPABASE_SERVICE_ROLE_KEY is required for organization validation.")

SUPABASE_REST_URL = SUPABASE_URL.rstrip("/") + "/rest/v1"
SUPABASE_HEADERS = {
    "apikey": SUPABASE_SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
    "Accept": "application/json",
}


# Rate Limiter
class UserRateLimiter:
    def __init__(self, limit: int, window: float = 60.0) -> None:
        self.limit = limit
        self.window = window
        self.calls: Dict[str, List[float]] = {}

    def allow(self, key: str) -> bool:
        now = time.time()
        window_start = now - self.window
        timestamps = [ts for ts in self.calls.get(key, []) if ts > window_start]
        if len(timestamps) >= self.limit:
            self.calls[key] = timestamps
            return False
        timestamps.append(now)
        self.calls[key] = timestamps
        return True


api_rate_limiter = UserRateLimiter(
    limit=int(os.getenv("API_RATE_LIMIT", "60")),
    window=float(os.getenv("API_RATE_WINDOW_SECONDS", "60")),
)


# Authentication
def verify_supabase_jwt(token: str) -> Dict[str, Any]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=["HS256"], audience=JWT_AUDIENCE)
    except jwt.PyJWTError as exc:
        logger.warning("auth.invalid_token", error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid access token"
        ) from exc


async def require_auth(authorization: str = Header(...)) -> Dict[str, Any]:
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing Bearer token",
        )

    token = authorization.split(" ", 1)[1]
    payload = verify_supabase_jwt(token)
    user_id = payload.get("sub") or "anonymous"

    if not api_rate_limiter.allow(user_id):
        logger.warning("rate.limit_exceeded", user_id=user_id)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="API rate limit exceeded"
        )

    logger.info("auth.accepted", user_id=user_id)
    return payload


# Role and permission helpers
def normalise_role(value: Optional[str]) -> str:
    return (value or "").upper()


def get_default_autonomy_level_value() -> str:
    return get_default_autonomy_level()


def normalise_autonomy_level(value: Optional[str]) -> str:
    default_level = get_default_autonomy_level_value()
    if isinstance(value, str):
        candidate = value.strip().upper()
        if candidate in AUTONOMY_LEVEL_RANK:
            return candidate
    return default_level


def get_role_rank_map_config() -> Dict[str, int]:
    return get_role_rank_map()


def _client_scope_settings() -> Mapping[str, Any]:
    scope = get_client_portal_scope()
    return scope if isinstance(scope, Mapping) else {}


def get_role_deny_actions() -> Dict[str, Set[str]]:
    scope = _client_scope_settings()
    denied = scope.get("denied_actions")
    result: Dict[str, Set[str]] = {}
    if isinstance(denied, Mapping):
        for role, entries in denied.items():
            if not role:
                continue
            role_key = str(role).upper()
            if isinstance(entries, Iterable) and not isinstance(entries, (str, bytes)):
                result[role_key] = {str(item) for item in entries if item}
            else:
                result[role_key] = set()
    elif isinstance(denied, Iterable) and not isinstance(denied, (str, bytes)):
        result["CLIENT"] = {str(item) for item in denied if item}
    if "CLIENT" not in result:
        result["CLIENT"] = set()
    return result


@lru_cache(maxsize=1)
def _permission_map_snapshot() -> Dict[str, str]:
    merged: Dict[str, str] = {}
    try:
        with PERMISSION_CONFIG_PATH.open("r", encoding="utf-8") as handle:
            data = json.load(handle)
            if isinstance(data, dict):
                for key, value in data.items():
                    if key is None or value is None:
                        continue
                    merged[str(key)] = str(value).upper()
    except FileNotFoundError:
        logger.warning("permissions.config_missing", path=str(PERMISSION_CONFIG_PATH))
    except Exception as exc:
        logger.error("permissions.config_error", error=str(exc), path=str(PERMISSION_CONFIG_PATH))

    config_permissions = get_config_permission_map()
    for key, value in config_permissions.items():
        merged[str(key)] = str(value).upper()

    return merged


def get_permission_map_snapshot() -> Dict[str, str]:
    return dict(_permission_map_snapshot())


def get_required_role_for_permission(permission: str) -> Optional[str]:
    permission_map = get_permission_map_snapshot()
    required = permission_map.get(permission)
    return normalise_role(required) if isinstance(required, str) else None


def has_permission(role: Optional[str], permission: str) -> bool:
    normalized_role = normalise_role(role)
    required = get_required_role_for_permission(permission)
    if not required:
        return True
    ranks = get_role_rank_map_config()
    return ranks.get(normalized_role, 0) >= ranks.get(required, 0)


def is_action_denied_for_role(role: str, permission: str) -> bool:
    deny_map = get_role_deny_actions()
    denied = deny_map.get(role)
    return permission in denied if denied else False


def ensure_permission_for_role(role: Optional[str], permission: str) -> None:
    normalized_role = normalise_role(role)
    if is_action_denied_for_role(normalized_role, permission):
        raise HTTPException(status_code=403, detail="action_denied_for_role")
    if not has_permission(normalized_role, permission):
        raise HTTPException(status_code=403, detail="insufficient_permission")


# Supabase helpers
async def supabase_table_request(
    method: str,
    table: str,
    *,
    params: Optional[Dict[str, Any]] = None,
    json: Optional[Any] = None,
    headers: Optional[Dict[str, str]] = None,
) -> httpx.Response:
    request_headers = SUPABASE_HEADERS.copy()
    if headers:
        request_headers.update(headers)

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.request(
            method,
            f"{SUPABASE_REST_URL}/{table}",
            params=params,
            json=json,
            headers=request_headers,
        )
    return response


async def is_system_admin_user(user_id: str) -> bool:
    response = await supabase_table_request(
        "GET", "users", params={"id": f"eq.{user_id}", "select": "is_system_admin", "limit": "1"}
    )
    if response.status_code != 200:
        logger.error(
            "supabase.users_admin_check_failed", status=response.status_code, body=response.text
        )
        raise HTTPException(status_code=502, detail="user lookup failed")
    rows = response.json()
    return bool(rows and rows[0].get("is_system_admin"))


async def guard_system_admin(actor_id: str) -> None:
    if not await is_system_admin_user(actor_id):
        raise HTTPException(status_code=403, detail="system admin required")


async def fetch_org_settings(org_id: str) -> Dict[str, Any]:
    response = await supabase_table_request(
        "GET",
        "organizations",
        params={
            "id": f"eq.{org_id}",
            "select": "id,allowed_email_domains,default_role,require_mfa_for_sensitive,impersonation_breakglass_emails",
            "limit": "1",
        },
    )
    if response.status_code != 200:
        logger.error("org.settings_fetch_failed", status=response.status_code, body=response.text)
        raise HTTPException(status_code=502, detail="organization lookup failed")
    rows = response.json()
    if not rows:
        raise HTTPException(status_code=404, detail="organization not found")
    return rows[0]


async def ensure_org_access_by_id(user_id: str, org_id: str) -> str:
    async with httpx.AsyncClient(timeout=5.0) as client:
        membership_resp = await client.get(
            f"{SUPABASE_REST_URL}/memberships",
            params={
                "org_id": f"eq.{org_id}",
                "user_id": f"eq.{user_id}",
                "select": "role",
                "limit": "1",
            },
            headers=SUPABASE_HEADERS,
        )
        if membership_resp.status_code != 200:
            logger.error(
                "supabase.membership_lookup_failed",
                status=membership_resp.status_code,
                body=membership_resp.text,
            )
            raise HTTPException(status_code=502, detail="membership lookup failed")
        membership_rows = membership_resp.json()
        if membership_rows:
            return membership_rows[0].get("role") or "EMPLOYEE"

        user_resp = await client.get(
            f"{SUPABASE_REST_URL}/users",
            params={"id": f"eq.{user_id}", "select": "is_system_admin", "limit": "1"},
            headers=SUPABASE_HEADERS,
        )
        if user_resp.status_code != 200:
            logger.error("supabase.user_lookup_failed", status=user_resp.status_code, body=user_resp.text)
            raise HTTPException(status_code=502, detail="user lookup failed")
        user_rows = user_resp.json()
        if user_rows and user_rows[0].get("is_system_admin"):
            return "SYSTEM_ADMIN"

    raise HTTPException(status_code=403, detail="forbidden")


# Activity logging
async def log_activity_event(
    *,
    org_id: str,
    actor_id: str,
    action: str,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> None:
    payload = {
        "org_id": org_id,
        "user_id": actor_id,
        "action": action,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "metadata": metadata or {},
        "module": "IAM",
    }
    response = await supabase_table_request(
        "POST", "activity_log", json=payload, headers={"Prefer": "return=minimal"}
    )
    if response.status_code not in (200, 201, 204):
        logger.error("activity.log_failed", status=response.status_code, body=response.text)


# Utility functions
def iso_now() -> str:
    return datetime.utcnow().replace(microsecond=0).isoformat() + "Z"
