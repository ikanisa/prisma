"""
Security API Router
Handles security-related operations like CAPTCHA verification
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Dict, Any

router = APIRouter(prefix="/v1/security", tags=["security"])


# ============================================================================
# Request/Response Models
# ============================================================================

class CaptchaVerifyRequest(BaseModel):
    """CAPTCHA verification request"""
    token: str
    action: str


# ============================================================================
# Security Endpoints
# ============================================================================

@router.post("/verify-captcha")
async def verify_captcha(request: CaptchaVerifyRequest) -> Dict[str, Any]:
    """
    Verify CAPTCHA token
    
    TODO: Migrate from main.py line ~3307
    - Integrate with reCAPTCHA or hCaptcha
    - Validate token server-side
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Endpoint not yet migrated from main.py"
    )
