"""
IAM/Auth API Router
Handles authentication, authorization, and member management

Migrated endpoints from server/main.py
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional
import structlog

router = APIRouter(prefix="/api/iam", tags=["auth", "iam"])
logger = structlog.get_logger(__name__)


# Import helper functions from main (will be refactored to service layer later)
async def require_auth() -> Dict[str, Any]:
    """Placeholder for auth dependency"""
    from ..main import require_auth as _require_auth
    return await _require_auth()

async def guard_actor_manager(org_id: str, actor_id: str) -> str:
    """Ensure actor has manager privileges"""
    from ..main import guard_actor_manager as _guard
    return await _guard(org_id, actor_id)

def ensure_permission_for_role(role: str, permission: str) -> None:
    """Check if role has permission"""
    from ..main import ensure_permission_for_role as _ensure
    return _ensure(role, permission)


# ============================================================================
# Request/Response Models
# ============================================================================

class InviteMemberRequest(BaseModel):
    """Member invitation request"""
    orgId: str
    emailOrPhone: str = Field(..., min_length=3)
    role: str
    expiresAt: Optional[str] = None


# ============================================================================
# IAM/Members Endpoints
# ============================================================================

@router.get("/members/list")
async def list_members(
    org: str = Query(..., alias="orgId", min_length=1),
    auth: Dict[str, Any] = Depends(require_auth)
) -> Dict[str, Any]:
    """
    List organization members, teams, and invites
    
    Migrated from main.py line 3439-3491
    
    Args:
        org: Organization ID
        auth: Authentication context
        
    Returns:
        Members, teams, and invites for the organization
        
    Raises:
        HTTPException 401: Not authenticated
        HTTPException 403: Not a manager
        HTTPException 502: Database query failed
    """
    from ..main import supabase_table_request
    
    actor_id = auth.get("sub")
    if not actor_id:
        raise HTTPException(status_code=401, detail="unauthenticated")
    actor_role = await guard_actor_manager(org, actor_id)

    member_resp = await supabase_table_request(
        "GET",
        "memberships",
        params={
            "org_id": f"eq.{org}",
            "select": "id,user_id,role,invited_by,created_at,updated_at,autonomy_floor,autonomy_ceiling,is_service_account,client_portal_allowed_repos,client_portal_denied_actions,user_profile:user_profiles(display_name,email,locale,timezone,avatar_url,phone_e164,whatsapp_e164)",
            "order": "created_at.asc",
        },
    )
    if member_resp.status_code != 200:
        logger.error("iam.members_list_failed", status=member_resp.status_code, body=member_resp.text)
        raise HTTPException(status_code=502, detail="failed to load members")

    team_resp = await supabase_table_request(
        "GET",
        "teams",
        params={
            "org_id": f"eq.{org}",
            "select": "id,name,description,created_at,team_members:team_memberships(user_id,role,created_at)",
            "order": "created_at.asc",
        },
    )
    if team_resp.status_code != 200:
        logger.error("iam.teams_list_failed", status=team_resp.status_code, body=team_resp.text)
        raise HTTPException(status_code=502, detail="failed to load teams")

    invite_resp = await supabase_table_request(
        "GET",
        "invites",
        params={
            "org_id": f"eq.{org}",
            "select": "id,email_or_phone,role,status,expires_at,created_at",
            "order": "created_at.desc",
        },
    )
    if invite_resp.status_code != 200:
        logger.error("iam.invites_list_failed", status=invite_resp.status_code, body=invite_resp.text)
        raise HTTPException(status_code=502, detail="failed to load invites")

    return {
        "orgId": org,
        "actorRole": actor_role,
        "members": member_resp.json(),
        "teams": team_resp.json(),
        "invites": invite_resp.json(),
    }


# ============================================================================
# Placeholder Endpoints (Skeletons from Day 2)
# ============================================================================

@router.post("/org/create")
async def create_org() -> Dict[str, Any]:
    """Create organization - TODO: Migrate from main.py line ~3365"""
    raise HTTPException(status_code=501, detail="Not yet migrated")

@router.post("/members/invite")
async def invite_member(request: InviteMemberRequest) -> Dict[str, Any]:
    """Invite member - TODO: Migrate from main.py line ~3494"""
    raise HTTPException(status_code=501, detail="Not yet migrated")

@router.post("/members/accept")
async def accept_invite() -> Dict[str, Any]:
    """Accept invite - TODO: Migrate from main.py line ~3624"""
    raise HTTPException(status_code=501, detail="Not yet migrated")

@router.post("/members/revoke-invite")
async def revoke_invite() -> Dict[str, Any]:
    """Revoke invite - TODO: Migrate from main.py line ~3732"""
    raise HTTPException(status_code=501, detail="Not yet migrated")

@router.post("/members/update-role")
async def update_member_role() -> Dict[str, Any]:
    """Update member role - TODO: Migrate from main.py line ~4056"""
    raise HTTPException(status_code=501, detail="Not yet migrated")

@router.get("/admin/impersonation/list")
async def list_impersonation() -> Dict[str, Any]:
    """List impersonation - TODO: Migrate"""
    raise HTTPException(status_code=501, detail="Not yet migrated")

@router.post("/admin/impersonation/request")
async def request_impersonation() -> Dict[str, Any]:
    """Request impersonation - TODO: Migrate"""
    raise HTTPException(status_code=501, detail="Not yet migrated")

@router.post("/admin/impersonation/approve")
async def approve_impersonation() -> Dict[str, Any]:
    """Approve impersonation - TODO: Migrate"""
    raise HTTPException(status_code=501, detail="Not yet migrated")

@router.post("/admin/impersonation/revoke")
async def revoke_impersonation() -> Dict[str, Any]:
    """Revoke impersonation - TODO: Migrate"""
    raise HTTPException(status_code=501, detail="Not yet migrated")
