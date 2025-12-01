import os
from typing import Any, Dict, Optional, Set
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

import structlog
from fastapi import HTTPException

from .api_helpers import (
    supabase_table_request,
    normalise_role,
    get_role_rank_map_config,
    is_system_admin_user,
)
from .config_loader import get_managerial_roles

logger = structlog.get_logger(__name__)

INVITE_ACCEPT_BASE_URL = os.getenv("INVITE_ACCEPT_BASE_URL", "https://app.prismaglow.com/auth/accept-invite")
TEAM_ROLE_VALUES = {"LEAD", "MEMBER", "VIEWER"}

def build_invite_link(token: str) -> str:
    try:
        parsed = urlparse(INVITE_ACCEPT_BASE_URL)
    except ValueError:
        return f"{INVITE_ACCEPT_BASE_URL}?token={token}"

    query = dict(parse_qsl(parsed.query, keep_blank_values=True))
    query["token"] = token
    new_query = urlencode(query)
    return urlunparse(parsed._replace(query=new_query))

async def upsert_user_profile(user_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
    payload = {"id": user_id}
    payload.update(updates)
    response = await supabase_table_request("POST", "user_profiles", json=payload, headers={"Prefer": "resolution=merge-duplicates,return=representation"})
    if response.status_code not in (200, 201):
        logger.error("supabase.user_profile_upsert_failed", status=response.status_code, body=response.text)
        raise HTTPException(status_code=502, detail="profile update failed")
    rows = response.json()
    return rows[0] if rows else payload

async def fetch_membership(org_id: str, user_id: str) -> Optional[Dict[str, Any]]:
    response = await supabase_table_request(
        "GET",
        "memberships",
        params={
            "org_id": f"eq.{org_id}",
            "user_id": f"eq.{user_id}",
            "select": "id,role,autonomy_floor,autonomy_ceiling,is_service_account,client_portal_allowed_repos,client_portal_denied_actions",
            "limit": "1",
        },
    )
    if response.status_code != 200:
        logger.error("supabase.membership_fetch_failed", status=response.status_code, body=response.text)
        raise HTTPException(status_code=502, detail="membership lookup failed")
    rows = response.json()
    return rows[0] if rows else None

async def count_managerial_members(org_id: str) -> int:
    response = await supabase_table_request("GET", "memberships", params={"org_id": f"eq.{org_id}", "role": "in.(MANAGER,PARTNER,SYSTEM_ADMIN,EQR)", "select": "id"})
    if response.status_code != 200:
        logger.error("supabase.membership_count_failed", status=response.status_code, body=response.text)
        raise HTTPException(status_code=502, detail="membership lookup failed")
    return len(response.json())

def get_org_role_values() -> Set[str]:
    return set(get_role_rank_map_config().keys())

def validate_org_role(role: str) -> str:
    value = normalise_role(role)
    if value not in get_org_role_values():
        raise HTTPException(status_code=400, detail="invalid role")
    return value

def validate_team_role(role: Optional[str]) -> str:
    value = (role or "MEMBER").upper()
    if value not in TEAM_ROLE_VALUES:
        raise HTTPException(status_code=400, detail="invalid team role")
    return value

def ensure_min_role(role: Optional[str], minimum: str) -> None:
    ranks = get_role_rank_map_config()
    current_rank = ranks.get(normalise_role(role), 0)
    required_rank = ranks.get(normalise_role(minimum), ranks.get("EMPLOYEE", 0))
    if current_rank < required_rank:
        raise HTTPException(status_code=403, detail="insufficient role")

async def guard_actor_manager(org_id: str, actor_id: str) -> str:
    actor_membership = await fetch_membership(org_id, actor_id)
    if actor_membership:
        ensure_min_role(actor_membership.get("role"), "MANAGER")
        return normalise_role(actor_membership.get("role"))
    if await is_system_admin_user(actor_id):
        return "SYSTEM_ADMIN"
    raise HTTPException(status_code=403, detail="manager privileges required")

async def fetch_single_record(table: str, record_id: str, select: str = "*") -> Optional[Dict[str, Any]]:
    params = {"id": f"eq.{record_id}", "select": select, "limit": "1"}
    response = await supabase_table_request("GET", table, params=params)
    if response.status_code != 200:
        logger.error("supabase.fetch_single_failed", table=table, status=response.status_code, body=response.text)
        raise HTTPException(status_code=502, detail="upstream fetch failed")
    rows = response.json()
    return rows[0] if rows else None

def get_managerial_roles_config() -> Set[str]:
    return get_managerial_roles()

async def fetch_user_profile(user_id: str) -> Optional[Dict[str, Any]]:
    response = await supabase_table_request("GET", "user_profiles", params={"id": f"eq.{user_id}", "limit": "1"})
    rows = response.json()
    return rows[0] if rows else None

def ensure_role_not_below_manager(role: str) -> None:
    ranks = get_role_rank_map_config()
    if ranks.get(normalise_role(role), 0) < ranks.get("MANAGER", 0):
        raise HTTPException(status_code=403, detail="manager privileges required")
