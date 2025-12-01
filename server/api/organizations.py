"""
Organizations API Router
Handles organization settings and configuration

Migrated from server/main.py lines 3776-3866
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Dict, Any, List, Optional, Iterable
import structlog

router = APIRouter(prefix="/api/admin/org", tags=["organizations"])
logger = structlog.get_logger(__name__)


# Import helper functions from main (these will be refactored to service layer later)
# TODO: Extract these to server/services/organization_service.py
async def require_auth() -> Dict[str, Any]:
    """Placeholder for auth dependency - will import from main"""
    from ..main import require_auth as _require_auth
    return await _require_auth()

async def ensure_org_access_by_id(user_id: str, org_id: str) -> str:
    """Placeholder - will import from main"""
    from ..main import ensure_org_access_by_id as _ensure
    return await _ensure(user_id, org_id)

def ensure_permission_for_role(role: str, permission: str) -> None:
    """Placeholder - will import from main"""
    from ..main import ensure_permission_for_role as _ensure
    return _ensure(role, permission)

async def fetch_org_settings(org_id: str) -> Dict[str, Any]:
    """Fetch organization settings from database"""
    from ..main import supabase_table_request
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

def _normalise_email_domains(domains: Optional[Iterable[str]]) -> List[str]:
    """Normalize email domains (remove @ prefix, dedupe, lowercase)"""
    if not domains:
        return []
    normalised: List[str] = []
    for entry in domains:
        if not entry:
            continue
        value = entry.strip().lower()
        if not value:
            continue
        if "@" in value:
            value = value.split("@", 1)[1]
        if value and value not in normalised:
            normalised.append(value)
    return normalised

def _normalise_emails(values: Optional[Iterable[str]]) -> List[str]:
    """Normalize email addresses (lowercase, dedupe)"""
    if not values:
        return []
    result: List[str] = []
    for value in values:
        if not value:
            continue
        candidate = value.strip().lower()
        if candidate and candidate not in result:
            result.append(candidate)
    return result

def validate_org_role(role: str) -> str:
    """Validate organization role"""
    from ..main import validate_org_role as _validate
    return _validate(role)

async def log_activity_event(
    org_id: str,
    actor_id: str,
    action: str,
    entity_type: str,
    entity_id: str,
    metadata: Dict[str, Any]
) -> None:
    """Log activity event"""
    from ..main import log_activity_event as _log
    return await _log(org_id, actor_id, action, entity_type, entity_id, metadata)


# ============================================================================
# Request/Response Models
# ============================================================================

class AdminOrgSettingsUpdateRequest(BaseModel):
    """Organization settings update request"""
    orgId: str
    allowedEmailDomains: Optional[List[str]] = None
    defaultRole: Optional[str] = None
    requireMfaForSensitive: Optional[bool] = None
    impersonationBreakglassEmails: Optional[List[str]] = None


# ============================================================================
# Organization Settings Endpoints
# ============================================================================

@router.get("/settings")
async def get_admin_org_settings(
    org_id: str = Query(..., alias="orgId"),
    auth: Dict[str, Any] = Depends(require_auth),
) -> Dict[str, Any]:
    """
    Get organization settings
    
    Migrated from main.py line 3776-3813
    
    Args:
        org_id: Organization ID
        auth: Authentication context
        
    Returns:
        Organization settings and impersonation grants
        
    Raises:
        HTTPException 404: Organization not found
        HTTPException 502: Database lookup failed
    """
    from ..main import supabase_table_request
    
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
    payload: AdminOrgSettingsUpdateRequest,
    auth: Dict[str, Any] = Depends(require_auth)
) -> Dict[str, Any]:
    """
    Update organization settings
    
    Migrated from main.py line 3816-3866
    
    Args:
        payload: Settings update request
        auth: Authentication context
        
    Returns:
        Updated organization settings
        
    Raises:
        HTTPException 502: Database update failed
    """
    from ..main import supabase_table_request
    
    role = await ensure_org_access_by_id(auth["sub"], payload.orgId)
    ensure_permission_for_role(role, "admin.org.settings")

    updates: Dict[str, Any] = {}

    if payload.allowedEmailDomains is not None:
        updates["allowed_email_domains"] = _normalise_email_domains(payload.allowedEmailDomains)

    if payload.requireMfaForSensitive is not None:
        updates["require_mfa_for_sensitive"] = bool(payload.requireMfaForSensitive)

    if payload.defaultRole is not None:
        ensure_permission_for_role(role, "admin.org.settings.reserved")
        updates["default_role"] = validate_org_role(payload.defaultRole)

    if payload.impersonationBreakglassEmails is not None:
        ensure_permission_for_role(role, "admin.org.settings.reserved")
        updates["impersonation_breakglass_emails"] = _normalise_emails(payload.impersonationBreakglassEmails)

    if updates:
        response = await supabase_table_request(
            "PATCH",
            "organizations",
            params={"id": f"eq.{payload.orgId}"},
            json=updates,
            headers={"Prefer": "return=representation"},
        )
        if response.status_code not in (200, 204):
            logger.error("org.settings_update_failed", status=response.status_code, body=response.text)
            raise HTTPException(status_code=502, detail="organization_update_failed")

        await log_activity_event(
            org_id=payload.orgId,
            actor_id=auth["sub"],
            action="ORG_SETTINGS_UPDATED",
            entity_type="IAM",
            entity_id=payload.orgId,
            metadata={"fields": sorted(updates.keys())},
        )

    org_row = await fetch_org_settings(payload.orgId)
    return {
        "settings": {
            "allowedEmailDomains": org_row.get("allowed_email_domains") or [],
            "defaultRole": org_row.get("default_role"),
            "requireMfaForSensitive": bool(org_row.get("require_mfa_for_sensitive")),
            "impersonationBreakglassEmails": org_row.get("impersonation_breakglass_emails") or [],
        }
    }
