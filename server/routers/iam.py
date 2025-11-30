"""
IAM Router - Identity and Access Management endpoints
Handles member invitations, team management, and role updates
"""
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
import structlog

logger = structlog.get_logger()

router = APIRouter(prefix="/api/iam", tags=["iam"])


# ============================================================================
# Pydantic Models
# ============================================================================


class InviteMemberRequest(BaseModel):
    orgId: str
    emailOrPhone: str = Field(..., min_length=3)
    role: str
    expiresAt: Optional[str] = None


class AcceptInviteRequest(BaseModel):
    token: str = Field(..., min_length=8)
    userId: str
    displayName: str = Field(..., min_length=2, max_length=120)
    email: Optional[str] = None
    phoneE164: Optional[str] = None
    whatsappE164: Optional[str] = None
    locale: Optional[str] = None
    timezone: Optional[str] = None


class UpdateRoleRequest(BaseModel):
    orgId: str
    userId: str
    role: str


class TeamCreateRequest(BaseModel):
    orgId: str
    name: str = Field(..., min_length=2, max_length=120)
    description: Optional[str] = None


class TeamMemberAddRequest(BaseModel):
    orgId: str
    teamId: str
    userId: str
    role: Optional[str] = None


class TeamMemberRemoveRequest(BaseModel):
    orgId: str
    teamId: str
    userId: str


class RevokeInviteRequest(BaseModel):
    orgId: str
    inviteId: str


# ============================================================================
from ..api_helpers import (
    require_auth,
    supabase_table_request,
    normalise_role,
    get_role_rank_map_config,
    ensure_permission_for_role,
    log_activity_event,
    iso_now,
)
from ..iam_helpers import (
    guard_actor_manager,
    validate_org_role,
    validate_team_role,
    fetch_membership,
    fetch_single_record,
    count_managerial_members,
    get_managerial_roles_config,
    build_invite_link,
    upsert_user_profile,
)
from ..mailer import send_member_invite_email


# ============================================================================
# Endpoints
# ============================================================================


