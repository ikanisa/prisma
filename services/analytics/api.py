"""FastAPI routes for analytics operations."""

from fastapi import APIRouter, Depends, HTTPException, status

from .jobs import anomaly_scan_job, policy_check_job

router = APIRouter(prefix="/v1/analytics", tags=["analytics"])

async def admin_guard() -> None:
    """Ensure the caller has admin privileges.

    Replace the implementation with actual authentication logic.
    """
    authorized = True
    if not authorized:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="admin only"
        )

@router.post("/anomaly-scan", dependencies=[Depends(admin_guard)])
async def anomaly_scan() -> dict:
    """Trigger an anomaly scan job immediately."""
    await anomaly_scan_job()
    return {"status": "anomaly scan triggered"}

@router.post("/policy-breach", dependencies=[Depends(admin_guard)])
async def policy_breach() -> dict:
    """Trigger a policy breach check job immediately."""
    await policy_check_job()
    return {"status": "policy check triggered"}
