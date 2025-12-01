"""Organization management endpoints"""
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, ConfigDict
import structlog

from ..api_helpers import (
    ensure_org_access_by_id,
    ensure_permission_for_role,
    fetch_org_settings,
    guard_system_admin,
    log_activity_event,
    normalise_autonomy_level,
    require_auth,
    supabase_table_request,
    LEGACY_AUTONOMY_NUMERIC_MAP,
)

logger = structlog.get_logger(__name__)
router = APIRouter()


class CreateOrgRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    slug: str = Field(..., min_length=2, max_length=120)
    autonomyLevel: Optional[str] = Field(default=None, alias="autonomyLevel")
    legacyAutopilotLevel: Optional[int] = Field(default=None, ge=0, le=5, alias="autopilotLevel")

    model_config = ConfigDict(populate_by_name=True)


class AdminOrgSettingsUpdateRequest(BaseModel):
    orgId: str
    allowedEmailDomains: Optional[List[str]] = None
    defaultRole: Optional[str] = None
    requireMfaForSensitive: Optional[bool] = None
    impersonationBreakglassEmails: Optional[List[str]] = None


def _normalise_email_domains(domains: Optional[List[str]]) -> List[str]:
    """Normalize email domains to lowercase"""
    if not domains:
        return []
    return [d.strip().lower() for d in domains if d.strip()]


@router.post("/create")
async def create_organization(
    payload: CreateOrgRequest, auth: Dict[str, Any] = Depends(require_auth)
):
    """Create a new organization"""
    actor_id = auth.get("sub")
    if not actor_id:
        raise HTTPException(status_code=401, detail="unauthenticated")
    await guard_system_admin(actor_id)

    slug = payload.slug.strip().lower()
    level_input: Optional[str] = payload.autonomyLevel
    if level_input is None and payload.legacyAutopilotLevel is not None:
        level_input = LEGACY_AUTONOMY_NUMERIC_MAP.get(payload.legacyAutopilotLevel)
    autonomy_level = normalise_autonomy_level(level_input)

    org_body = {
        "name": payload.name.strip(),
        "slug": slug,
        "autonomy_level": autonomy_level,
        "created_by": actor_id,
    }

    response = await supabase_table_request(
        "POST",
        "orgs",
        json=org_body,
        headers={"Prefer": "return=representation"},
    )
    if response.status_code not in (200, 201):
        logger.error(
            "org.create_failed",
            status=response.status_code,
            body=response.text,
            slug=slug,
        )
        raise HTTPException(status_code=502, detail="failed to create organization")

    rows = response.json() or []
    if not rows:
        raise HTTPException(status_code=502, detail="organization creation returned no rows")

    org_row = rows[0]
    await log_activity_event(
        org_id=org_row["id"],
        actor_id=actor_id,
        action="ORG_CREATED",
        metadata={"name": org_row["name"], "slug": org_row["slug"]},
    )

    return {"org": org_row}


@router.get("/settings")
async def get_admin_org_settings(
    org_id: str = Query(..., alias="orgId"),
    auth: Dict[str, Any] = Depends(require_auth),
):
    """Get organization admin settings"""
    role = await ensure_org_access_by_id(auth["sub"], org_id)
    ensure_permission_for_role(role, "admin.org.settings")

    org_row = await fetch_org_settings(org_id)

    settings = {
        "allowedEmailDomains": org_row.get("allowed_email_domains") or [],
        "defaultRole": org_row.get("default_role"),
        "requireMfaForSensitive": bool(org_row.get("require_mfa_for_sensitive")),
        "impersonationBreakglassEmails": org_row.get("impersonation_breakglass_emails") or [],
    }

    impersonation_response = await supabase_table_request(
        "GET",
        "impersonation_grants",
        params={
            "org_id": f"eq.{org_id}",
            "order": "created_at.desc",
            "limit": "50",
        },
    )
    if impersonation_response.status_code != 200:
        logger.error(
            "impersonation.list_failed",
            status=impersonation_response.status_code,
            body=impersonation_response.text,
        )
        raise HTTPException(status_code=502, detail="impersonation_lookup_failed")

    return {
        "settings": settings,
        "impersonationGrants": impersonation_response.json(),
    }


@router.post("/settings")
async def update_admin_org_settings(
    payload: AdminOrgSettingsUpdateRequest, auth: Dict[str, Any] = Depends(require_auth)
):
    """Update organization admin settings"""
    role = await ensure_org_access_by_id(auth["sub"], payload.orgId)
    ensure_permission_for_role(role, "admin.org.settings")

    updates: Dict[str, Any] = {}

    if payload.allowedEmailDomains is not None:
        updates["allowed_email_domains"] = _normalise_email_domains(payload.allowedEmailDomains)

    if payload.requireMfaForSensitive is not None:
        updates["require_mfa_for_sensitive"] = bool(payload.requireMfaForSensitive)

    if payload.defaultRole is not None:
        ensure_permission_for_role(role, "admin.org.settings.reserved")
        updates["default_role"] = payload.defaultRole

    if payload.impersonationBreakglassEmails is not None:
        ensure_permission_for_role(role, "admin.org.settings.reserved")
        updates["impersonation_breakglass_emails"] = _normalise_email_domains(
            payload.impersonationBreakglassEmails
        )

    if not updates:
        return {"message": "no_updates"}

    response = await supabase_table_request(
        "PATCH",
        "orgs",
        params={"id": f"eq.{payload.orgId}"},
        json=updates,
        headers={"Prefer": "return=minimal"},
    )
    if response.status_code not in (200, 204):
        logger.error(
            "org.settings_update_failed",
            status=response.status_code,
            body=response.text,
            org_id=payload.orgId,
        )
        raise HTTPException(status_code=502, detail="failed to update organization settings")

    await log_activity_event(
        org_id=payload.orgId,
        actor_id=auth["sub"],
        action="ORG_SETTINGS_UPDATED",
        metadata={"updates": list(updates.keys())},
    )

    return {"message": "updated"}