@router.get("/members/list")
async def list_members(
    org: str = Query(..., alias="orgId", min_length=1),
    auth: Dict[str, Any] = Depends(require_auth)  # type: ignore[name-defined]
):
    """
    List all members, teams, and invites for an organization.
    Requires MANAGER or higher role.
    """
    actor_id = auth.get("sub")
    if not actor_id:
        raise HTTPException(status_code=401, detail="unauthenticated")
    actor_role = await guard_actor_manager(org, actor_id)  # type: ignore[name-defined]

    member_resp = await supabase_table_request(  # type: ignore[name-defined]
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

    team_resp = await supabase_table_request(  # type: ignore[name-defined]
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

    invite_resp = await supabase_table_request(  # type: ignore[name-defined]
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
    auth: Dict[str, Any] = Depends(require_auth)  # type: ignore[name-defined]
):
    """
    Invite a new member to the organization.
    Requires MANAGER or higher role and admin.members.invite permission.
    """
    actor_id = auth.get("sub")
    if not actor_id:
        raise HTTPException(status_code=401, detail="unauthenticated")
    actor_role = await guard_actor_manager(payload.orgId, actor_id)  # type: ignore[name-defined]
    ensure_permission_for_role(actor_role, "admin.members.invite")  # type: ignore[name-defined]

    target_role = validate_org_role(payload.role)  # type: ignore[name-defined]
    if target_role == "SYSTEM_ADMIN" and normalise_role(actor_role) != "SYSTEM_ADMIN":  # type: ignore[name-defined]
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

    response = await supabase_table_request(  # type: ignore[name-defined]
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

    await log_activity_event(  # type: ignore[name-defined]
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
        invite_link = build_invite_link(token)  # type: ignore[name-defined]
        org_row = await fetch_single_record("organizations", payload.orgId, "name")  # type: ignore[name-defined]
        inviter_profile = await fetch_single_record("user_profiles", actor_id, "display_name")  # type: ignore[name-defined]

        async def dispatch_invite_email() -> None:
            success = await send_member_invite_email(  # type: ignore[name-defined]
                recipient=contact_value.lower(),
                invite_link=invite_link,
                org_name=org_row.get("name") if org_row else None,
                role=target_role,
                inviter_name=inviter_profile.get("display_name") if inviter_profile else None,
            )
            if not success:
                logger.warning("iam.invite_email_failed", recipient=contact_value)

        # Fire and forget email sending
        import asyncio
        asyncio.create_task(dispatch_invite_email())

    return {
        "inviteId": invite.get("id") if invite else None,
        "token": token,
        "invite": invite,
    }


@router.post("/members/accept")
async def accept_invite(payload: AcceptInviteRequest):
    """
    Accept a pending invite and create a user profile and membership.
    No authentication required (invite token is the auth).
    """
    hashed_token = hashlib.sha256(payload.token.encode("utf-8")).hexdigest()

    response = await supabase_table_request(  # type: ignore[name-defined]
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

    profile = await upsert_user_profile(payload.userId, profile_payload)  # type: ignore[name-defined]

    membership_body = {
        "org_id": invite["org_id"],
        "user_id": payload.userId,
        "role": invite["role"],
        "invited_by": invite.get("invited_by_user_id"),
        "created_at": iso_now(),  # type: ignore[name-defined]
    }

    membership_resp = await supabase_table_request(  # type: ignore[name-defined]
        "POST",
        "memberships",
        json=membership_body,
        headers={"Prefer": "return=representation"},
    )
    if membership_resp.status_code not in (200, 201):
        logger.error("iam.membership_create_failed", status=membership_resp.status_code, body=membership_resp.text)
        raise HTTPException(status_code=502, detail="failed to create membership")

    membership_rows = membership_resp.json()
    membership = membership_rows[0] if membership_rows else membership_body

    # Update invite status to ACCEPTED
    await supabase_table_request(  # type: ignore[name-defined]
        "PATCH",
        "invites",
        params={"id": f"eq.{invite['id']}"},
        json={"status": "ACCEPTED"},
        headers={"Prefer": "return=minimal"},
    )

    await log_activity_event(  # type: ignore[name-defined]
        org_id=invite["org_id"],
        actor_id=payload.userId,
        action="INVITE_ACCEPTED",
        metadata={"invite_id": invite["id"]},
    )

    return {
        "profile": profile,
        "membership": membership,
        "orgId": invite["org_id"],
    }


@router.post("/members/revoke-invite")
async def revoke_invite(
    payload: RevokeInviteRequest,
    auth: Dict[str, Any] = Depends(require_auth)  # type: ignore[name-defined]
):
    """
    Revoke a pending invite.
    Requires MANAGER or higher role and admin.invites.revoke permission.
    """
    actor_id = auth.get("sub")
    if not actor_id:
        raise HTTPException(status_code=401, detail="unauthenticated")
    actor_role = await guard_actor_manager(payload.orgId, actor_id)  # type: ignore[name-defined]
    ensure_permission_for_role(actor_role, "admin.invites.revoke")  # type: ignore[name-defined]

    invite_lookup = await supabase_table_request(  # type: ignore[name-defined]
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

    revoke_resp = await supabase_table_request(  # type: ignore[name-defined]
        "PATCH",
        "invites",
        params={"id": f"eq.{payload.inviteId}"},
        json={"status": "REVOKED"},
        headers={"Prefer": "return=minimal"},
    )
    if revoke_resp.status_code not in (200, 204):
        logger.error("iam.invite_revoke_failed", status=revoke_resp.status_code, body=revoke_resp.text)
        raise HTTPException(status_code=502, detail="failed to revoke invite")

    await log_activity_event(  # type: ignore[name-defined]
        org_id=payload.orgId,
        actor_id=actor_id,
        action="INVITE_REVOKED",
        metadata={"invite_id": payload.inviteId},
    )

    return {"inviteId": payload.inviteId, "status": "REVOKED"}


@router.post("/members/update-role")
async def update_member_role(
    payload: UpdateRoleRequest,
    auth: Dict[str, Any] = Depends(require_auth)  # type: ignore[name-defined]
):
    """
    Update a member's role within the organization.
    Requires MANAGER or higher role and admin.members.update_role permission.
    """
    actor_id = auth.get("sub")
    if not actor_id:
        raise HTTPException(status_code=401, detail="unauthenticated")

    actor_role = await guard_actor_manager(payload.orgId, actor_id)  # type: ignore[name-defined]
    ensure_permission_for_role(actor_role, "admin.members.update_role")  # type: ignore[name-defined]
    new_role = validate_org_role(payload.role)  # type: ignore[name-defined]

    membership = await fetch_membership(payload.orgId, payload.userId)  # type: ignore[name-defined]
    if not membership:
        raise HTTPException(status_code=404, detail="membership not found")

    current_role = normalise_role(membership.get("role"))  # type: ignore[name-defined]
    if current_role == new_role:
        return {"orgId": payload.orgId, "userId": payload.userId, "role": current_role}

    if new_role == "SYSTEM_ADMIN" and normalise_role(actor_role) != "SYSTEM_ADMIN":  # type: ignore[name-defined]
        raise HTTPException(status_code=403, detail="system admin required to grant SYSTEM_ADMIN")

    managerial_roles = get_managerial_roles_config()  # type: ignore[name-defined]
    ranks = get_role_rank_map_config()  # type: ignore[name-defined]
    if current_role in managerial_roles and ranks.get(new_role, 0) < ranks.get("MANAGER", 0):
        remaining = await count_managerial_members(payload.orgId)  # type: ignore[name-defined]
        if remaining <= 1:
            raise HTTPException(status_code=409, detail="cannot demote last manager or partner")

    update_resp = await supabase_table_request(  # type: ignore[name-defined]
        "PATCH",
        "memberships",
        params={"id": f"eq.{membership['id']}"},
        json={"role": new_role, "updated_at": iso_now()},  # type: ignore[name-defined]
        headers={"Prefer": "return=representation"},
    )
    if update_resp.status_code not in (200, 204):
        logger.error("iam.role_update_failed", status=update_resp.status_code, body=update_resp.text)
        raise HTTPException(status_code=502, detail="failed to update role")

    rows = update_resp.json() if update_resp.content else []
    updated = rows[0] if rows else {**membership, "role": new_role}

    await log_activity_event(  # type: ignore[name-defined]
        org_id=payload.orgId,
        actor_id=actor_id,
        action="MEMBERSHIP_ROLE_CHANGED",
        metadata={
            "target_user_id": payload.userId,
            "previous_role": current_role,
            "new_role": new_role,
        },
    )

    return {
        "orgId": payload.orgId,
        "userId": payload.userId,
        "role": new_role,
        "membership": updated,
    }


@router.post("/teams/create")
async def create_team(
    payload: TeamCreateRequest,
    auth: Dict[str, Any] = Depends(require_auth)  # type: ignore[name-defined]
):
    """
    Create a new team in the organization.
    Requires MANAGER or higher role and admin.teams.manage permission.
    """
    actor_id = auth.get("sub")
    if not actor_id:
        raise HTTPException(status_code=401, detail="unauthenticated")
    actor_role = await guard_actor_manager(payload.orgId, actor_id)  # type: ignore[name-defined]
    ensure_permission_for_role(actor_role, "admin.teams.manage")  # type: ignore[name-defined]

    team_body = {
        "org_id": payload.orgId,
        "name": payload.name.strip(),
        "description": payload.description,
    }
    response = await supabase_table_request(  # type: ignore[name-defined]
        "POST",
        "teams",
        json=team_body,
        headers={"Prefer": "return=representation"},
    )
    if response.status_code not in (200, 201):
        logger.error("iam.team_create_failed", status=response.status_code, body=response.text)
        raise HTTPException(status_code=502, detail="failed to create team")
    rows = response.json()
    team = rows[0] if rows else team_body

    await log_activity_event(  # type: ignore[name-defined]
        org_id=payload.orgId,
        actor_id=actor_id,
        action="TEAM_CREATED",
        metadata={"team_id": team.get("id"), "name": team_body["name"]},
    )

    return {"team": team}


@router.post("/teams/add-member")
async def add_team_member(
    payload: TeamMemberAddRequest,
    auth: Dict[str, Any] = Depends(require_auth)  # type: ignore[name-defined]
):
    """
    Add a member to a team.
    Requires MANAGER or higher role and admin.teams.manage permission.
    """
    actor_id = auth.get("sub")
    if not actor_id:
        raise HTTPException(status_code=401, detail="unauthenticated")
    actor_role = await guard_actor_manager(payload.orgId, actor_id)  # type: ignore[name-defined]
    ensure_permission_for_role(actor_role, "admin.teams.manage")  # type: ignore[name-defined]

    team = await fetch_single_record("teams", payload.teamId, select="id,org_id,name")  # type: ignore[name-defined]
    if not team or team.get("org_id") != payload.orgId:
        raise HTTPException(status_code=404, detail="team not found")

    role_value = validate_team_role(payload.role)  # type: ignore[name-defined]

    membership_body = {
        "team_id": payload.teamId,
        "user_id": payload.userId,
        "role": role_value,
    }
    response = await supabase_table_request(  # type: ignore[name-defined]
        "POST",
        "team_memberships",
        json=membership_body,
        headers={"Prefer": "resolution=merge-duplicates,return=representation"},
    )
    if response.status_code not in (200, 201):
        logger.error("iam.team_member_add_failed", status=response.status_code, body=response.text)
        raise HTTPException(status_code=502, detail="failed to add team member")
    rows = response.json()
    membership = rows[0] if rows else membership_body

    await log_activity_event(  # type: ignore[name-defined]
        org_id=payload.orgId,
        actor_id=actor_id,
        action="TEAM_MEMBER_ADDED",
        metadata={
            "team_id": payload.teamId,
            "user_id": payload.userId,
            "role": role_value,
        },
    )

    return {"team": team, "membership": membership}


@router.post("/teams/remove-member")
async def remove_team_member(
    payload: TeamMemberRemoveRequest,
    auth: Dict[str, Any] = Depends(require_auth)  # type: ignore[name-defined]
):
    """
    Remove a member from a team.
    Requires MANAGER or higher role and admin.teams.manage permission.
    """
    actor_id = auth.get("sub")
    if not actor_id:
        raise HTTPException(status_code=401, detail="unauthenticated")
    actor_role = await guard_actor_manager(payload.orgId, actor_id)  # type: ignore[name-defined]
    ensure_permission_for_role(actor_role, "admin.teams.manage")  # type: ignore[name-defined]

    team = await fetch_single_record("teams", payload.teamId, select="id,org_id,name")  # type: ignore[name-defined]
    if not team or team.get("org_id") != payload.orgId:
        raise HTTPException(status_code=404, detail="team not found")

    delete_resp = await supabase_table_request(  # type: ignore[name-defined]
        "DELETE",
        "team_memberships",
        params={
            "team_id": f"eq.{payload.teamId}",
            "user_id": f"eq.{payload.userId}",
        },
    )
    if delete_resp.status_code not in (200, 204):
        logger.error("iam.team_member_remove_failed", status=delete_resp.status_code, body=delete_resp.text)
        raise HTTPException(status_code=502, detail="failed to remove team member")

    await log_activity_event(  # type: ignore[name-defined]
        org_id=payload.orgId,
        actor_id=actor_id,
        action="TEAM_MEMBER_REMOVED",
        metadata={
            "team_id": payload.teamId,
            "user_id": payload.userId,
        },
    )

    return {"team": team, "userId": payload.userId, "status": "removed"}


# ============================================================================
# Profile Management
# ============================================================================

class ProfileUpdateRequest(BaseModel):
    displayName: Optional[str] = None
    phoneE164: Optional[str] = None
    whatsappE164: Optional[str] = None
    avatarUrl: Optional[str] = None
    locale: Optional[str] = None
    timezone: Optional[str] = None
    orgId: Optional[str] = None
    theme: Optional[str] = None
    notifications: Optional[Dict[str, Any]] = None


@router.get("/profile/get")
async def get_profile(
    org: Optional[str] = Query(default=None, alias="orgId"),
    auth: Dict[str, Any] = Depends(require_auth)  # type: ignore[name-defined]
):
    """
    Get the authenticated user's profile and optional organization preferences.
    """
    user_id = auth.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="unauthenticated")

    profile = await fetch_user_profile(user_id)  # type: ignore[name-defined]
    if not profile:
        raise HTTPException(status_code=404, detail="profile not found")

    preferences = None
    if org:
        pref_resp = await supabase_table_request(  # type: ignore[name-defined]
            "GET",
            "user_preferences",
            params={
                "user_id": f"eq.{user_id}",
                "org_id": f"eq.{org}",
                "limit": "1",
            },
        )
        if pref_resp.status_code != 200:
            logger.error("iam.preferences_fetch_failed", status=pref_resp.status_code, body=pref_resp.text)
            raise HTTPException(status_code=502, detail="failed to load preferences")
        pref_rows = pref_resp.json()
        preferences = pref_rows[0] if pref_rows else None

    return {"profile": profile, "preferences": preferences}


@router.post("/profile/update")
async def update_profile(
    payload: ProfileUpdateRequest,
    auth: Dict[str, Any] = Depends(require_auth)  # type: ignore[name-defined]
):
    """
    Update the authenticated user's profile and preferences.
    """
    user_id = auth.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="unauthenticated")

    target_org_id = payload.orgId
    if target_org_id:
        membership_check = await fetch_membership(target_org_id, user_id)  # type: ignore[name-defined]
        if not membership_check and not await is_system_admin_user(user_id):  # type: ignore[name-defined]
            raise HTTPException(status_code=403, detail="forbidden for target organization")
    else:
        membership_resp = await supabase_table_request(  # type: ignore[name-defined]
            "GET",
            "memberships",
            params={"user_id": f"eq.{user_id}", "select": "org_id", "limit": "1"},
        )
        if membership_resp.status_code != 200:
            logger.error("iam.profile_membership_lookup_failed", status=membership_resp.status_code, body=membership_resp.text)
            raise HTTPException(status_code=502, detail="failed to resolve organization")
        membership_rows = membership_resp.json()
        if membership_rows:
            target_org_id = membership_rows[0].get("org_id")

    # Note: We allow profile updates without orgId if it's just global profile data,
    # but preferences require orgId.

    profile_updates: Dict[str, Any] = {}
    if payload.displayName:
        profile_updates["display_name"] = payload.displayName.strip()
    if payload.phoneE164 is not None:
        profile_updates["phone_e164"] = payload.phoneE164
    if payload.whatsappE164 is not None:
        profile_updates["whatsapp_e164"] = payload.whatsappE164
    if payload.avatarUrl is not None:
        profile_updates["avatar_url"] = payload.avatarUrl
    if payload.locale is not None:
        profile_updates["locale"] = payload.locale
    if payload.timezone is not None:
        profile_updates["timezone"] = payload.timezone

    updated_profile = None
    if profile_updates:
        updated_profile = await upsert_user_profile(user_id, profile_updates)  # type: ignore[name-defined]

    updated_preferences = None
    if (payload.theme is not None or payload.notifications is not None) and target_org_id:
        pref_body: Dict[str, Any] = {"user_id": user_id, "org_id": target_org_id}
        if payload.theme is not None:
            theme_value = payload.theme.upper()
            if theme_value not in {"SYSTEM", "LIGHT", "DARK"}:
                raise HTTPException(status_code=400, detail="invalid theme preference")
            pref_body["theme"] = theme_value
        if payload.notifications is not None:
            pref_body["notifications"] = payload.notifications

        pref_resp = await supabase_table_request(  # type: ignore[name-defined]
            "POST",
            "user_preferences",
            json=pref_body,
            headers={"Prefer": "resolution=merge-duplicates,return=representation"},
        )
        if pref_resp.status_code not in (200, 201):
            logger.error("iam.preferences_upsert_failed", status=pref_resp.status_code, body=pref_resp.text)
            raise HTTPException(status_code=502, detail="failed to update preferences")
        pref_rows = pref_resp.json()
        updated_preferences = pref_rows[0] if pref_rows else None

    return {
        "profile": updated_profile,
        "preferences": updated_preferences,
        "orgId": target_org_id
    }
