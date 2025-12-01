"""
IAM/Auth API Router
Handles authentication, authorization, and member management

Migrated endpoints from server/main.py
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional
from datetime import datetime, timedelta, timezone
import secrets
import hashlib
import asyncio
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

def validate_org_role(role: str) -> str:
    """Validate organization role"""
    from ..main import validate_org_role as _validate
    return _validate(role)

def normalise_role(value: Optional[str]) -> str:
    """Normalize role string"""
    from ..main import normalise_role as _norm
    return _norm(value)

def build_invite_link(token: str) -> str:
    """Build invite link URL"""
    from ..main import build_invite_link as _build
    return _build(token)

async def fetch_single_record(table: str, record_id: str, select: str = "*") -> Optional[Dict[str, Any]]:
    """Fetch single record from table"""
    from ..main import fetch_single_record as _fetch
    return await _fetch(table, record_id, select)

async def upsert_user_profile(user_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
    """Upsert user profile"""
    from ..main import upsert_user_profile as _upsert
    return await _upsert(user_id, updates)

def iso_now() -> str:
    """Get current ISO timestamp"""
    from ..main import iso_now as _iso
    return _iso()

async def log_activity_event(org_id: str, actor_id: str, action: str, metadata: Dict[str, Any]) -> None:
    """Log activity event"""
    from ..main import log_activity_event as _log
    return await _log(org_id, actor_id, action, "IAM", org_id, metadata)

async def send_member_invite_email(
    recipient: str,
    invite_link: str,
    org_name: Optional[str],
    role: str,
    inviter_name: Optional[str],
    expires_at: str
) -> bool:
    """Send member invite email"""
    from ..main import send_member_invite_email as _send
    return await _send(recipient, invite_link, org_name, role, inviter_name, expires_at)


# ============================================================================
# Request/Response Models
# ============================================================================

class InviteMemberRequest(BaseModel):
    """Member invitation request"""
    orgId: str
    emailOrPhone: str = Field(..., min_length=3)
    role: str
    expiresAt: Optional[str] = None


class AcceptInviteRequest(BaseModel):
    """Accept invitation request"""
    token: str = Field(..., min_length=8)
    userId: str
    displayName: str = Field(..., min_length=2, max_length=120)
    email: Optional[str] = None
    phoneE164: Optional[str] = None
    whatsappE164: Optional[str] = None
    locale: Optional[str] = None
    timezone: Optional[str] = None


class RevokeInviteRequest(BaseModel):
    """Revoke invitation request"""
    orgId: str
    inviteId: str


# ============================================================================
# IAM/Members Endpoints
# ============================================================================

@router.get("/members/list")
async def list_members(
    org: str = Query(..., alias="orgId", min_length=1),
    auth: Dict[str, Any] = Depends(require_auth)
) -> Dict[str, Any]:
    """List organization members, teams, and invites - Migrated from main.py line 3439-3491"""
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


@router.post("/members/invite")
async def invite_member(
    payload: InviteMemberRequest,
    auth: Dict[str, Any] = Depends(require_auth)
) -> Dict[str, Any]:
    """Invite member to organization - Migrated from main.py line 3494-3572"""
    from ..main import supabase_table_request
    
    actor_id = auth.get("sub")
    if not actor_id:
        raise HTTPException(status_code=401, detail="unauthenticated")
    actor_role = await guard_actor_manager(payload.orgId, actor_id)
    ensure_permission_for_role(actor_role, "admin.members.invite")

    target_role = validate_org_role(payload.role)
    if target_role == "SYSTEM_ADMIN" and normalise_role(actor_role) != "SYSTEM_ADMIN":
        raise HTTPException(status_code=403, detail="system admin required to grant SYSTEM_ADMIN")

    expires_at_value = payload.expiresAt
    if not expires_at_value:
        expires_at_value = (datetime.utcnow() + timedelta(days=14)).replace(microsecond=0).isoformat() + "Z"

    token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()

    invite_body = {
        "org_id": payload.orgId,
        "email_or_phone": payload.emailOrPhone.strip(),
        "role": target_role,
        "invited_by_user_id": actor_id,
        "status": "PENDING",
        "token_hash": token_hash,
        "expires_at": expires_at_value,
    }

    response = await supabase_table_request(
        "POST",
        "invites",
        json=invite_body,
        headers={"Prefer": "return=representation"},
    )
    if response.status_code not in (200, 201):
        logger.error("iam.invite_create_failed", status=response.status_code, body=response.text)
        raise HTTPException(status_code=502, detail="failed to create invite")

    rows = response.json()
    invite = rows[0] if rows else None

    await log_activity_event(
        org_id=payload.orgId,
        actor_id=actor_id,
        action="INVITE_SENT",
        metadata={
            "invite_id": invite.get("id") if invite else None,
            "role": target_role,
            "email_or_phone": payload.emailOrPhone.strip(),
        },
    )

    contact_value = payload.emailOrPhone.strip()
    if "@" in contact_value:
        invite_link = build_invite_link(token)
        org_row = await fetch_single_record("organizations", payload.orgId, "name")
        inviter_profile = await fetch_single_record("user_profiles", actor_id, "display_name")

        async def dispatch_invite_email() -> None:
            success = await send_member_invite_email(
                recipient=contact_value.lower(),
                invite_link=invite_link,
                org_name=org_row.get("name") if org_row else None,
                role=target_role,
                inviter_name=inviter_profile.get("display_name") if inviter_profile else None,
                expires_at=expires_at_value,
            )
            if not success:
                logger.warning("iam.invite_email_failed", email=contact_value.lower())

        asyncio.create_task(dispatch_invite_email())

    return {
        "inviteId": invite.get("id") if invite else None,
        "role": target_role,
        "expiresAt": expires_at_value,
        "token": token,
    }


@router.post("/members/accept")
async def accept_invite(payload: AcceptInviteRequest) -> Dict[str, Any]:
    """Accept organization invite - Migrated from main.py line 3624-3729"""
    from ..main import supabase_table_request
    
    hashed_token = hashlib.sha256(payload.token.encode("utf-8")).hexdigest()

    response = await supabase_table_request(
        "GET",
        "invites",
        params={
            "token_hash": f"eq.{hashed_token}",
            "select": "id,org_id,role,status,expires_at,email_or_phone,invited_by_user_id",
            "limit": "1",
        },
    )
    if response.status_code != 200:
        logger.error("iam.invite_lookup_failed", status=response.status_code, body=response.text)
        raise HTTPException(status_code=502, detail="failed to verify invite")

    rows = response.json()
    if not rows:
        raise HTTPException(status_code=404, detail="invite not found")

    invite = rows[0]
    if invite.get("status") != "PENDING":
        raise HTTPException(status_code=409, detail="invite already processed")

    expires_at_str = invite.get("expires_at")
    if expires_at_str:
        expires_at = expires_at_str.replace("Z", "+00:00")
        try:
            expires_dt = datetime.fromisoformat(expires_at)
            if expires_dt.tzinfo is None:
                expires_dt = expires_dt.replace(tzinfo=timezone.utc)
        except ValueError as exc:
            logger.warning("iam.invite_expiry_parse_failed", value=expires_at_str, error=str(exc))
        else:
            if expires_dt < datetime.now(timezone.utc):
                raise HTTPException(status_code=410, detail="invite expired")

    email_value = payload.email
    if not email_value and invite.get("email_or_phone") and "@" in invite["email_or_phone"]:
        email_value = invite["email_or_phone"].strip()
    if not email_value:
        raise HTTPException(status_code=400, detail="email is required to accept invite")

    profile_payload = {
        "display_name": payload.displayName.strip(),
        "email": email_value.lower(),
    }
    if payload.phoneE164:
        profile_payload["phone_e164"] = payload.phoneE164
    if payload.whatsappE164:
        profile_payload["whatsapp_e164"] = payload.whatsappE164
    if payload.locale:
        profile_payload["locale"] = payload.locale
    if payload.timezone:
        profile_payload["timezone"] = payload.timezone

    profile = await upsert_user_profile(payload.userId, profile_payload)

    membership_body = {
        "org_id": invite["org_id"],
        "user_id": payload.userId,
        "role": invite["role"],
        "invited_by": invite.get("invited_by_user_id"),
        "created_at": iso_now(),
        "updated_at": iso_now(),
    }
    membership_resp = await supabase_table_request(
        "POST",
        "memberships",
        json=membership_body,
        headers={"Prefer": "resolution=merge-duplicates,return=representation"},
    )
    if membership_resp.status_code not in (200, 201):
        logger.error("iam.membership_create_failed", status=membership_resp.status_code, body=membership_resp.text)
        raise HTTPException(status_code=502, detail="failed to create membership")

    membership_rows = membership_resp.json()
    membership = membership_rows[0] if membership_rows else membership_body

    update_resp = await supabase_table_request(
        "PATCH",
        "invites",
        params={"id": f"eq.{invite['id']}"},
        json={"status": "ACCEPTED"},
        headers={"Prefer": "return=minimal"},
    )
    if update_resp.status_code not in (200, 204):
        logger.warning("iam.invite_status_update_failed", status=update_resp.status_code, body=update_resp.text)

    await log_activity_event(
        org_id=invite["org_id"],
        actor_id=payload.userId,
        action="INVITE_ACCEPTED",
        metadata={
            "invite_id": invite["id"],
            "role": invite["role"],
            "profile_display_name": profile.get("display_name"),
        },
    )

    return {
        "orgId": invite["org_id"],
        "role": invite["role"],
        "membership": membership,
    }


@router.post("/members/revoke-invite")
async def revoke_invite(
    payload: RevokeInviteRequest,
    auth: Dict[str, Any] = Depends(require_auth)
) -> Dict[str, Any]:
    """Revoke pending invite - Migrated from main.py line 3732-3773"""
    from ..main import supabase_table_request
    
    actor_id = auth.get("sub")
    if not actor_id:
        raise HTTPException(status_code=401, detail="unauthenticated")
    actor_role = await guard_actor_manager(payload.orgId, actor_id)
    ensure_permission_for_role(actor_role, "admin.invites.revoke")

    invite_lookup = await supabase_table_request(
        "GET",
        "invites",
        params={"id": f"eq.{payload.inviteId}", "org_id": f"eq.{payload.orgId}", "limit": "1"},
    )
    if invite_lookup.status_code != 200:
        logger.error("iam.invite_fetch_failed", status=invite_lookup.status_code, body=invite_lookup.text)
        raise HTTPException(status_code=502, detail="failed to load invite")
    rows = invite_lookup.json()
    if not rows:
        raise HTTPException(status_code=404, detail="invite not found")
    invite = rows[0]
    if invite.get("status") in {"ACCEPTED", "EXPIRED"}:
        raise HTTPException(status_code=409, detail="invite already processed")

    revoke_resp = await supabase_table_request(
        "PATCH",
        "invites",
        params={"id": f"eq.{payload.inviteId}"},
        json={"status": "REVOKED"},
        headers={"Prefer": "return=minimal"},
    )
    if revoke_resp.status_code not in (200, 204):
        logger.error("iam.invite_revoke_failed", status=revoke_resp.status_code, body=revoke_resp.text)
        raise HTTPException(status_code=502, detail="failed to revoke invite")

    await log_activity_event(
        org_id=payload.orgId,
        actor_id=actor_id,
        action="INVITE_REVOKED",
        metadata={"invite_id": payload.inviteId},
    )

    return {"inviteId": payload.inviteId, "status": "REVOKED"}


# Placeholder endpoints
@router.post("/org/create")
async def create_org() -> Dict[str, Any]:
    raise HTTPException(status_code=501, detail="Not yet migrated")

@router.post("/members/update-role")
async def update_member_role() -> Dict[str, Any]:
    raise HTTPException(status_code=501, detail="Not yet migrated")
