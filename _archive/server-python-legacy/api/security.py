"""
Security API Router
Handles security-related operations like CAPTCHA verification

Migrated from server/main.py lines 3307-3340
"""
import os
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field, ConfigDict
from typing import Dict, Optional
import httpx
import structlog

router = APIRouter(prefix="/v1/security", tags=["security"])
logger = structlog.get_logger(__name__)

TURNSTILE_SECRET_KEY = os.getenv("TURNSTILE_SECRET_KEY")


# ============================================================================
# Request/Response Models
# ============================================================================

class CaptchaVerificationRequest(BaseModel):
    """CAPTCHA verification request"""
    token: str
    remote_ip: Optional[str] = Field(default=None, alias="remoteIp")

    model_config = ConfigDict(populate_by_name=True)


# ============================================================================
# Security Endpoints
# ============================================================================

@router.post("/verify-captcha")
async def verify_turnstile_token(
    payload: CaptchaVerificationRequest,
    request: Request
) -> Dict[str, str]:
    """
    Verify CAPTCHA token (Cloudflare Turnstile)
    
    Migrated from main.py line 3307-3340
    
    Args:
        payload: CAPTCHA verification request with token
        request: FastAPI request object for IP extraction
        
    Returns:
        {"status": "ok"} if verification succeeds
        {"status": "skipped"} if TURNSTILE_SECRET_KEY not configured
        
    Raises:
        HTTPException 400: If token is missing or verification fails
        HTTPException 502: If Cloudflare API is unavailable
    """
    if not TURNSTILE_SECRET_KEY:
        logger.info("captcha.verification_skipped", reason="secret_not_configured")
        return {"status": "skipped"}

    token = payload.token.strip()
    if not token:
        raise HTTPException(status_code=400, detail="missing_token")

    verification_payload: Dict[str, str] = {
        "secret": TURNSTILE_SECRET_KEY,
        "response": token,
    }
    remote_ip = payload.remote_ip or (request.client.host if request.client else None)
    if remote_ip:
        verification_payload["remoteip"] = remote_ip

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(
                "https://challenges.cloudflare.com/turnstile/v0/siteverify",
                data=verification_payload,
            )
            response.raise_for_status()
            result = response.json()
    except httpx.HTTPError as exc:
        logger.warning("captcha.verify_http_error", exc_info=exc)
        raise HTTPException(status_code=502, detail="captcha_verification_unavailable") from exc

    if not result.get("success"):
        raise HTTPException(status_code=400, detail="captcha_failed")

    return {"status": "ok"}
